import { Flag, Sparkles } from 'lucide-react'
import { BATCH_SIZE } from '../lib/constants'

export function ProgressHeader({
  processedCount,
  completedCount,
  flaggedCount,
  phase,
}: {
  processedCount: number
  completedCount: number
  flaggedCount: number
  phase: 'idle' | 'processing' | 'done'
}) {
  const pct = Math.min(100, (processedCount / BATCH_SIZE) * 100)

  return (
    <div className="border-b border-line bg-surface px-6 py-3">
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <p className="text-sm text-ink-soft">
          <span className="font-semibold text-ink">
            {processedCount.toLocaleString('nb-NO')}
          </span>
          <span className="text-muted"> / {BATCH_SIZE.toLocaleString('nb-NO')} processed</span>
        </p>
        <p className="text-[11px] font-medium tracking-wide text-muted uppercase">
          {phase === 'done' ? 'Batch complete' : 'Live intake'}
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-paper-2">
        <div
          className="h-full rounded-full bg-teal transition-[width] duration-200 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-teal-light text-teal-dark">
            <Sparkles className="size-4" />
          </span>
          <div>
            <p className="text-[11px] text-muted">Completed (auto-matched)</p>
            <p className="text-xl font-semibold tracking-tight text-ink">
              {completedCount.toLocaleString('nb-NO')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-amber-light text-amber">
            <Flag className="size-4" />
          </span>
          <div>
            <p className="text-[11px] text-muted">Flagged for review</p>
            <p className="text-xl font-semibold tracking-tight text-ink">
              {flaggedCount.toLocaleString('nb-NO')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
