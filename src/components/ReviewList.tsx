import { Check, ChevronDown, Flag } from 'lucide-react'
import { useState } from 'react'
import { EXTRACT_FIELDS, confidencePct, fieldLabel, fieldValue } from '../lib/format'
import { useDemoStore } from '../store/demoStore'
import type { FieldKey, MappingResult, ProcurementDocument } from '../types'

function ScoreBadge({ result }: { result?: MappingResult }) {
  if (!result) return null
  const high = result.ensemble >= 0.8
  return (
    <span
      className={`flex shrink-0 flex-col items-end rounded-md px-2 py-0.5 ${
        high ? 'bg-teal-light text-teal-dark' : 'bg-amber-light text-amber'
      }`}
    >
      <span className="font-mono text-[11px] font-semibold leading-none">
        {Math.round(result.ensemble * 100)}%
      </span>
      <span className="text-[9px] font-medium leading-tight opacity-80">
        {result.agreeCount}/10 agree
      </span>
    </span>
  )
}

function FlaggedRow({
  doc,
  expanded,
  selected,
  onToggle,
  compact,
  mapping,
}: {
  doc: ProcurementDocument
  expanded: boolean
  selected: boolean
  onToggle: () => void
  compact: boolean
  mapping?: MappingResult
}) {
  const approvedIds = useDemoStore((s) => s.approvedIds)
  const approve = useDemoStore((s) => s.approve)
  const approved = approvedIds.includes(doc.id)

  return (
    <li className={`border-b border-line last:border-b-0 ${selected ? 'bg-teal-light/30' : ''}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-paper/80"
      >
        <Flag className="size-3.5 shrink-0 text-amber" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{doc.fileName}</p>
          <p className="truncate text-[11px] text-muted">
            {doc.supplier} · {doc.poNumber}
            {doc.flagReason ? ` · ${doc.flagReason}` : ''}
          </p>
        </div>
        <ScoreBadge result={mapping} />
        {approved && (
          <span className="rounded-full bg-teal-light px-2 py-0.5 text-[10px] font-semibold text-teal-dark">
            Approved
          </span>
        )}
        {compact && (
          <ChevronDown
            className={`size-4 text-muted transition ${expanded ? 'rotate-180' : ''}`}
          />
        )}
      </button>
      {compact && expanded && (
        <div className="border-t border-line bg-paper/50 p-3">
          <ReviewActions
            doc={doc}
            approved={approved}
            mapping={mapping}
            compact
            onApprove={() => approve(doc.id)}
          />
        </div>
      )}
    </li>
  )
}

function inputValue(doc: ProcurementDocument, field: FieldKey): string {
  if (field === 'amount') return String(doc.amount)
  return fieldValue(doc, field)
}

function ReviewActions({
  doc,
  approved,
  mapping,
  compact,
  onApprove,
}: {
  doc: ProcurementDocument
  approved: boolean
  mapping?: MappingResult
  compact?: boolean
  onApprove: () => void
}) {
  const updateDocumentField = useDemoStore((s) => s.updateDocumentField)

  return (
    <div>
      <ul className="space-y-1">
        {EXTRACT_FIELDS.map((field: FieldKey) => {
          const mapped = doc.fieldConfidence[field]
          const stillUncertain = doc.flaggedFields.includes(field) && mapped < 0.8
          return (
            <li
              key={field}
              className={`grid grid-cols-[7.5rem_1fr_3rem] items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                stillUncertain ? 'bg-amber-light ring-1 ring-amber/30' : 'bg-white'
              }`}
            >
              <label className="text-xs text-muted" htmlFor={`${doc.id}-${field}`}>
                {fieldLabel(field)}
              </label>
              {field === 'docType' ? (
                <select
                  id={`${doc.id}-${field}`}
                  value={doc.docType}
                  onChange={(event) => updateDocumentField(doc.id, field, event.target.value)}
                  className="w-full rounded border border-line bg-white px-2 py-1 text-sm font-medium text-ink outline-none focus:border-teal-dark"
                >
                  <option value="purchase_order">Purchase order</option>
                  <option value="order_confirmation">Order confirmation</option>
                  <option value="packing_list">Packing list / ASN</option>
                  <option value="delivery_note">Delivery note</option>
                  <option value="invoice">Invoice</option>
                  <option value="credit_note">Credit note</option>
                </select>
              ) : (
                <input
                  id={`${doc.id}-${field}`}
                  value={inputValue(doc, field)}
                  onChange={(event) => updateDocumentField(doc.id, field, event.target.value)}
                  className="w-full rounded border border-line bg-white px-2 py-1 font-medium text-ink outline-none focus:border-teal-dark"
                />
              )}
              <span
                className={`text-right font-mono text-[11px] ${
                  stillUncertain ? 'text-amber' : mapped >= 0.8 ? 'text-teal-dark' : 'text-muted'
                }`}
              >
                {confidencePct(mapped)}
              </span>
            </li>
          )
        })}
      </ul>
      {doc.flagReason && <p className="mt-2 text-xs text-amber">{doc.flagReason}</p>}

      {mapping && !compact && (
        <div className="mt-3 rounded-md border border-line bg-white p-3">
          <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">
            Quorum · {mapping.agreeCount}/10 models agree the reviewed value is correct
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
            {mapping.models.map((vote) => (
              <div key={vote.model} className="rounded bg-paper px-2 py-1.5">
                <p className="truncate text-[10px] text-muted">{vote.model}</p>
                <p className="font-mono text-xs font-semibold text-ink">
                  {Math.round(vote.confidence * 100)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={approved}
          onClick={onApprove}
          className="inline-flex items-center gap-1.5 rounded-md bg-teal-dark px-3 py-1.5 text-xs font-semibold text-white disabled:bg-teal-light disabled:text-teal-dark"
        >
          <Check className="size-3.5" />
          {approved ? 'Approved' : 'Approve'}
        </button>
      </div>
    </div>
  )
}

export function ReviewList({
  docs,
  compact = false,
  maxItems,
  selectedId,
  onSelect,
}: {
  docs: ProcurementDocument[]
  compact?: boolean
  maxItems?: number
  selectedId?: string | null
  onSelect?: (id: string) => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const mappingResults = useDemoStore((s) => s.mappingResults)
  const visible = maxItems && docs.length > maxItems ? docs.slice(-maxItems) : docs

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-ink">Review queue</h3>
        <p className="text-[11px] text-muted">
          {docs.length.toLocaleString('nb-NO')} documents
        </p>
      </div>
      <ul className="min-h-0 flex-1 overflow-auto rounded-lg border border-line bg-white">
        {visible.length === 0 ? (
          <li className="px-3 py-8 text-center text-sm text-muted">
            Exceptions will land here when confidence is below threshold.
          </li>
        ) : (
          visible.map((doc) => (
            <FlaggedRow
              key={doc.id}
              doc={doc}
              compact={compact}
              selected={selectedId === doc.id}
              mapping={mappingResults[doc.id]}
              expanded={openId === doc.id}
              onToggle={() => {
                onSelect?.(doc.id)
                setOpenId((id) => (id === doc.id ? null : doc.id))
              }}
            />
          ))
        )}
      </ul>
    </div>
  )
}

export { ReviewActions, ScoreBadge }
