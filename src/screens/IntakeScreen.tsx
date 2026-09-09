import { useEffect, useRef, useState, type DragEvent } from 'react'
import { Inbox, Mail, Upload } from 'lucide-react'
import { BATCH_SIZE, SHARED_INBOX } from '../lib/constants'
import { startProcessing } from '../lib/processingEngine'

export function IntakeScreen() {
  const [dragging, setDragging] = useState(false)
  const [emailPhase, setEmailPhase] = useState<'idle' | 'connecting' | 'receiving'>('idle')
  const timers = useRef<number[]>([])

  useEffect(() => {
    const tracked = timers.current
    return () => {
      for (const id of tracked) window.clearTimeout(id)
    }
  }, [])

  function launch(source: 'drop' | 'email', names: string[] = []) {
    void startProcessing(source, names)
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    const names = [...event.dataTransfer.files].map((file) => file.name)
    launch('drop', names)
  }

  function simulateEmail() {
    setEmailPhase('connecting')
    const t1 = window.setTimeout(() => setEmailPhase('receiving'), 700)
    const t2 = window.setTimeout(() => launch('email'), 1800)
    timers.current.push(t1, t2)
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-10">
      <div className="mb-8 max-w-xl text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-teal-dark uppercase">
          Shared inbox · {SHARED_INBOX}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Drop a batch of inbound supplier documents
        </h1>
        <p className="mt-3 text-base text-ink-soft">
          Purchase orders, confirmations, packing lists, delivery notes, invoices and credit notes
          — goods for resale, not production inputs. Peppol invoices pass through; the long tail
          still arrives as PDFs in several languages.
        </p>
      </div>

      <button
        type="button"
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => launch('drop')}
        className={`flex w-full max-w-2xl flex-col items-center justify-center rounded-2xl border-2 border-dashed px-8 py-16 transition ${
          dragging
            ? 'border-teal bg-teal-light/50'
            : 'border-line bg-surface hover:border-teal hover:bg-white'
        }`}
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-teal-light text-teal-dark">
          <Upload className="size-7" />
        </span>
        <p className="mt-4 text-lg font-medium text-ink">
          Drag and drop PDFs or images
        </p>
        <p className="mt-1 text-sm text-muted">
          Click to start the sample batch · drop files if you want real names
        </p>
        <p className="mt-4 rounded-full bg-paper px-3 py-1 text-xs font-medium text-ink-soft">
          Batch size: {BATCH_SIZE.toLocaleString('nb-NO')} documents
        </p>
      </button>

      <div className="mt-8 flex flex-col items-center gap-3">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">
          Or simulate inbound email
        </p>
        <button
          type="button"
          onClick={simulateEmail}
          disabled={emailPhase !== 'idle'}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-80"
        >
          {emailPhase === 'idle' && (
            <>
              <Mail className="size-4" />
              Simulate email intake
            </>
          )}
          {emailPhase === 'connecting' && (
            <>
              <Inbox className="size-4 animate-pulse" />
              Connecting to {SHARED_INBOX}…
            </>
          )}
          {emailPhase === 'receiving' && (
            <>
              <Mail className="size-4 animate-envelope" />
              Receiving attachments…
            </>
          )}
        </button>
      </div>
    </div>
  )
}
