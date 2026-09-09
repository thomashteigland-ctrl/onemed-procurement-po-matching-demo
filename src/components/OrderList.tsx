import { CircleAlert } from 'lucide-react'
import { ENTITY_LABEL, formatMoney } from '../lib/format'
import { STAGE_LABEL } from '../lib/orders'
import type { Order } from '../types'
import { OrderStageBar } from './OrderStageBar'

export function OrderList({
  orders,
  selectedPo,
  onSelect,
  compact = false,
  maxItems,
  emptyLabel,
}: {
  orders: Order[]
  selectedPo?: string | null
  onSelect?: (poNumber: string) => void
  compact?: boolean
  maxItems?: number
  emptyLabel?: string
}) {
  const visible = maxItems && orders.length > maxItems ? orders.slice(-maxItems) : orders

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-ink">Orders</h3>
        <p className="text-[11px] text-muted">
          {orders.length} {orders.length === 1 ? 'order' : 'orders'}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-line bg-white">
        {visible.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted">
            {emptyLabel ?? 'Orders appear here as soon as a purchase order is extracted.'}
          </p>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 bg-paper">
              <tr className="text-[10px] tracking-wide text-muted uppercase">
                <th className="px-3 py-2 font-medium">PO / supplier</th>
                <th className="px-3 py-2 font-medium">Stage</th>
                <th className="px-3 py-2 font-medium">Order date</th>
                <th className="px-3 py-2 font-medium">Expected delivery</th>
                {!compact && <th className="px-3 py-2 text-right font-medium">Amount</th>}
                <th className="px-3 py-2 font-medium">Issues</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((order) => {
                const selected = selectedPo === order.poNumber
                const issueCount = order.discrepancies.length
                return (
                  <tr
                    key={order.poNumber}
                    onClick={() => onSelect?.(order.poNumber)}
                    className={`border-t border-line/80 ${onSelect ? 'cursor-pointer' : ''} ${
                      selected ? 'bg-teal-light/40' : 'hover:bg-paper/80'
                    } ${compact ? 'text-xs' : 'text-[13px]'} ${
                      issueCount > 0 ? 'border-l-2 border-l-amber' : ''
                    }`}
                  >
                    <td className="px-3 py-2">
                      <p className="font-mono text-xs font-medium text-ink">{order.poNumber}</p>
                      <p className="text-[11px] text-muted">
                        {order.supplier}
                        <span className="text-muted"> · {ENTITY_LABEL[order.entity]}</span>
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      {compact ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            issueCount > 0 ? 'bg-amber-light text-amber' : 'bg-teal-dark text-white'
                          }`}
                        >
                          {STAGE_LABEL[order.stage]}
                        </span>
                      ) : (
                        <OrderStageBar stage={order.stage} documents={order.documents} compact />
                      )}
                    </td>
                    <td className="px-3 py-2 text-ink-soft">{order.orderDate}</td>
                    <td className="px-3 py-2 text-ink-soft">{order.expectedDelivery}</td>
                    {!compact && (
                      <td className="px-3 py-2 text-right font-mono">{formatMoney(order.amount, order.currency)}</td>
                    )}
                    <td className="px-3 py-2">
                      {issueCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber">
                          <CircleAlert className="size-3.5" />
                          {issueCount}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
