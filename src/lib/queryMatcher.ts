import { ENTITY_LABEL, formatMoney } from './format'
import { basePrice, baseQty, buildOrders, daysBetween } from './orders'
import type { CountryEntity, Currency, ProcurementDocument, QueryKind } from '../types'

export function graphMeta(
  kind: QueryKind,
  question: string,
  supplier?: string,
): { name: string; description: string } {
  if (kind === 'spend') {
    return {
      name: supplier ? `Spend · ${supplier.split(' ')[0]}` : 'Spend by supplier / country',
      description: supplier
        ? `Inbound spend with ${supplier}, by country entity.`
        : 'Invoice spend by supplier and OneMed country entity (goods for resale).',
    }
  }
  if (kind === 'fillRate') {
    return {
      name: 'Fill rate & on-time delivery',
      description: 'Delivered vs ordered quantity, and share of delivery notes on or before the expected date.',
    }
  }
  if (kind === 'unitPrice') {
    return {
      name: 'Average unit price per article',
      description: 'Same internal article bought from different suppliers and markets.',
    }
  }
  if (kind === 'backorder') {
    return {
      name: 'Backorder exposure',
      description: 'Open PO lines by value and age — still expected from the supplier.',
    }
  }
  if (kind === 'priceVariance') {
    return {
      name: 'Price variance vs contract',
      description: 'Invoiced unit price compared with the contracted PO price, by supplier.',
    }
  }
  return {
    name: 'Untitled graph',
    description: question,
  }
}

export function matchQuery(input: string): QueryKind {
  const q = input.toLowerCase()
  if (/(fill rate|fill-rate|on-time|ontime|otd|leverans|levere)/.test(q)) return 'fillRate'
  if (/(backorder|open po|still open|restorder|återstående|open line)/.test(q)) return 'backorder'
  if (/(price variance|contract|avtal|avvik|contracted)/.test(q)) return 'priceVariance'
  if (/(unit price|unitprice|average|avg|article|artikel|per product)/.test(q)) return 'unitPrice'
  if (/(spend|total|cost|amount|country|entity|land|forbruk)/.test(q)) return 'spend'
  return 'unknown'
}

export function mentionedSupplier(
  input: string,
  suppliers: string[],
): string | undefined {
  const q = input.toLowerCase()
  return suppliers.find((supplier) => {
    const parts = supplier.toLowerCase().split(/\s+/)
    return q.includes(supplier.toLowerCase()) || q.includes(parts[0])
  })
}

export interface SpendRow {
  supplier: string
  entity: CountryEntity
  entityLabel: string
  spend: number
  currency: Currency
}

export function spendBySupplierEntity(docs: ProcurementDocument[], supplier?: string): SpendRow[] {
  const map = new Map<string, SpendRow>()
  for (const doc of docs) {
    if (doc.docType !== 'invoice' && doc.docType !== 'credit_note') continue
    if (supplier && doc.supplier !== supplier) continue
    const key = `${doc.supplier}::${doc.entity}::${doc.currency}`
    const current = map.get(key) ?? {
      supplier: doc.supplier,
      entity: doc.entity,
      entityLabel: ENTITY_LABEL[doc.entity],
      spend: 0,
      currency: doc.currency,
    }
    current.spend += doc.amount
    map.set(key, current)
  }
  return [...map.values()].sort((a, b) => b.spend - a.spend)
}

export interface UnitPriceRow {
  supplier: string
  entity: CountryEntity
  articleId: string
  product: string
  avgUnitPrice: number
  quantity: number
  currency: Currency
}

export function avgUnitPrice(docs: ProcurementDocument[]): UnitPriceRow[] {
  const acc = new Map<
    string,
    { sum: number; qty: number; supplier: string; entity: CountryEntity; articleId: string; product: string; currency: Currency }
  >()
  for (const doc of docs) {
    if (doc.docType !== 'invoice') continue
    for (const item of doc.lineItems) {
      const articleId = item.substitutedFor ?? item.internalArticleId
      const key = `${doc.supplier}::${doc.entity}::${articleId}`
      const qty = baseQty(item)
      const current = acc.get(key) ?? {
        sum: 0,
        qty: 0,
        supplier: doc.supplier,
        entity: doc.entity,
        articleId,
        product: item.description,
        currency: item.currency,
      }
      current.sum += basePrice(item) * qty
      current.qty += qty
      acc.set(key, current)
    }
  }
  return [...acc.values()]
    .map((row) => ({
      supplier: row.supplier,
      entity: row.entity,
      articleId: row.articleId,
      product: row.product,
      avgUnitPrice: row.qty === 0 ? 0 : row.sum / row.qty,
      quantity: row.qty,
      currency: row.currency,
    }))
    .sort((a, b) => a.articleId.localeCompare(b.articleId) || a.supplier.localeCompare(b.supplier))
}

export interface FillRateRow {
  supplier: string
  ordered: number
  delivered: number
  fillRate: number
  onTimeRate: number
  deliveries: number
}

export function fillRateBySupplier(docs: ProcurementDocument[]): FillRateRow[] {
  const orders = buildOrders(docs)
  const map = new Map<string, FillRateRow & { onTime: number }>()
  for (const order of orders) {
    const row = map.get(order.supplier) ?? {
      supplier: order.supplier,
      ordered: 0,
      delivered: 0,
      fillRate: 0,
      onTimeRate: 0,
      deliveries: 0,
      onTime: 0,
    }
    for (const line of order.lineItems) {
      row.ordered += line.qtyOrdered
      row.delivered += line.qtyDelivered
    }
    const dns = order.documents.filter((doc) => doc.docType === 'delivery_note')
    for (const dn of dns) {
      row.deliveries += 1
      if (daysBetween(dn.date, order.expectedDelivery) >= 0) row.onTime += 1
    }
    map.set(order.supplier, row)
  }
  return [...map.values()]
    .map((row) => ({
      supplier: row.supplier,
      ordered: row.ordered,
      delivered: row.delivered,
      fillRate: row.ordered === 0 ? 0 : row.delivered / row.ordered,
      onTimeRate: row.deliveries === 0 ? 0 : row.onTime / row.deliveries,
      deliveries: row.deliveries,
    }))
    .sort((a, b) => a.fillRate - b.fillRate)
}

export interface BackorderRow {
  poNumber: string
  supplier: string
  entity: CountryEntity
  product: string
  qtyOpen: number
  uom: string
  value: number
  currency: Currency
  ageDays: number
}

export function backorderRows(docs: ProcurementDocument[]): BackorderRow[] {
  const orders = buildOrders(docs)
  const rows: BackorderRow[] = []
  for (const order of orders) {
    const po = order.documents.find((doc) => doc.docType === 'purchase_order')
    for (const line of order.lineItems) {
      if (line.qtyOpen <= 0) continue
      const poItem = po?.lineItems.find((item) => item.internalArticleId === line.internalArticleId)
      const unit = poItem ? basePrice(poItem) : 0
      rows.push({
        poNumber: order.poNumber,
        supplier: order.supplier,
        entity: order.entity,
        product: line.product,
        qtyOpen: line.qtyOpen,
        uom: line.unitOfMeasure,
        value: line.qtyOpen * unit,
        currency: order.currency,
        ageDays: daysBetween(order.expectedDelivery),
      })
    }
  }
  return rows.sort((a, b) => b.value - a.value)
}

export interface PriceVarianceRow {
  supplier: string
  product: string
  articleId: string
  contractPrice: number
  invoicePrice: number
  variancePct: number
  currency: Currency
}

export function priceVarianceBySupplier(docs: ProcurementDocument[]): PriceVarianceRow[] {
  const orders = buildOrders(docs)
  const rows: PriceVarianceRow[] = []
  for (const order of orders) {
    const po = order.documents.find((doc) => doc.docType === 'purchase_order')
    const invoices = order.documents.filter((doc) => doc.docType === 'invoice')
    if (!po) continue
    for (const inv of invoices) {
      for (const item of inv.lineItems) {
        const key = item.substitutedFor ?? item.internalArticleId
        const poItem = po.lineItems.find((row) => row.internalArticleId === key)
        if (!poItem) continue
        const contractPrice = basePrice(poItem)
        const invoicePrice = basePrice(item)
        if (Math.abs(invoicePrice - contractPrice) < 0.005) continue
        rows.push({
          supplier: order.supplier,
          product: poItem.description,
          articleId: key,
          contractPrice,
          invoicePrice,
          variancePct: contractPrice === 0 ? 0 : ((invoicePrice - contractPrice) / contractPrice) * 100,
          currency: item.currency,
        })
      }
    }
  }
  return rows.sort((a, b) => Math.abs(b.variancePct) - Math.abs(a.variancePct))
}

export function spendLabel(row: SpendRow): string {
  return `${row.supplier.split(' ')[0]} · ${row.entity}`
}

export function formatSpend(row: SpendRow): string {
  return formatMoney(row.spend, row.currency)
}
