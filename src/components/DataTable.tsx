import { ENTITY_LABEL, channelLabel, docTypeLabel, formatMoney } from '../lib/format'
import type { ProcurementDocument } from '../types'

export function DataTable({
  rows,
  animate = false,
  maxRows = 50,
  compact = false,
}: {
  rows: ProcurementDocument[]
  animate?: boolean
  maxRows?: number
  compact?: boolean
}) {
  const visible = rows.length > maxRows ? rows.slice(rows.length - maxRows) : rows
  const hidden = rows.length - visible.length

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-ink">Extracted documents</h3>
        <p className="text-[11px] text-muted">
          {hidden > 0
            ? `Showing latest ${visible.length} of ${rows.length.toLocaleString('nb-NO')}`
            : `${rows.length.toLocaleString('nb-NO')} records`}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-line bg-white">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 bg-paper">
            <tr className="text-[10px] tracking-wide text-muted uppercase">
              <th className="px-3 py-2 font-medium">Document type</th>
              <th className="px-3 py-2 font-medium">Supplier / entity</th>
              <th className="px-3 py-2 font-medium">PO number</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
              <th className="px-3 py-2 font-medium">Channel</th>
              <th className="px-3 py-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted">
                  Extracted records will appear here as documents complete.
                </td>
              </tr>
            ) : (
              visible.map((row, index) => (
                <tr
                  key={row.id}
                  className={`border-t border-line/80 ${
                    animate && index === visible.length - 1 ? 'animate-row-in' : ''
                  } ${compact ? 'text-xs' : 'text-[13px]'}`}
                >
                  <td className="px-3 py-1.5 text-ink-soft">{docTypeLabel(row.docType)}</td>
                  <td className="px-3 py-1.5">
                    <p className="font-medium text-ink">{row.supplier}</p>
                    <p className="text-[10px] text-muted">{ENTITY_LABEL[row.entity]}</p>
                  </td>
                  <td className="px-3 py-1.5 font-mono text-xs">{row.poNumber}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{formatMoney(row.amount, row.currency)}</td>
                  <td className="px-3 py-1.5 text-[11px] text-ink-soft">{channelLabel(row.channel)}</td>
                  <td className="px-3 py-1.5 text-ink-soft">{row.date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
