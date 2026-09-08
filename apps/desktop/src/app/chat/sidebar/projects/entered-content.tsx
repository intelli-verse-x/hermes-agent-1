import type * as React from 'react'
import { useMemo } from 'react'

import type { HermesGitWorktree } from '@/global'
import type { SessionInfo } from '@/hermes'

import {
  flattenRepoSessions,
  mergeRepoWorktreeGroups,
  overlayRepoLanes,
  type SidebarProjectTree,
  type SidebarWorkspaceTree
} from './workspace-groups'

// Chats belong to the workspace, not a repo lane. Branch / PR / push lives in
// Source Control; Explorer shows the folders.
export function EnteredProjectContent({
  project,
  renderRows,
  repoWorktrees,
  liveSessions,
  removedSessionIds
}: {
  project: SidebarProjectTree
  renderRows: (sessions: SessionInfo[]) => React.ReactNode
  onNewSession?: (path: null | string) => void
  repoWorktrees?: Record<string, HermesGitWorktree[]>
  liveSessions?: SessionInfo[]
  removedSessionIds?: ReadonlySet<string>
}) {
  const sessions = useMemo(() => {
    const byId = new Map<string, SessionInfo>()

    for (const repo of project.repos) {
      for (const session of sessionsForRepo(repo, repo.path ? repoWorktrees?.[repo.path] : undefined, liveSessions, removedSessionIds)) {
        byId.set(session.id, byId.get(session.id) ?? session)
      }
    }

    return [...byId.values()].sort((left, right) => (right.last_active ?? 0) - (left.last_active ?? 0))
  }, [liveSessions, project.repos, removedSessionIds, repoWorktrees])

  if (!sessions.length) {
    return null
  }

  return renderRows(sessions)
}

function sessionsForRepo(
  repo: SidebarWorkspaceTree,
  discoveredWorktrees: HermesGitWorktree[] | undefined,
  liveSessions: SessionInfo[] | undefined,
  removedSessionIds: ReadonlySet<string> | undefined
): SessionInfo[] {
  const mergedGroups = mergeRepoWorktreeGroups(repo, discoveredWorktrees)

  if (!(liveSessions?.length || removedSessionIds?.size)) {
    return flattenRepoSessions(mergedGroups)
  }

  const { groups } = overlayRepoLanes({ ...repo, groups: mergedGroups }, liveSessions ?? [], removedSessionIds)

  return flattenRepoSessions(mergeRepoWorktreeGroups({ id: repo.id, path: repo.path, groups }, discoveredWorktrees))
}
