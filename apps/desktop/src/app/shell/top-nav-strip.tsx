import { useStore } from '@nanostores/react'
import { useLocation } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Codicon } from '@/components/ui/codicon'
import { Tip } from '@/components/ui/tooltip'
import { useI18n } from '@/i18n'
import type { SidebarNavItem } from '@/app/types'
import {
  $fileBrowserOpen,
  $sidebarOpen,
  setSidebarOpen,
  toggleFileBrowserOpen,
  togglePanesFlipped,
  toggleSidebarOpen
} from '@/store/layout'
import { $reviewOpen } from '@/store/review'

import { appViewForPath } from '../routes'

import { APP_NAV_HERMES, APP_NAV_WORK, type AppNavItem } from './app-nav'
import { titlebarButtonClass } from './titlebar'

export function TopNavStrip({ onNavigate }: { onNavigate: (item: SidebarNavItem) => void }) {
  const { t } = useI18n()
  const s = t.sidebar
  const titlebar = t.titlebar
  const location = useLocation()
  const currentView = appViewForPath(location.pathname)
  const sidebarOpen = useStore($sidebarOpen)
  const fileBrowserOpen = useStore($fileBrowserOpen)
  const reviewOpen = useStore($reviewOpen)

  const navigateItem = (item: AppNavItem) => {
    setSidebarOpen(false)
    onNavigate(toSidebarNavItem(item))
  }

  return (
    <nav aria-label={s.sessions} className="flex h-full items-stretch">
      <TitlebarNavButton
        active={sidebarOpen}
        icon="layout-sidebar-left"
        label={s.sessions}
        onClick={() => toggleSidebarOpen()}
      />
      <TitlebarNavButton
        active={fileBrowserOpen}
        icon="files"
        label={s.nav.files}
        onClick={() => toggleFileBrowserOpen()}
      />
      <TitlebarNavButton icon="arrow-swap" label={titlebar.swapSidebarSides} onClick={() => togglePanesFlipped()} />

      <span aria-hidden className="mx-0.5 h-3.5 w-px shrink-0 self-center bg-(--ui-stroke-tertiary)" />

      {APP_NAV_WORK.map(item => (
        <TitlebarNavButton
          active={item.id === 'source-control' && reviewOpen}
          icon={item.icon}
          key={item.id}
          label={s.nav[item.id]}
          onClick={() => navigateItem(item)}
        />
      ))}

      <span aria-hidden className="mx-0.5 h-3.5 w-px shrink-0 self-center bg-(--ui-stroke-tertiary)" />

      {APP_NAV_HERMES.map(item => (
        <TitlebarNavButton
          active={
            (item.id === 'skills' && currentView === 'skills') ||
            (item.id === 'messaging' && currentView === 'messaging') ||
            (item.id === 'artifacts' && currentView === 'artifacts')
          }
          icon={item.icon}
          key={item.id}
          label={s.nav[item.id]}
          onClick={() => navigateItem(item)}
        />
      ))}
    </nav>
  )
}

function TitlebarNavButton({
  active,
  icon,
  label,
  onClick
}: {
  active?: boolean
  icon: string
  label: string
  onClick: () => void
}) {
  return (
    <Tip delayDuration={350} label={label} side="bottom">
      <Button
        aria-current={active ? 'page' : undefined}
        aria-label={label}
        aria-pressed={active}
        className={titlebarButtonClass}
        onClick={onClick}
        onPointerDown={event => event.stopPropagation()}
        size="icon-titlebar"
        type="button"
        variant="ghost"
      >
        <Codicon name={icon} />
      </Button>
    </Tip>
  )
}

function toSidebarNavItem(item: AppNavItem): SidebarNavItem {
  return {
    id: item.id,
    label: '',
    icon: () => null,
    ...(item.action ? { action: item.action } : {}),
    ...(item.route ? { route: item.route } : {})
  }
}
