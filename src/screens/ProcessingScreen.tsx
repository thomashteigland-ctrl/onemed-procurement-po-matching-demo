import { useMemo } from 'react'
import { DocumentPreview } from '../components/DocumentPreview'
import { ExtractionPanel } from '../components/ExtractionPanel'
import { OrderList } from '../components/OrderList'
import { ProgressHeader } from '../components/ProgressHeader'
import { ReviewList } from '../components/ReviewList'
import { buildOrders } from '../lib/orders'
import { useDemoStore } from '../store/demoStore'

export function ProcessingScreen() {
  const phase = useDemoStore((s) => s.phase)
  const processedCount = useDemoStore((s) => s.processedCount)
  const completed = useDemoStore((s) => s.completed)
  const flagged = useDemoStore((s) => s.flagged)
  const currentDoc = useDemoStore((s) => s.currentDoc)
  const visibleFields = useDemoStore((s) => s.visibleFields)
  const jsonVisible = useDemoStore((s) => s.jsonVisible)
  const extractionStatus = useDemoStore((s) => s.extractionStatus)
  const orders = useMemo(() => buildOrders([...completed, ...flagged]), [completed, flagged])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ProgressHeader
        processedCount={processedCount}
        completedCount={completed.length}
        flaggedCount={flagged.length}
        phase={phase}
      />
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1.15fr)_minmax(0,0.95fr)] gap-4 overflow-hidden p-4">
        <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="min-h-0">
            {currentDoc ? (
              <DocumentPreview doc={currentDoc} />
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-line bg-surface text-sm text-muted">
                {phase === 'done' ? 'Batch complete' : 'Starting…'}
              </div>
            )}
          </div>
          <ExtractionPanel
            doc={currentDoc}
            visibleFields={visibleFields}
            jsonVisible={jsonVisible}
            status={extractionStatus}
          />
        </div>
        <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <OrderList orders={orders} compact maxItems={8} />
          <ReviewList docs={flagged} compact maxItems={8} />
        </div>
      </div>
    </div>
  )
}
