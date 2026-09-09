import { STAGE_FROM_DOC, STAGE_LABEL, stageIndex } from '../lib/orders'
import type { OrderStage, ProcurementDocument } from '../types'

const STEPS: OrderStage[] = ['po_created', 'confirmed', 'delivered', 'invoiced']

export function OrderStageBar({
  stage,
  documents = [],
  compact = false,
}: {
  stage: OrderStage
  documents?: Pick<ProcurementDocument, 'docType'>[]
  compact?: boolean
}) {
  const current = stageIndex(stage)
  const present = new Set(documents.map((doc) => STAGE_FROM_DOC[doc.docType]))

  return (
    <div className={`flex items-center ${compact ? 'gap-1' : 'gap-1.5'}`}>
      {STEPS.map((step, index) => {
        const hasDoc = present.has(step)
        const skipped = !hasDoc && index < current
        return (
          <div key={step} className="flex items-center gap-1">
            {index > 0 && (
              <span
                className={`block h-px ${compact ? 'w-3' : 'w-5'} ${
                  skipped ? 'bg-amber' : hasDoc ? 'bg-teal-dark' : 'bg-line/50'
                }`}
              />
            )}
            <span
              className={`rounded-full ${compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'} font-semibold ${
                skipped
                  ? 'bg-amber-light text-amber'
                  : hasDoc
                    ? 'bg-teal-dark text-white'
                    : 'bg-paper-2/80 text-muted/35'
              }`}
            >
              {compact && step === 'po_created' ? 'PO' : STAGE_LABEL[step]}
            </span>
          </div>
        )
      })}
    </div>
  )
}
