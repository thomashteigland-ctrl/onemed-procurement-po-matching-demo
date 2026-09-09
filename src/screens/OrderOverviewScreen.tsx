import { useMemo, useState, type ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { DocumentPreview } from '../components/DocumentPreview'
import { OrderList } from '../components/OrderList'
import { OrderStageBar } from '../components/OrderStageBar'
import { ENTITY_LABEL, docTypeLabel, docTypeShort, formatMoney, lineMatchLabel } from '../lib/format'
import { STAGE_FROM_DOC, STAGE_LABEL, buildOrders, stageIndex } from '../lib/orders'
import { useDemoStore } from '../store/demoStore'
import type { DocType, LineMatchStatus, Order, OrderStage } from '../types'

const REQUIRED: DocType[] = [
  'purchase_order',
  'order_confirmation',
  'delivery_note',
  'invoice',
]

const STAGES: OrderStage[] = ['po_created', 'confirmed', 'delivered', 'invoiced']
type IssueFilter = 'all' | 'issues' | 'missing' | 'aligned'

function filterOrders(orders: Order[], stage: OrderStage | 'all', issue: IssueFilter) {
  return orders.filter((order) => {
    if (stage !== 'all' && order.stage !== stage) return false
    const hasIssues = order.discrepancies.length > 0
    const missing = order.discrepancies.some((item) => item.field === 'missing')
    if (issue === 'issues') return hasIssues
    if (issue === 'missing') return missing
    if (issue === 'aligned') return !hasIssues
    return true
  })
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        active ? 'bg-ink text-white' : 'bg-white text-ink-soft ring-1 ring-line hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function statusClass(status: LineMatchStatus): string {
  if (status === 'matched') return 'bg-teal-light text-teal-dark'
  if (status === 'partial' || status === 'substituted' || status === 'price_variance') {
    return 'bg-amber-light text-amber'
  }
  return 'bg-rose/10 text-rose'
}

function OrderDetail({ order }: { order: Order }) {
  const [docId, setDocId] = useState<string | null>(order.documents[0]?.id ?? null)
  const selected = order.documents.find((doc) => doc.id === docId) ?? order.documents[0]
  const byRequired = new Map(
    REQUIRED.map((type) => [type, order.documents.filter((doc) => doc.docType === type)]),
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-semibold text-ink">{order.poNumber}</p>
          <p className="text-sm text-ink-soft">
            {order.supplier}
            <span className="text-muted"> · {ENTITY_LABEL[order.entity]} · goods for resale</span>
          </p>
        </div>
        <OrderStageBar stage={order.stage} documents={order.documents} />
      </div>

      <dl className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-lg bg-paper px-3 py-2">
          <dt className="text-[11px] text-muted">Order date</dt>
          <dd className="font-medium text-ink">{order.orderDate}</dd>
        </div>
        <div className="rounded-lg bg-paper px-3 py-2">
          <dt className="text-[11px] text-muted">Expected delivery</dt>
          <dd className="font-medium text-ink">{order.expectedDelivery}</dd>
        </div>
        <div className="rounded-lg bg-paper px-3 py-2">
          <dt className="text-[11px] text-muted">PO amount</dt>
          <dd className="font-medium text-ink">{formatMoney(order.amount, order.currency)}</dd>
        </div>
        <div className="rounded-lg bg-paper px-3 py-2">
          <dt className="text-[11px] text-muted">Documents</dt>
          <dd className="font-medium text-ink">{order.documents.length}</dd>
        </div>
      </dl>

      <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">
        Line match — ordered / confirmed / delivered / invoiced
      </p>
      <div className="mb-4 overflow-auto rounded-lg border border-line">
        <table className="w-full text-left text-xs">
          <thead className="bg-paper text-[10px] tracking-wide text-muted uppercase">
            <tr>
              <th className="px-3 py-2 font-medium">Article</th>
              <th className="px-3 py-2 text-right font-medium">Ordered</th>
              <th className="px-3 py-2 text-right font-medium">Conf.</th>
              <th className="px-3 py-2 text-right font-medium">Deliv.</th>
              <th className="px-3 py-2 text-right font-medium">Inv.</th>
              <th className="px-3 py-2 text-right font-medium">Open</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {order.lineItems.map((line) => (
              <tr
                key={line.internalArticleId}
                className={`border-t border-line ${line.mismatch ? 'bg-amber-light/50' : ''}`}
              >
                <td className="px-3 py-1.5">
                  <p className="font-medium text-ink">{line.product}</p>
                  <p className="font-mono text-[10px] text-muted">{line.internalArticleId}</p>
                </td>
                <td className="px-3 py-1.5 text-right font-mono">
                  {line.qtyOrdered.toLocaleString('nb-NO')}
                </td>
                <td className="px-3 py-1.5 text-right font-mono">
                  {line.qtyConfirmed ? line.qtyConfirmed.toLocaleString('nb-NO') : '—'}
                </td>
                <td className="px-3 py-1.5 text-right font-mono">
                  {line.qtyDelivered ? line.qtyDelivered.toLocaleString('nb-NO') : '—'}
                </td>
                <td className="px-3 py-1.5 text-right font-mono">
                  {line.qtyInvoiced ? line.qtyInvoiced.toLocaleString('nb-NO') : '—'}
                </td>
                <td className={`px-3 py-1.5 text-right font-mono ${line.qtyOpen > 0 ? 'text-amber' : 'text-ink-soft'}`}>
                  {line.qtyOpen.toLocaleString('nb-NO')}
                </td>
                <td className="px-3 py-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(line.status)}`}>
                    {lineMatchLabel(line.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {order.discrepancies.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber/30 bg-amber-light/70 px-3 py-2">
          <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-amber">
            <CircleAlert className="size-3.5" />
            Needs review
          </p>
          <ul className="space-y-0.5 text-xs text-ink-soft">
            {order.discrepancies.map((issue, index) => (
              <li key={`${issue.field}-${index}`}>
                {issue.docType ? `${docTypeShort(issue.docType)} · ` : ''}
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">
        Documents on this order
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        {REQUIRED.map((type) => {
          const docs = byRequired.get(type) ?? []
          if (docs.length === 0) {
            const skipped = stageIndex(order.stage) > stageIndex(STAGE_FROM_DOC[type])
            return (
              <span
                key={type}
                className={`rounded-md border border-dashed px-2 py-1 text-[11px] ${
                  skipped ? 'border-amber/50 text-amber' : 'border-line text-muted'
                }`}
              >
                {skipped
                  ? `${docTypeLabel(type)} never received`
                  : `${docTypeLabel(type)} not received yet`}
              </span>
            )
          }
          return docs.map((doc, index) => {
            const off = order.discrepancies.some((issue) => issue.docType === type)
            const active = selected?.id === doc.id
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => setDocId(doc.id)}
                className={`rounded-md border px-2 py-1 text-left text-[11px] ${
                  active ? 'border-teal bg-teal-light text-teal-dark' : 'border-line bg-white'
                } ${off ? 'ring-1 ring-amber/50' : ''}`}
              >
                <span className="font-semibold">
                  {docTypeLabel(type)}
                  {docs.length > 1 ? ` ${index + 1}` : ''}
                </span>
                <span className="ml-2 text-muted">{doc.date}</span>
                {doc.channel === 'peppol' && <span className="ml-2 text-teal-dark">Peppol</span>}
                {off && <span className="ml-2 text-amber">off</span>}
              </button>
            )
          })
        })}
        {order.documents
          .filter((doc) => doc.docType === 'packing_list' || doc.docType === 'credit_note')
          .map((doc) => {
            const active = selected?.id === doc.id
            const off = order.discrepancies.some((issue) => issue.docType === doc.docType)
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => setDocId(doc.id)}
                className={`rounded-md border px-2 py-1 text-left text-[11px] ${
                  active ? 'border-teal bg-teal-light text-teal-dark' : 'border-line bg-white'
                } ${off ? 'ring-1 ring-amber/50' : ''}`}
              >
                <span className="font-semibold">{docTypeLabel(doc.docType)}</span>
                <span className="ml-2 text-muted">{doc.date}</span>
              </button>
            )
          })}
      </div>

      {selected && (
        <div className="h-72 max-w-md">
          <DocumentPreview doc={selected} compact />
        </div>
      )}
    </div>
  )
}

export function OrderOverviewScreen() {
  const completed = useDemoStore((s) => s.completed)
  const flagged = useDemoStore((s) => s.flagged)
  const orders = useMemo(() => buildOrders([...completed, ...flagged]), [completed, flagged])
  const [selectedPo, setSelectedPo] = useState<string | null>(null)
  const [stageFilter, setStageFilter] = useState<OrderStage | 'all'>('all')
  const [issueFilter, setIssueFilter] = useState<IssueFilter>('all')
  const filtered = useMemo(
    () => filterOrders(orders, stageFilter, issueFilter),
    [orders, stageFilter, issueFilter],
  )
  const selected =
    filtered.find((order) => order.poNumber === selectedPo) ?? filtered[0] ?? null
  const missingCount = orders.filter((order) =>
    order.discrepancies.some((item) => item.field === 'missing'),
  ).length
  const issueCount = orders.filter((order) => order.discrepancies.length > 0).length

  return (
    <div className="flex h-full min-h-0 flex-col p-5">
      <div className="mb-3">
        <h2 className="text-xl font-semibold tracking-tight text-ink">Order overview</h2>
        <p className="text-sm text-muted">
          Inbound POs for goods for resale. Match is line-level — one PO often has several delivery notes and invoices.
        </p>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">Stage</span>
        <Chip active={stageFilter === 'all'} onClick={() => setStageFilter('all')}>
          All ({orders.length})
        </Chip>
        {STAGES.map((stage) => (
          <Chip
            key={stage}
            active={stageFilter === stage}
            onClick={() => setStageFilter(stage)}
          >
            {STAGE_LABEL[stage]} ({orders.filter((order) => order.stage === stage).length})
          </Chip>
        ))}
        <span className="ml-2 text-[11px] font-semibold tracking-wide text-muted uppercase">Status</span>
        <Chip active={issueFilter === 'all'} onClick={() => setIssueFilter('all')}>
          All
        </Chip>
        <Chip active={issueFilter === 'issues'} onClick={() => setIssueFilter('issues')}>
          Has issues ({issueCount})
        </Chip>
        <Chip active={issueFilter === 'missing'} onClick={() => setIssueFilter('missing')}>
          Missing document ({missingCount})
        </Chip>
        <Chip active={issueFilter === 'aligned'} onClick={() => setIssueFilter('aligned')}>
          Aligned
        </Chip>
      </div>
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <OrderList
          orders={filtered}
          selectedPo={selected?.poNumber ?? null}
          onSelect={setSelectedPo}
          emptyLabel="No orders match these filters."
        />
        <div className="min-h-0 overflow-hidden rounded-xl border border-line bg-white p-4">
          {selected ? (
            <OrderDetail key={selected.poNumber} order={selected} />
          ) : (
            <p className="text-sm text-muted">
              {orders.length === 0
                ? 'Extract a purchase order to open the first order.'
                : 'No orders match these filters.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
