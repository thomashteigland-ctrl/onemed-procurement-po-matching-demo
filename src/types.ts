export type DocType =
  | 'purchase_order'
  | 'order_confirmation'
  | 'packing_list'
  | 'delivery_note'
  | 'invoice'
  | 'credit_note'

export type OrderStage = 'po_created' | 'confirmed' | 'delivered' | 'invoiced'

export type Currency = 'SEK' | 'NOK' | 'DKK' | 'EUR'

export type CountryEntity = 'SE' | 'NO' | 'DK' | 'FI' | 'EE' | 'LV' | 'LT'

export type DocLanguage = 'sv' | 'nb' | 'da' | 'fi' | 'en' | 'de'

export type IntakeChannel = 'email' | 'peppol'

export type LineMatchStatus =
  | 'matched'
  | 'partial'
  | 'over_delivered'
  | 'price_variance'
  | 'substituted'
  | 'unmatched'

export type FieldKey = 'docType' | 'supplier' | 'poNumber' | 'amount' | 'date'

export interface LineItem {
  internalArticleId: string
  supplierArticleNo: string
  manufacturerArticleNo: string
  gtin: string
  description: string
  quantity: number
  unitOfMeasure: string
  uomConversionFactor: number
  unitPrice: number
  currency: Currency
  lineTotal: number
  vatRate: number
  lotNumber?: string
  expiryDate?: string
  sterile: boolean
  contractReference?: string
  deliveryDateConfirmed?: string
  deliveryDateActual?: string
  substitutedFor?: string
}

export interface ProcurementDocument {
  id: string
  fileName: string
  docType: DocType
  supplier: string
  poNumber: string
  amount: number
  currency: Currency
  date: string
  shipTo: string
  entity: CountryEntity
  language: DocLanguage
  channel: IntakeChannel
  expectedDelivery: string
  linkedInvoiceId?: string
  lineItems: LineItem[]
  fieldConfidence: Record<FieldKey, number>
  overallConfidence: number
  flagged: boolean
  flaggedFields: FieldKey[]
  flagReason?: string
  flagLineId?: string
}

export interface OrderDiscrepancy {
  field: string
  message: string
  docType?: DocType
  lineId?: string
}

export interface OrderLineSuperset {
  internalArticleId: string
  product: string
  unitOfMeasure: string
  qtyOrdered: number
  qtyConfirmed: number
  qtyDelivered: number
  qtyInvoiced: number
  qtyOpen: number
  status: LineMatchStatus
  byType: Partial<Record<DocType, { quantity: number; unitPrice: number; uom: string }>>
  mismatch: boolean
}

export interface Order {
  poNumber: string
  supplier: string
  entity: CountryEntity
  currency: Currency
  orderDate: string
  expectedDelivery: string
  amount: number
  stage: OrderStage
  documents: ProcurementDocument[]
  discrepancies: OrderDiscrepancy[]
  lineItems: OrderLineSuperset[]
}

export type AppScreen =
  | 'intake'
  | 'processing'
  | 'orders'
  | 'dataset'
  | 'review'
  | 'talk'
  | 'architecture'

export type ExtractionStatus = 'extracting' | 'completed' | 'flagged'

export type QueryKind =
  | 'spend'
  | 'unitPrice'
  | 'fillRate'
  | 'backorder'
  | 'priceVariance'
  | 'unknown'

export interface ModelVote {
  model: string
  confidence: number
}

export interface MappingResult {
  ocrConfidence: number
  models: ModelVote[]
  ensemble: number
  agreeCount: number
  fieldConfidence: Record<FieldKey, number>
}

export interface SavedGraph {
  id: string
  name: string
  description: string
  question: string
  kind: QueryKind
  supplier?: string
  dashboardId?: string
}

export interface SavedDashboard {
  id: string
  name: string
  description: string
  graphIds: string[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
}
