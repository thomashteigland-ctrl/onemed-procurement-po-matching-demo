import { useEffect, useState } from 'react'
import {
  ClipboardList,
  Flag,
  MessageSquareText,
  Network,
  RotateCcw,
  Table2,
  Workflow,
} from 'lucide-react'
import { DEMO_UNLOCK_KEY } from './lib/constants'
import { ArchitectureScreen } from './screens/ArchitectureScreen'
import { LockScreen } from './screens/LockScreen'
import { DatasetScreen } from './screens/DatasetScreen'
import { IntakeScreen } from './screens/IntakeScreen'
import { OrderOverviewScreen } from './screens/OrderOverviewScreen'
import { ProcessingScreen } from './screens/ProcessingScreen'
import { ReviewQueue } from './screens/ReviewQueue'
import { TalkToDataScreen } from './screens/TalkToDataScreen'
import { stopProcessing } from './lib/processingEngine'
import { stopMapping } from './lib/mappingEngine'
import { useDemoStore } from './store/demoStore'
import type { AppScreen } from './types'

const tabs: { id: AppScreen; label: string; icon: typeof Workflow }[] = [
  { id: 'processing', label: 'Processing', icon: Workflow },
  { id: 'review', label: 'Review', icon: Flag },
  { id: 'orders', label: 'Orders', icon: ClipboardList },
  { id: 'dataset', label: 'Documents', icon: Table2 },
  { id: 'talk', label: 'Ask data', icon: MessageSquareText },
]

function Toast() {
  const toast = useDemoStore((s) => s.toast)
  const setToast = useDemoStore((s) => s.setToast)

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(id)
  }, [toast, setToast])

  if (!toast) return null

  return (
    <div className="pointer-events-none fixed right-5 bottom-5 z-50 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-lg">
      {toast}
    </div>
  )
}

function Header() {
  const screen = useDemoStore((s) => s.screen)
  const setScreen = useDemoStore((s) => s.setScreen)
  const reset = useDemoStore((s) => s.reset)
  const flagged = useDemoStore((s) => s.flagged)
  const phase = useDemoStore((s) => s.phase)
  const started = phase !== 'idle'
  const flaggedCount = flagged.length

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-4">
      <div className="flex items-center gap-2.5">
        <img src="/onemed-logo.png" alt="OneMed" className="h-7 w-auto" />
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-ink">Inbound matching</p>
          <p className="text-[11px] text-muted">Medical devices · goods for resale</p>
        </div>
      </div>

      <nav className="flex items-center gap-1 rounded-full bg-paper p-1">
        <button
          type="button"
          onClick={() => setScreen('architecture')}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            screen === 'architecture' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          <Network className="size-3.5" />
          Architecture
        </button>
        {started &&
          tabs.map((tab) => {
            const Icon = tab.icon
            const active = screen === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setScreen(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                <Icon className="size-3.5" />
                {tab.label}
                {tab.id === 'review' && flaggedCount > 0 && (
                  <span className="rounded-full bg-amber-light px-1.5 text-[10px] text-amber">
                    {flaggedCount}
                  </span>
                )}
              </button>
            )
          })}
      </nav>

      <button
        type="button"
        onClick={() => {
          stopProcessing()
          stopMapping()
          reset()
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-paper"
      >
        <RotateCcw className="size-3.5" />
        Reset demo
      </button>
    </header>
  )
}

function readUnlocked() {
  try {
    return sessionStorage.getItem(DEMO_UNLOCK_KEY) === '1'
  } catch {
    return false
  }
}

export default function App() {
  const screen = useDemoStore((s) => s.screen)
  const [unlocked, setUnlocked] = useState(readUnlocked)

  if (!unlocked) {
    return (
      <LockScreen
        onUnlock={() => {
          try {
            sessionStorage.setItem(DEMO_UNLOCK_KEY, '1')
          } catch {
            /* ignore quota / private-mode failures */
          }
          setUnlocked(true)
        }}
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-paper">
      <Header />
      <main className="min-h-0 flex-1 overflow-hidden">
        {screen === 'intake' && <IntakeScreen />}
        {screen === 'architecture' && <ArchitectureScreen />}
        {screen === 'processing' && <ProcessingScreen />}
        {screen === 'orders' && <OrderOverviewScreen />}
        {screen === 'dataset' && <DatasetScreen />}
        {screen === 'review' && <ReviewQueue />}
        {screen === 'talk' && <TalkToDataScreen />}
      </main>
      <Toast />
    </div>
  )
}
