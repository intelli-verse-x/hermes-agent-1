import type { SidebarNavId } from '@/app/types'

import { ARTIFACTS_ROUTE, MESSAGING_ROUTE, SKILLS_ROUTE } from '../routes'

export const TOP_NAV_HEIGHT = 0
export const TITLEBAR_LEFT_NAV_COUNT = 8

export interface AppNavItem {
  id: SidebarNavId
  icon: string
  action?: 'new-session' | 'source-control'
  route?: string
}

export const APP_NAV_WORK: AppNavItem[] = [
  { id: 'new-session', icon: 'robot', action: 'new-session' },
  { id: 'source-control', icon: 'source-control', action: 'source-control' }
]

export const APP_NAV_HERMES: AppNavItem[] = [
  { id: 'skills', icon: 'symbol-misc', route: SKILLS_ROUTE },
  { id: 'messaging', icon: 'comment', route: MESSAGING_ROUTE },
  { id: 'artifacts', icon: 'package', route: ARTIFACTS_ROUTE }
]

export const APP_NAV: AppNavItem[] = [...APP_NAV_WORK, ...APP_NAV_HERMES]
