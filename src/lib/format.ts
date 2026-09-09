import type {
  CountryEntity,
  Currency,
  DocLanguage,
  DocType,
  FieldKey,
  IntakeChannel,
  LineMatchStatus,
  ProcurementDocument,
} from '../types'

export const ENTITY_LABEL: Record<CountryEntity, string> = {
  SE: 'OneMed Sweden',
  NO: 'OneMed Norge',
  DK: 'OneMed Danmark',
  FI: 'OneMed Finland',
  EE: 'OneMed Eesti',
  LV: 'OneMed Latvija',
  LT: 'OneMed Lietuva',
}

export const ENTITY_LEGAL: Record<CountryEntity, string> = {
  SE: 'OneMed Sweden AB',
  NO: 'OneMed Norge AS',
  DK: 'OneMed Danmark A/S',
  FI: 'OneMed Oy',
  EE: 'OneMed Eesti OÜ',
  LV: 'OneMed SIA',
  LT: 'OneMed UAB',
}

export const ENTITY_ADDRESS: Record<CountryEntity, string> = {
  SE: 'Lager Göteborg',
  NO: 'Lager Oslo',
  DK: 'Lager Brøndby',
  FI: 'Varasto Vantaa',
  EE: 'Ladu Tallinn',
  LV: 'Noliktava Rīga',
  LT: 'Sandėlis Vilnius',
}

export const ENTITY_ORG: Record<CountryEntity, string> = {
  SE: 'Org.nr 556012-3456',
  NO: 'Org.nr 981 000 111 MVA',
  DK: 'CVR 12345678',
  FI: 'Y-tunnus 1234567-8',
  EE: 'Reg. 12345678',
  LV: 'Reģ. 40003123456',
  LT: 'Įm. k. 123456789',
}

export function formatMoney(amount: number, currency: Currency, fractionDigits = 0): string {
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency,
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(amount)
}

export function formatCompactMoney(amount: number, currency: Currency): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toLocaleString('nb-NO', { maximumFractionDigits: 1 })} mill. ${currency}`
  }
  return formatMoney(amount, currency)
}

export function docTypeLabel(type: DocType): string {
  switch (type) {
    case 'purchase_order':
      return 'Purchase order'
    case 'order_confirmation':
      return 'Order confirmation'
    case 'packing_list':
      return 'Packing list / ASN'
    case 'delivery_note':
      return 'Delivery note'
    case 'invoice':
      return 'Invoice'
    case 'credit_note':
      return 'Credit note'
  }
}

export function docTypeShort(type: DocType): string {
  switch (type) {
    case 'purchase_order':
      return 'PO'
    case 'order_confirmation':
      return 'OC'
    case 'packing_list':
      return 'ASN'
    case 'delivery_note':
      return 'DN'
    case 'invoice':
      return 'INV'
    case 'credit_note':
      return 'CN'
  }
}

export function fieldLabel(field: FieldKey): string {
  switch (field) {
    case 'docType':
      return 'Document type'
    case 'supplier':
      return 'Supplier'
    case 'poNumber':
      return 'PO number'
    case 'amount':
      return 'Amount'
    case 'date':
      return 'Date'
  }
}

export function fieldValue(doc: ProcurementDocument, field: FieldKey): string {
  switch (field) {
    case 'docType':
      return docTypeLabel(doc.docType)
    case 'supplier':
      return doc.supplier
    case 'poNumber':
      return doc.poNumber
    case 'amount':
      return formatMoney(doc.amount, doc.currency)
    case 'date':
      return doc.date
  }
}

export function parseAmountInput(value: string): number | null {
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(/\s/g, '').replace(',', '.')
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

export function confidencePct(value: number): string {
  return `${Math.round(value * 100)}%`
}

export const EXTRACT_FIELDS: FieldKey[] = [
  'docType',
  'supplier',
  'poNumber',
  'amount',
  'date',
]

export function lineMatchLabel(status: LineMatchStatus): string {
  switch (status) {
    case 'matched':
      return 'Matched'
    case 'partial':
      return 'Partial'
    case 'over_delivered':
      return 'Over-delivered'
    case 'price_variance':
      return 'Price variance'
    case 'substituted':
      return 'Substituted'
    case 'unmatched':
      return 'Unmatched'
  }
}

export function channelLabel(channel: IntakeChannel): string {
  return channel === 'peppol' ? 'Peppol / EHF' : 'Email PDF'
}

export function languageLabel(language: DocLanguage): string {
  switch (language) {
    case 'sv':
      return 'Swedish'
    case 'nb':
      return 'Norwegian'
    case 'da':
      return 'Danish'
    case 'fi':
      return 'Finnish'
    case 'en':
      return 'English'
    case 'de':
      return 'German'
  }
}

export function toExtractionJson(doc: ProcurementDocument): string {
  return JSON.stringify(
    {
      documentType: doc.docType,
      channel: doc.channel,
      language: doc.language,
      entity: doc.entity,
      supplier: doc.supplier,
      poNumber: doc.poNumber,
      amount: doc.amount,
      currency: doc.currency,
      date: doc.date,
      expectedDelivery: doc.expectedDelivery,
      linkedInvoiceId: doc.linkedInvoiceId,
      lineItems: doc.lineItems.map((item) => ({
        internal_article_id: item.internalArticleId,
        supplier_article_no: item.supplierArticleNo,
        manufacturer_article_no: item.manufacturerArticleNo,
        gtin: item.gtin,
        description: item.description,
        quantity: item.quantity,
        unit_of_measure: item.unitOfMeasure,
        uom_conversion_factor: item.uomConversionFactor,
        unit_price: item.unitPrice,
        currency: item.currency,
        line_total: item.lineTotal,
        vat_rate: item.vatRate,
        lot_number: item.lotNumber ?? null,
        expiry_date: item.expiryDate ?? null,
        sterile: item.sterile,
        contract_reference: item.contractReference ?? null,
        delivery_date_confirmed: item.deliveryDateConfirmed ?? null,
        delivery_date_actual: item.deliveryDateActual ?? null,
        substituted_for: item.substitutedFor ?? null,
      })),
      confidence: Number(doc.overallConfidence.toFixed(2)),
    },
    null,
    2,
  )
}
