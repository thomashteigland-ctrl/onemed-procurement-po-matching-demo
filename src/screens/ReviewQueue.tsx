import { useState } from 'react'
import { ArrowRight, CheckCheck, LoaderCircle, ScanSearch } from 'lucide-react'
import { DocumentPreview } from '../components/DocumentPreview'
import { ReviewActions, ReviewList } from '../components/ReviewList'
import { MAPPING_APPROVE_THRESHOLD } from '../lib/constants'
import { runConfidenceMapping } from '../lib/mappingEngine'
import { useDemoStore } from '../store/demoStore'

export function ReviewQueue() {
  const flagged = useDemoStore((s) => s.flagged)
  const mappingStatus = useDemoStore((s) => s.mappingStatus)
  const mappingStep = useDemoStore((s) => s.mappingStep)
  const mappingResults = useDemoStore((s) => s.mappingResults)
  const approve = useDemoStore((s) => s.approve)
  const approveAboveMapping = useDemoStore((s) => s.approveAboveMapping)
  const approvedIds = useDemoStore((s) => s.approvedIds)
  const setScreen = useDemoStore((s) => s.setScreen)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected =
    flagged.find((doc) => doc.id === selectedId) ?? flagged[0] ?? null
  const mapping = selected ? mappingResults[selected.id] : undefined
  const aboveCount = flagged.filter((doc) => {
    const result = mappingResults[doc.id]
    return result && result.ensemble >= MAPPING_APPROVE_THRESHOLD
  }).length

  return (
    <div className="flex h-full min-h-0 flex-col p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-ink">Review queue</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={mappingStatus === 'running' || flagged.length === 0}
            onClick={() => void runConfidenceMapping()}
            className="inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-xs font-semibold text-white hover:bg-teal-dark disabled:opacity-60"
          >
            {mappingStatus === 'running' ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <ScanSearch className="size-3.5" />
            )}
            {mappingStatus === 'running'
              ? mappingStep
              : mappingStatus === 'done'
                ? 'Re-run mapping'
                : 'Run confidence-based mapping'}
          </button>
          <button
            type="button"
            disabled={mappingStatus !== 'done' || aboveCount === 0}
            onClick={() => approveAboveMapping(MAPPING_APPROVE_THRESHOLD)}
            className="inline-flex items-center gap-2 rounded-md bg-teal-dark px-3 py-2 text-xs font-semibold text-white disabled:bg-paper-2 disabled:text-muted"
          >
            <CheckCheck className="size-3.5" />
            Approve all ≥ {Math.round(MAPPING_APPROVE_THRESHOLD * 100)}%
            {mappingStatus === 'done' ? ` (${aboveCount})` : ''}
          </button>
          <button
            type="button"
            onClick={() => setScreen('orders')}
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-xs font-semibold text-ink"
          >
            Check orders
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(16rem,0.75fr)_minmax(0,1.15fr)_minmax(18rem,0.9fr)]">
        <ReviewList
          docs={flagged}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
        />
        <div className="min-h-0">
          {selected ? (
            <DocumentPreview doc={selected} />
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg bg-[#525659] text-sm text-white/60">
              No document selected
            </div>
          )}
        </div>
        <div className="min-h-0 overflow-auto rounded-xl border border-line bg-white p-4">
          {selected ? (
            <ReviewActions
              doc={selected}
              approved={approvedIds.includes(selected.id)}
              mapping={mapping}
              onApprove={() => approve(selected.id)}
            />
          ) : (
            <p className="text-sm text-muted">No documents left in the review queue.</p>
          )}
        </div>
      </div>
    </div>
  )
}
