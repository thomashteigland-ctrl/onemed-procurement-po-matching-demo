import { Check, Flag, LoaderCircle } from 'lucide-react'
import { CONFIDENCE_THRESHOLD } from '../lib/constants'
import {
  EXTRACT_FIELDS,
  confidencePct,
  fieldLabel,
  fieldValue,
  toExtractionJson,
} from '../lib/format'
import type { ExtractionStatus, FieldKey, ProcurementDocument } from '../types'

export function ExtractionPanel({
  doc,
  visibleFields,
  jsonVisible,
  status,
}: {
  doc: ProcurementDocument | null
  visibleFields: FieldKey[]
  jsonVisible: boolean
  status: ExtractionStatus | null
}) {
  if (!doc) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-line bg-surface text-sm text-muted">
        Waiting for next document…
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            Currently extracting
          </p>
          <p className="truncate font-mono text-xs text-ink-soft">{doc.fileName}</p>
        </div>
        <span className="rounded-full bg-paper-2 px-2 py-0.5 text-[10px] font-medium text-ink-soft">
          Auto-complete ≥ {Math.round(CONFIDENCE_THRESHOLD * 100)}%
        </span>
      </div>

      <ul className="space-y-1.5">
        {EXTRACT_FIELDS.map((field) => {
          const visible = visibleFields.includes(field)
          const low = doc.flaggedFields.includes(field)
          return (
            <li
              key={field}
              className={`grid grid-cols-[8.5rem_1fr_3rem] items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                visible ? 'animate-field-in bg-white' : 'opacity-30'
              } ${visible && low ? 'ring-1 ring-amber/40 bg-amber-light/60' : ''}`}
            >
              <span className="text-xs text-muted">{fieldLabel(field)}</span>
              <span className="truncate font-medium text-ink">
                {visible ? fieldValue(doc, field) : '—'}
              </span>
              <span
                className={`text-right font-mono text-[11px] ${
                  visible && low ? 'text-amber' : 'text-muted'
                }`}
              >
                {visible ? confidencePct(doc.fieldConfidence[field]) : ''}
              </span>
            </li>
          )
        })}
      </ul>

      <pre
        className={`mt-3 min-h-0 flex-1 overflow-auto rounded-md bg-ink p-3 font-mono text-[10px] leading-relaxed text-teal ${
          jsonVisible ? 'animate-field-in' : 'opacity-20'
        }`}
      >
        {jsonVisible ? toExtractionJson(doc) : '{\n  …\n}'}
      </pre>

      <div className="mt-3 flex h-9 items-center gap-2 text-sm font-medium">
        {status === 'extracting' && (
          <>
            <LoaderCircle className="size-4 animate-spin text-teal-dark" />
            <span className="text-ink-soft">Reading document…</span>
          </>
        )}
        {status === 'completed' && (
          <>
            <span className="flex size-6 items-center justify-center rounded-full bg-teal-light text-teal-dark">
              <Check className="size-3.5" strokeWidth={2.75} />
            </span>
            <span className="text-teal-dark">Auto-completed</span>
            <span className="font-mono text-xs text-muted">
              {confidencePct(doc.overallConfidence)}
            </span>
          </>
        )}
        {status === 'flagged' && (
          <>
            <span className="flex size-6 items-center justify-center rounded-full bg-amber-light text-amber">
              <Flag className="size-3.5" strokeWidth={2.5} />
            </span>
            <span className="text-amber">Flagged for review</span>
            <span className="font-mono text-xs text-muted">
              {confidencePct(doc.overallConfidence)}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
