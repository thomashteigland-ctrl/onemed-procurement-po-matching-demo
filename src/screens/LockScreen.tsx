import { useState, type FormEvent } from 'react'
import { Lock } from 'lucide-react'
import { DEMO_PASSWORD } from '../lib/constants'

interface LockScreenProps {
  onUnlock: () => void
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (password === DEMO_PASSWORD) {
      onUnlock()
      return
    }
    setError(true)
  }

  return (
    <div className="flex h-full flex-col bg-paper">
      <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-line bg-surface px-4">
        <img src="/onemed-logo.png" alt="OneMed" className="h-7 w-auto" />
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-ink">Inbound matching</p>
          <p className="text-[11px] text-muted">Medical devices · goods for resale</p>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 items-center justify-center px-6 py-10">
        <form
          onSubmit={submit}
          className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 shadow-[0_1px_2px_rgba(8,30,50,0.04)]"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-teal-light text-ink">
            <Lock className="size-5" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Protected demo</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Enter the password to open the OneMed inbound matching walkthrough.
          </p>

          <label className="mt-6 block text-xs font-semibold tracking-wide text-muted uppercase">
            Password
            <input
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                if (error) setError(false)
              }}
              className={`mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-ink outline-none transition ${
                error
                  ? 'border-rose ring-1 ring-rose/30'
                  : 'border-line focus:border-ink focus:ring-1 focus:ring-ink/20'
              }`}
            />
          </label>
          {error && <p className="mt-2 text-sm text-rose">That password is not correct.</p>}

          <button
            type="submit"
            className="mt-6 w-full rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-dark"
          >
            Unlock demo
          </button>
        </form>
      </main>
    </div>
  )
}
