import { DEMO_TODAY } from './constants'
import { DOC_TYPE_INDEX } from '../data/documents'
import { docTypeLabel, formatMoney } from './format'
import type {
  DocType,
  LineItem,
  LineMatchStatus,
  Order,
  OrderDiscrepancy,
  OrderLineSuperset,
  OrderStage,
  ProcurementDocument,
} from '../types'

const STAGE_SEQUENCE: DocType[] = [
  'purchase_order',
  'order_confirmation',
  'delivery_note',
  'invoice',
]

export const STAGE_LABEL: Record<OrderStage, string> = {
  po_created: 'PO created',
  confirmed: 'Confirmed',
  delivered: 'Delivered',
  invoiced: 'Invoiced',
}

export const STAGE_FROM_DOC: Record<DocType, OrderStage> = {
  purchase_order: 'po_created',
  order_confirmation: 'confirmed',
  packing_list: 'confirmed',
  delivery_note: 'delivered',
  invoice: 'invoiced',
  credit_note: 'invoiced',
}

function baseDocId(id: string): string {
  return id.replace(/-c\d+$/, '')
}

function sortDocs(docs: ProcurementDocument[]): ProcurementDocument[] {
  const ranked = [...docs].sort((a, b) => {
    const ac = a.id.includes('-c') ? 1 : 0
    const bc = b.id.includes('-c') ? 1 : 0
    if (ac !== bc) return ac - bc
    return 0
  })
  const map = new Map<string, ProcurementDocument>()
  for (const doc of ranked) {
    const key = baseDocId(doc.id)
    if (!map.has(key)) map.set(key, doc)
  }
  return [...map.values()].sort((a, b) => {
    const typeDelta = DOC_TYPE_INDEX[a.docType] - DOC_TYPE_INDEX[b.docType]
    if (typeDelta !== 0) return typeDelta
    return dateKey(a.date).localeCompare(dateKey(b.date)) || a.id.localeCompare(b.id)
  })
}

function deriveStage(documents: ProcurementDocument[]): OrderStage {
  let stage: OrderStage = 'po_created'
  for (const doc of documents) {
    const next = STAGE_FROM_DOC[doc.docType]
    if (stageIndex(next) > stageIndex(stage)) stage = next
  }
  return stage
}

export function stageIndex(stage: OrderStage): number {
  return ['po_created', 'confirmed', 'delivered', 'invoiced'].indexOf(stage)
}

export function baseQty(item: LineItem): number {
  return item.quantity * (item.uomConversionFactor || 1)
}

export function basePrice(item: LineItem): number {
  const factor = item.uomConversionFactor || 1
  return factor === 0 ? item.unitPrice : item.unitPrice / factor
}

function lineKey(item: LineItem): string {
  return item.substitutedFor ?? item.internalArticleId
}

function lineSuperset(documents: ProcurementDocument[]): OrderLineSuperset[] {
  const po = documents.find((doc) => doc.docType === 'purchase_order')
  const ids: string[] = []
  const labels = new Map<string, { product: string; uom: string }>()

  const remember = (item: LineItem) => {
    const key = lineKey(item)
    if (!ids.includes(key)) ids.push(key)
    if (!labels.has(key)) {
      const poLine = po?.lineItems.find((row) => row.internalArticleId === key)
      labels.set(key, {
        product: poLine?.description ?? item.description,
        uom: poLine?.unitOfMeasure ?? 'pcs',
      })
    }
  }

  for (const doc of documents) {
    for (const item of doc.lineItems) remember(item)
  }

  return ids.map((id) => {
    const byType: OrderLineSuperset['byType'] = {}
    let qtyOrdered = 0
    let qtyConfirmed = 0
    let qtyDelivered = 0
    let qtyInvoiced = 0
    let substituted = false
    let uomMismatch = false
    let priceVariance = false
    const poUom = labels.get(id)?.uom ?? 'pcs'

    for (const doc of documents) {
      const rows = doc.lineItems.filter((row) => lineKey(row) === id)
      if (rows.length === 0) continue
      const qty = rows.reduce((sum, row) => sum + baseQty(row), 0)
      const price = basePrice(rows[0])
      const uom = rows[0].unitOfMeasure
      byType[doc.docType] = { quantity: qty, unitPrice: price, uom }
      if (doc.docType === 'purchase_order') qtyOrdered += qty
      if (doc.docType === 'order_confirmation') qtyConfirmed += qty
      if (doc.docType === 'delivery_note' || doc.docType === 'packing_list') {
        if (doc.docType === 'delivery_note') qtyDelivered += qty
      }
      if (doc.docType === 'invoice') qtyInvoiced += qty
      if (doc.docType === 'credit_note') qtyInvoiced -= Math.abs(qty)
      if (rows.some((row) => row.substitutedFor)) substituted = true
      if (uom !== poUom) uomMismatch = true
      if (doc.docType === 'invoice' && qtyOrdered > 0) {
        const poItem = po?.lineItems.find((row) => row.internalArticleId === id)
        if (poItem && Math.abs(price - basePrice(poItem)) > 0.005) priceVariance = true
      }
    }

    const qtyOpen = Math.max(0, qtyOrdered - qtyDelivered)
    let status: LineMatchStatus = 'matched'
    if (substituted) status = 'substituted'
    else if (priceVariance) status = 'price_variance'
    else if (qtyDelivered > qtyOrdered + 0.01) status = 'over_delivered'
    else if (uomMismatch) status = 'unmatched'
    else if (qtyOrdered > 0 && qtyOpen > 0 && qtyDelivered > 0) status = 'partial'
    else if (qtyOrdered > 0 && qtyDelivered === 0 && qtyInvoiced === 0) status = 'unmatched'
    else if (qtyOrdered > 0 && qtyOpen > 0) status = 'partial'

    return {
      internalArticleId: id,
      product: labels.get(id)?.product ?? id,
      unitOfMeasure: poUom,
      qtyOrdered,
      qtyConfirmed,
      qtyDelivered,
      qtyInvoiced,
      qtyOpen,
      status,
      byType,
      mismatch: status !== 'matched',
    }
  })
}

function discrepancies(documents: ProcurementDocument[], lines: OrderLineSuperset[]): OrderDiscrepancy[] {
  const issues: OrderDiscrepancy[] = []
  const po = documents.find((doc) => doc.docType === 'purchase_order')
  const present = new Set(documents.map((doc) => doc.docType))
  const furthest = deriveStage(documents)
  const furthestIdx = stageIndex(furthest)
  const hasPo = present.has('purchase_order')

  if (hasPo) {
    for (let i = 1; i < furthestIdx; i += 1) {
      const type = STAGE_SEQUENCE[i]
      if (!present.has(type)) {
        issues.push({
          field: 'missing',
          docType: type,
          message:
            furthestIdx > i
              ? `${docTypeLabel(type)} never received`
              : `${docTypeLabel(type)} not received yet`,
        })
      }
    }
  }

  for (const doc of documents) {
    if (po && doc.docType !== 'purchase_order' && doc.docType !== 'credit_note' && doc.amount !== po.amount) {
      const pct = po.amount === 0 ? 0 : ((doc.amount - po.amount) / po.amount) * 100
      const signed = `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`
      issues.push({
        field: 'amount',
        docType: doc.docType,
        message: `${docTypeLabel(doc.docType)} amount ${formatMoney(doc.amount, doc.currency)} vs PO ${formatMoney(po.amount, po.currency)} (${signed})`,
      })
    }
    if (doc.flagged) {
      issues.push({
        field: 'confidence',
        docType: doc.docType,
        lineId: doc.flagLineId,
        message: doc.flagReason ?? `${docTypeLabel(doc.docType)} flagged for review`,
      })
    }
    if (doc.docType === 'credit_note') {
      issues.push({
        field: 'credit',
        docType: 'credit_note',
        lineId: doc.flagLineId,
        message: doc.linkedInvoiceId
          ? `Credit note linked to ${doc.linkedInvoiceId}`
          : 'Credit note is not linked to an invoice',
      })
    }
  }

  for (const line of lines) {
    if (!line.mismatch) continue
    const detail =
      line.status === 'substituted'
        ? `Substitution on “${line.product}”`
        : line.status === 'price_variance'
          ? `Price variance on “${line.product}”`
          : line.status === 'partial'
            ? `Partial: ${line.qtyOpen.toLocaleString('nb-NO')} ${line.unitOfMeasure} still open on “${line.product}”`
            : line.status === 'over_delivered'
              ? `Over-delivered “${line.product}”`
              : `Line “${line.product}” is ${line.status.replace('_', ' ')}`
    issues.push({
      field: 'lineItem',
      lineId: line.internalArticleId,
      message: detail,
    })
  }

  return issues
}

export function buildOrders(docs: ProcurementDocument[]): Order[] {
  const byPo = new Map<string, ProcurementDocument[]>()
  for (const doc of docs) {
    const list = byPo.get(doc.poNumber) ?? []
    list.push(doc)
    byPo.set(doc.poNumber, list)
  }

  return [...byPo.entries()]
    .map(([poNumber, all]) => {
      const documents = sortDocs(all)
      const po = documents.find((doc) => doc.docType === 'purchase_order')
      const first = po ?? documents[0]
      const lineItems = lineSuperset(documents)
      return {
        poNumber,
        supplier: first.supplier,
        entity: first.entity,
        currency: first.currency,
        orderDate: po?.date ?? first.date,
        expectedDelivery: first.expectedDelivery,
        amount: po?.amount ?? first.amount,
        stage: deriveStage(documents),
        documents,
        discrepancies: discrepancies(documents, lineItems),
        lineItems,
      }
    })
    .sort((a, b) => dateKey(a.orderDate).localeCompare(dateKey(b.orderDate)))
}

export function dateKey(value: string): string {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value)
  if (!match) return value
  return `${match[3]}-${match[2]}-${match[1]}`
}

export function daysBetween(from: string, to: string = DEMO_TODAY): number {
  const a = Date.parse(dateKey(from))
  const b = Date.parse(dateKey(to))
  if (Number.isNaN(a) || Number.isNaN(b)) return 0
  return Math.round((b - a) / 86_400_000)
}
