import { useStore } from '@nanostores/react'
import type { ComponentProps, ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Codicon } from '@/components/ui/codicon'
import { Tip } from '@/components/ui/tooltip'
import { useI18n } from '@/i18n'
import { triggerHaptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'
import { $hapticsMuted, toggleHapticsMuted } from '@/store/haptics'
import { toggleKeybindPanel } from '@/store/keybinds'

import { appViewForPath, isOverlayView } from '../routes'

import { titlebarButtonClass } from './titlebar'

export interface TitlebarTool {
  id: string
  label: string
  active?: boolean
  className?: string
  disabled?: boolean
  hidden?: boolean
  href?: string
  icon: ReactNode
  onSelect?: () => void
  title?: string
  to?: string
}

export type TitlebarToolSide = 'left' | 'right'
export type SetTitlebarToolGroup = (id: string, tools: readonly TitlebarTool[], side?: TitlebarToolSide) => void

interface TitlebarControlsProps extends ComponentProps<'div'> {
  leftNav?: ReactNode
  leftTools?: readonly TitlebarTool[]
  tools?: readonly TitlebarTool[]
  onOpenSettings: () => void
}

export function TitlebarControls({ leftNav, leftTools = [], tools = [], onOpenSettings }: TitlebarControlsProps) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const hapticsMuted = useStore($hapticsMuted)
  const toggleHaptics = () => {
    if (!hapticsMuted) {
      triggerHaptic('tap')
    }

    toggleHapticsMuted()

    if (hapticsMuted) {
      window.requestAnimationFrame(() => triggerHaptic('success'))
    }
  }

  const leftToolbarTools = leftTools

  // Static system tools — always pinned to the screen's right edge.
  const systemTools: TitlebarTool[] = [
    {
      active: hapticsMuted,
      icon: <Codicon name={hapticsMuted ? 'mute' : 'unmute'} />,
      id: 'haptics',
      label: hapticsMuted ? t.titlebar.unmuteHaptics : t.titlebar.muteHaptics,
      onSelect: toggleHaptics
    },
    {
      icon: <Codicon name="keyboard" />,
      id: 'keybinds',
      label: t.titlebar.openKeybinds,
      onSelect: () => {
        triggerHaptic('open')
        toggleKeybindPanel()
      }
    },
    {
      icon: <Codicon name="settings-gear" />,
      id: 'settings',
      label: t.titlebar.openSettings,
      onSelect: () => {
        triggerHaptic('open')
        onOpenSettings()
      }
    }
  ]

  // While a full-screen overlay (settings, command center, …) is open it should
  // visually own the window. These control clusters are `fixed` at a higher
  // z-index than the overlay card, so they'd otherwise bleed over it — hide them
  // and let the overlay's own chrome (close button, drag region) take over.
  if (isOverlayView(appViewForPath(location.pathname))) {
    return null
  }

  const visibleSystemTools = systemTools.filter(tool => !tool.hidden)
  const settingsTool = visibleSystemTools.find(tool => tool.id === 'settings')
  const visibleSystemToolsBeforeSettings = visibleSystemTools.filter(tool => tool.id !== 'settings')
  const visiblePaneTools = tools.filter(tool => !tool.hidden)

  return (
    <>
      {(leftNav || leftToolbarTools.filter(tool => !tool.hidden).length > 0) && (
        <div
          aria-label={t.shell.windowControls}
          className="pointer-events-auto fixed top-0 left-(--titlebar-controls-left) z-70 flex h-(--titlebar-height) flex-row items-stretch select-none [-webkit-app-region:no-drag]"
        >
          {leftNav}
          {leftToolbarTools
            .filter(tool => !tool.hidden)
            .map(tool => (
              <TitlebarToolButton key={tool.id} navigate={navigate} tool={tool} />
            ))}
        </div>
      )}

      {/*
        Pane-scoped tools (preview's monitor / devtools / refresh / X) render
        as their own fixed cluster. AppShell sets --shell-preview-toolbar-gap
        to either the static cluster's width (file-browser closed → cluster
        sits flush against system tools) or the file-browser pane's width
        (file-browser open → cluster sits flush against the file-browser pane,
        i.e. at the preview pane's right edge). No margin hacks needed.
      */}
      {visiblePaneTools.length > 0 && (
        <div
          aria-label={t.shell.paneControls}
          className="pointer-events-auto fixed top-[var(--right-rail-top-inset,0px)] right-[calc(var(--titlebar-tools-right)+var(--shell-preview-toolbar-gap,0))] z-70 flex h-(--titlebar-height) flex-row items-stretch select-none [-webkit-app-region:no-drag]"
        >
          {visiblePaneTools.map(tool => (
            <TitlebarToolButton key={tool.id} navigate={navigate} tool={tool} />
          ))}
        </div>
      )}

      <div
        aria-label={t.shell.appControls}
        className="pointer-events-auto fixed top-0 right-(--titlebar-tools-right) z-70 flex h-(--titlebar-height) flex-row items-stretch justify-end select-none [-webkit-app-region:no-drag]"
      >
        {visibleSystemToolsBeforeSettings.map(tool => (
          <TitlebarToolButton key={tool.id} navigate={navigate} tool={tool} />
        ))}
        {settingsTool && <TitlebarToolButton navigate={navigate} tool={settingsTool} />}
      </div>
    </>
  )
}

function TitlebarToolButton({ navigate, tool }: { navigate: ReturnType<typeof useNavigate>; tool: TitlebarTool }) {
  // Titlebar actions never show an active background — state reads from the
  // icon itself (e.g. the mute/unmute glyph). aria-pressed still carries it
  // for a11y.
  const className = cn(titlebarButtonClass, 'bg-transparent select-none', tool.className)

  if (tool.href) {
    return (
      <Tip label={tool.title ?? tool.label}>
        <Button asChild className={className} size="icon-titlebar" variant="ghost">
          <a
            aria-label={tool.label}
            href={tool.href}
            onPointerDown={event => event.stopPropagation()}
            rel="noreferrer"
            target="_blank"
          >
            {tool.icon}
          </a>
        </Button>
      </Tip>
    )
  }

  return (
    <Tip label={tool.title ?? tool.label}>
      <Button
        aria-label={tool.label}
        aria-pressed={tool.active ?? undefined}
        className={className}
        disabled={tool.disabled}
        onClick={() => {
          if (tool.to) {
            navigate(tool.to)
          }

          tool.onSelect?.()
        }}
        onPointerDown={event => event.stopPropagation()}
        size="icon-titlebar"
        type="button"
        variant="ghost"
      >
        {tool.icon}
      </Button>
    </Tip>
  )
}
