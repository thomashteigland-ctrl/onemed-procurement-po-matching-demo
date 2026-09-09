import { BATCH_SIZE, REVIEW_QUEUE_SIZE, UNIQUE_PO_CYCLES } from '../lib/constants'
import type {
  CountryEntity,
  Currency,
  DocLanguage,
  DocType,
  FieldKey,
  IntakeChannel,
  LineItem,
  ProcurementDocument,
} from '../types'

export const NORDICA = 'Nordica Gloves AB'
export const SCANSTERILE = 'ScanSterile GmbH'
export const BALTIC = 'Baltic Wound Care OÜ'
export const HYGIA = 'Hygia Consumables Oy'
export const FJORD = 'Fjord Medical AS'
export const ORESUND = 'Øresund Care A/S'

export const SUPPLIERS = [NORDICA, SCANSTERILE, BALTIC, HYGIA, FJORD, ORESUND]

const SHIP: Record<CountryEntity, string> = {
  SE: 'OneMed Sweden AB, lager Göteborg',
  NO: 'OneMed Norge AS, lager Oslo',
  DK: 'OneMed Danmark A/S, lager Brøndby',
  FI: 'OneMed Oy, varasto Vantaa',
  EE: 'OneMed Eesti OÜ, ladu Tallinn',
  LV: 'OneMed SIA, noliktava Rīga',
  LT: 'OneMed UAB, sandėlis Vilnius',
}

const EXPECTED_DELIVERY: Record<string, string> = {
  'PO-2026-0841': '12.03.2026',
  'PO-2026-0912': '28.03.2026',
  'PO-2026-0733': '20.02.2026',
  'PO-2026-1104': '10.04.2026',
  'PO-2026-0528': '30.01.2026',
  'PO-2026-0842': '27.03.2026',
  'PO-2026-0918': '15.04.2026',
  'PO-2026-0751': '04.03.2026',
}

const HIGH = {
  docType: 0.97,
  supplier: 0.95,
  poNumber: 0.96,
  amount: 0.94,
  date: 0.93,
} as const

interface LineInput {
  id: string
  supplierNo: string
  mfrNo: string
  gtin: string
  description: string
  qty: number
  uom?: string
  factor?: number
  price: number
  currency: Currency
  vat?: number
  lot?: string
  expiry?: string
  sterile?: boolean
  contract?: string
  confirmed?: string
  actual?: string
  substitutedFor?: string
}

function line(input: LineInput): LineItem {
  return {
    internalArticleId: input.id,
    supplierArticleNo: input.supplierNo,
    manufacturerArticleNo: input.mfrNo,
    gtin: input.gtin,
    description: input.description,
    quantity: input.qty,
    unitOfMeasure: input.uom ?? 'pcs',
    uomConversionFactor: input.factor ?? 1,
    unitPrice: input.price,
    currency: input.currency,
    lineTotal: Number((input.qty * input.price).toFixed(2)),
    vatRate: input.vat ?? 25,
    lotNumber: input.lot,
    expiryDate: input.expiry,
    sterile: input.sterile ?? false,
    contractReference: input.contract,
    deliveryDateConfirmed: input.confirmed,
    deliveryDateActual: input.actual,
    substitutedFor: input.substitutedFor,
  }
}

interface DocInput {
  id: string
  docType: DocType
  supplier: string
  poNumber: string
  amount: number
  currency: Currency
  date: string
  entity: CountryEntity
  language: DocLanguage
  channel?: IntakeChannel
  linkedInvoiceId?: string
  lineItems: LineItem[]
  flaggedFields?: FieldKey[]
  flagReason?: string
  flagLineId?: string
  confidenceOverrides?: Partial<Record<FieldKey, number>>
}

function fileName(
  docType: DocType,
  supplier: string,
  poNumber: string,
  channel: IntakeChannel,
): string {
  const prefix: Record<DocType, string> = {
    purchase_order: 'PO',
    order_confirmation: 'OC',
    packing_list: 'ASN',
    delivery_note: 'DN',
    invoice: 'INV',
    credit_note: 'CN',
  }
  const slug = supplier.split(' ')[0].replace('Ø', 'O')
  const ext = channel === 'peppol' ? 'xml' : 'pdf'
  return `${prefix[docType]}_${slug}_${poNumber}.${ext}`
}

function make(input: DocInput): ProcurementDocument {
  const channel = input.channel ?? 'email'
  const fieldConfidence: Record<FieldKey, number> = {
    ...HIGH,
    ...input.confidenceOverrides,
  }
  const flaggedFields = input.flaggedFields ?? []
  const flagged = flaggedFields.length > 0 || Boolean(input.flagReason)
  const overallConfidence = flagged
    ? Math.min(
        ...[
          ...flaggedFields.map((field) => fieldConfidence[field]),
          ...(input.flagReason ? [0.62] : []),
        ],
      )
    : Number(
        (
          (fieldConfidence.docType +
            fieldConfidence.supplier +
            fieldConfidence.poNumber +
            fieldConfidence.amount +
            fieldConfidence.date) /
          5
        ).toFixed(2),
      )

  return {
    id: input.id,
    fileName: fileName(input.docType, input.supplier, input.poNumber, channel),
    docType: input.docType,
    supplier: input.supplier,
    poNumber: input.poNumber,
    amount: input.amount,
    currency: input.currency,
    date: input.date,
    shipTo: SHIP[input.entity],
    entity: input.entity,
    language: input.language,
    channel,
    expectedDelivery: EXPECTED_DELIVERY[input.poNumber] ?? input.date,
    linkedInvoiceId: input.linkedInvoiceId,
    lineItems: input.lineItems,
    fieldConfidence,
    overallConfidence,
    flagged,
    flaggedFields,
    flagReason: input.flagReason,
    flagLineId: input.flagLineId,
  }
}

const RAM_SE = 'RAM-SE-2025-014'
const RAM_NO = 'RAM-NO-2025-008'
const RAM_EE = 'RAM-EE-2025-003'
const RAM_FI = 'RAM-FI-2025-011'
const RAM_DK = 'RAM-DK-2025-006'

const items = {
  po0841: [
    line({
      id: 'OM-GLV-NIT-M',
      supplierNo: 'NG-8802-M',
      mfrNo: 'NG-8802-M',
      gtin: '7350123450001',
      description: 'Nitrile examination gloves, powder-free, size M',
      qty: 50000,
      price: 2.15,
      currency: 'SEK',
      contract: RAM_SE,
    }),
    line({
      id: 'OM-GLV-NIT-L',
      supplierNo: 'NG-8802-L',
      mfrNo: 'NG-8802-L',
      gtin: '7350123450002',
      description: 'Nitrile examination gloves, powder-free, size L',
      qty: 20000,
      price: 2.2,
      currency: 'SEK',
      contract: RAM_SE,
    }),
  ],
  dn0841: [
    line({
      id: 'OM-GLV-NIT-M',
      supplierNo: 'NG-8802-M',
      mfrNo: 'NG-8802-M',
      gtin: '7350123450001',
      description: 'Nitrile examination gloves, powder-free, size M',
      qty: 50000,
      price: 2.15,
      currency: 'SEK',
      lot: 'LOT-NG-26101',
      expiry: '03.2028',
      contract: RAM_SE,
      actual: '11.03.2026',
    }),
    line({
      id: 'OM-GLV-NIT-L',
      supplierNo: 'NG-8802-L',
      mfrNo: 'NG-8802-L',
      gtin: '7350123450002',
      description: 'Nitrile examination gloves, powder-free, size L',
      qty: 20000,
      price: 2.2,
      currency: 'SEK',
      lot: 'LOT-NG-26102',
      expiry: '03.2028',
      contract: RAM_SE,
      actual: '11.03.2026',
    }),
  ],
  po0842: [
    line({
      id: 'OM-GLV-NIT-M',
      supplierNo: 'NG-8802-M',
      mfrNo: 'NG-8802-M',
      gtin: '7350123450001',
      description: 'Nitrile examination gloves, powder-free, size M',
      qty: 10000,
      price: 2.15,
      currency: 'SEK',
      contract: RAM_SE,
    }),
    line({
      id: 'OM-GLV-NIT-L',
      supplierNo: 'NG-8802-L',
      mfrNo: 'NG-8802-L',
      gtin: '7350123450002',
      description: 'Nitrile examination gloves, powder-free, size L',
      qty: 8000,
      price: 2.2,
      currency: 'SEK',
      contract: RAM_SE,
    }),
  ],
  oc0842: [
    line({
      id: 'OM-GLV-NIT-M',
      supplierNo: 'NG-8802-M',
      mfrNo: 'NG-8802-M',
      gtin: '7350123450001',
      description: 'Nitrile examination gloves, powder-free, size M',
      qty: 10,
      uom: 'CS',
      factor: 1000,
      price: 2150,
      currency: 'SEK',
      contract: RAM_SE,
      confirmed: '27.03.2026',
    }),
    line({
      id: 'OM-GLV-NIT-L',
      supplierNo: 'NG-8802-L',
      mfrNo: 'NG-8802-L',
      gtin: '7350123450002',
      description: 'Nitrile examination gloves, powder-free, size L',
      qty: 8,
      uom: 'CS',
      factor: 1000,
      price: 2200,
      currency: 'SEK',
      contract: RAM_SE,
      confirmed: '27.03.2026',
    }),
  ],
  inv0842: [
    line({
      id: 'OM-GLV-NIT-M',
      supplierNo: 'NG-8802-M',
      mfrNo: 'NG-8802-M',
      gtin: '7350123450001',
      description: 'Nitrile examination gloves, powder-free, size M',
      qty: 100,
      uom: 'BOX',
      factor: 100,
      price: 215,
      currency: 'SEK',
      contract: RAM_SE,
    }),
    line({
      id: 'OM-GLV-NIT-L',
      supplierNo: 'NG-8802-L',
      mfrNo: 'NG-8802-L',
      gtin: '7350123450002',
      description: 'Nitrile examination gloves, powder-free, size L',
      qty: 80,
      uom: 'BOX',
      factor: 100,
      price: 220,
      currency: 'SEK',
      contract: RAM_SE,
    }),
  ],
  po0912: [
    line({
      id: 'OM-GOWN-XL-S',
      supplierNo: 'SCAN-4410',
      mfrNo: 'SCAN-4410',
      gtin: '4001234567800',
      description: 'Surgical gown sterile XL',
      qty: 4000,
      price: 8.9,
      currency: 'EUR',
      vat: 25,
      sterile: true,
      contract: RAM_NO,
    }),
    line({
      id: 'OM-DRAPE-150',
      supplierNo: 'SCAN-1502',
      mfrNo: 'SCAN-1502',
      gtin: '4001234567801',
      description: 'Surgical drape 150×200 cm, sterile',
      qty: 2000,
      price: 12.5,
      currency: 'EUR',
      vat: 25,
      sterile: true,
      contract: RAM_NO,
    }),
  ],
  dn0912: [
    line({
      id: 'OM-GOWN-XL-R',
      supplierNo: 'SCAN-4412',
      mfrNo: 'SCAN-4412',
      gtin: '4001234567891',
      description: 'Surgical gown reinforced XL, sterile',
      qty: 4000,
      price: 8.9,
      currency: 'EUR',
      vat: 25,
      lot: 'LOT-SC-4412-08',
      expiry: '11.2028',
      sterile: true,
      contract: RAM_NO,
      actual: '26.03.2026',
      substitutedFor: 'OM-GOWN-XL-S',
    }),
    line({
      id: 'OM-DRAPE-150',
      supplierNo: 'SCAN-1502',
      mfrNo: 'SCAN-1502',
      gtin: '4001234567801',
      description: 'Surgical drape 150×200 cm, sterile',
      qty: 2000,
      price: 12.5,
      currency: 'EUR',
      vat: 25,
      lot: 'LOT-SC-1502-11',
      expiry: '08.2028',
      sterile: true,
      contract: RAM_NO,
      actual: '26.03.2026',
    }),
  ],
  po0733: [
    line({
      id: 'OM-WND-HC-1010',
      supplierNo: 'BWC-HC-1010',
      mfrNo: 'BWC-HC-1010',
      gtin: '4740123450003',
      description: 'Hydrocolloid wound dressing 10×10 cm',
      qty: 12000,
      price: 3.4,
      currency: 'EUR',
      vat: 22,
      sterile: true,
      contract: RAM_EE,
    }),
    line({
      id: 'OM-WND-FO-1515',
      supplierNo: 'BWC-FO-1515',
      mfrNo: 'BWC-FO-1515',
      gtin: '4740123450004',
      description: 'Foam dressing 15×15 cm, sterile',
      qty: 4000,
      price: 5.2,
      currency: 'EUR',
      vat: 22,
      sterile: true,
      contract: RAM_EE,
    }),
  ],
  dn0733a: [
    line({
      id: 'OM-WND-HC-1010',
      supplierNo: 'BWC-HC-1010',
      mfrNo: 'BWC-HC-1010',
      gtin: '4740123450003',
      description: 'Hydrocolloid wound dressing 10×10 cm',
      qty: 5000,
      price: 3.4,
      currency: 'EUR',
      vat: 22,
      lot: 'LOT-BWC-310',
      expiry: '01.2029',
      sterile: true,
      contract: RAM_EE,
      actual: '20.02.2026',
    }),
    line({
      id: 'OM-WND-FO-1515',
      supplierNo: 'BWC-FO-1515',
      mfrNo: 'BWC-FO-1515',
      gtin: '4740123450004',
      description: 'Foam dressing 15×15 cm, sterile',
      qty: 2000,
      price: 5.2,
      currency: 'EUR',
      vat: 22,
      lot: 'LOT-BWC-311',
      expiry: '02.2029',
      sterile: true,
      contract: RAM_EE,
      actual: '20.02.2026',
    }),
  ],
  dn0733b: [
    line({
      id: 'OM-WND-HC-1010',
      supplierNo: 'BWC-HC-1010',
      mfrNo: 'BWC-HC-1010',
      gtin: '4740123450003',
      description: 'Hydrocolloid wound dressing 10×10 cm',
      qty: 4000,
      price: 3.4,
      currency: 'EUR',
      vat: 22,
      lot: 'LOT-BWC-318',
      expiry: '01.2029',
      sterile: true,
      contract: RAM_EE,
      actual: '27.02.2026',
    }),
    line({
      id: 'OM-WND-FO-1515',
      supplierNo: 'BWC-FO-1515',
      mfrNo: 'BWC-FO-1515',
      gtin: '4740123450004',
      description: 'Foam dressing 15×15 cm, sterile',
      qty: 2000,
      price: 5.2,
      currency: 'EUR',
      vat: 22,
      lot: 'LOT-BWC-319',
      expiry: '02.2029',
      sterile: true,
      contract: RAM_EE,
      actual: '27.02.2026',
    }),
  ],
  dn0733c: [
    line({
      id: 'OM-WND-HC-1010',
      supplierNo: 'BWC-HC-1010',
      mfrNo: 'BWC-HC-1010',
      gtin: '4740123450003',
      description: 'Hydrocolloid wound dressing 10×10 cm',
      qty: 2000,
      price: 3.4,
      currency: 'EUR',
      vat: 22,
      lot: 'LOT-BWC-324',
      expiry: '03.2029',
      sterile: true,
      contract: RAM_EE,
      actual: '06.03.2026',
    }),
  ],
  inv0733: [
    line({
      id: 'OM-WND-HC-1010',
      supplierNo: 'BWC-HC-1010',
      mfrNo: 'BWC-HC-1010',
      gtin: '4740123450003',
      description: 'Hydrocolloid wound dressing 10×10 cm',
      qty: 11000,
      price: 3.4,
      currency: 'EUR',
      vat: 22,
      sterile: true,
      contract: RAM_EE,
    }),
    line({
      id: 'OM-WND-FO-1515',
      supplierNo: 'BWC-FO-1515',
      mfrNo: 'BWC-FO-1515',
      gtin: '4740123450004',
      description: 'Foam dressing 15×15 cm, sterile',
      qty: 4000,
      price: 5.2,
      currency: 'EUR',
      vat: 22,
      sterile: true,
      contract: RAM_EE,
    }),
  ],
  po1104: [
    line({
      id: 'OM-SYR-10-LL',
      supplierNo: 'HY-SYR-10',
      mfrNo: 'HY-SYR-10',
      gtin: '6430123450005',
      description: 'Syringe 10 ml Luer lock',
      qty: 50000,
      price: 0.12,
      currency: 'EUR',
      vat: 24,
      sterile: true,
      contract: RAM_FI,
    }),
    line({
      id: 'OM-INC-MX-28',
      supplierNo: 'HY-INC-MX',
      mfrNo: 'HY-INC-MX',
      gtin: '6430123450006',
      description: 'Incontinence pad Maxi',
      qty: 20000,
      price: 0.85,
      currency: 'EUR',
      vat: 24,
      contract: RAM_FI,
    }),
    line({
      id: 'OM-DIS-WIP-200',
      supplierNo: 'HY-WIP-200',
      mfrNo: 'HY-WIP-200',
      gtin: '6430123450007',
      description: 'Disinfectant wipes, canister of 200',
      qty: 2000,
      uom: 'can',
      price: 4.5,
      currency: 'EUR',
      vat: 24,
      contract: RAM_FI,
    }),
  ],
  inv1104: [
    line({
      id: 'OM-SYR-10-LL',
      supplierNo: 'HY-SYR-10',
      mfrNo: 'HY-SYR-10',
      gtin: '6430123450005',
      description: 'Syringe 10 ml Luer lock',
      qty: 50000,
      price: 0.15,
      currency: 'EUR',
      vat: 24,
      sterile: true,
      contract: RAM_FI,
    }),
    line({
      id: 'OM-INC-MX-28',
      supplierNo: 'HY-INC-MX',
      mfrNo: 'HY-INC-MX',
      gtin: '6430123450006',
      description: 'Incontinence pad Maxi',
      qty: 20000,
      price: 0.85,
      currency: 'EUR',
      vat: 24,
      contract: RAM_FI,
    }),
    line({
      id: 'OM-DIS-WIP-200',
      supplierNo: 'HY-WIP-200',
      mfrNo: 'HY-WIP-200',
      gtin: '6430123450007',
      description: 'Disinfectant wipes, canister of 200',
      qty: 2000,
      uom: 'can',
      price: 4.5,
      currency: 'EUR',
      vat: 24,
      contract: RAM_FI,
    }),
  ],
  po0528: [
    line({
      id: 'OM-CAT-CH14',
      supplierNo: 'FJ-CAT-14',
      mfrNo: 'FJ-CAT-14',
      gtin: '7040123450008',
      description: 'Urinary catheter CH14, sterile',
      qty: 2400,
      price: 52,
      currency: 'NOK',
      sterile: true,
      contract: RAM_NO,
    }),
    line({
      id: 'OM-INF-20D',
      supplierNo: 'FJ-INF-20',
      mfrNo: 'FJ-INF-20',
      gtin: '7040123450009',
      description: 'Infusion set 20 drops, sterile',
      qty: 1500,
      price: 20.5,
      currency: 'NOK',
      sterile: true,
      contract: RAM_NO,
    }),
  ],
  dn0528: [
    line({
      id: 'OM-CAT-CH14',
      supplierNo: 'FJ-CAT-14',
      mfrNo: 'FJ-CAT-14',
      gtin: '7040123450008',
      description: 'Urinary catheter CH14, sterile',
      qty: 2400,
      price: 52,
      currency: 'NOK',
      expiry: '09.2028',
      sterile: true,
      contract: RAM_NO,
      actual: '29.01.2026',
    }),
    line({
      id: 'OM-INF-20D',
      supplierNo: 'FJ-INF-20',
      mfrNo: 'FJ-INF-20',
      gtin: '7040123450009',
      description: 'Infusion set 20 drops, sterile',
      qty: 1500,
      price: 20.5,
      currency: 'NOK',
      lot: 'LOT-FJ-20D-04',
      expiry: '06.2028',
      sterile: true,
      contract: RAM_NO,
      actual: '29.01.2026',
    }),
  ],
  cn0528: [
    line({
      id: 'OM-CAT-CH14',
      supplierNo: 'FJ-CAT-14',
      mfrNo: 'FJ-CAT-14',
      gtin: '7040123450008',
      description: 'Urinary catheter CH14 — damaged sterile packaging',
      qty: 100,
      price: -52,
      currency: 'NOK',
      sterile: true,
      contract: RAM_NO,
    }),
  ],
  po0918: [
    line({
      id: 'OM-CMP-II-L',
      supplierNo: 'OR-CMP-II-L',
      mfrNo: 'OR-CMP-II-L',
      gtin: '5700123450010',
      description: 'Compression stocking Class II, size L',
      qty: 600,
      uom: 'pair',
      price: 89,
      currency: 'DKK',
      vat: 25,
      contract: RAM_DK,
    }),
    line({
      id: 'OM-OST-2P',
      supplierNo: 'OR-OST-2P',
      mfrNo: 'OR-OST-2P',
      gtin: '5700123450011',
      description: 'Ostomy bag, two-piece',
      qty: 1200,
      price: 22,
      currency: 'DKK',
      vat: 25,
      contract: RAM_DK,
    }),
  ],
  po0751: [
    line({
      id: 'OM-DIS-WIP-200',
      supplierNo: 'HY-WIP-200',
      mfrNo: 'HY-WIP-200',
      gtin: '6430123450007',
      description: 'Disinfectant wipes, canister of 200',
      qty: 3600,
      uom: 'can',
      price: 4.5,
      currency: 'EUR',
      vat: 24,
      contract: RAM_FI,
    }),
    line({
      id: 'OM-SYR-10-LL',
      supplierNo: 'HY-SYR-10',
      mfrNo: 'HY-SYR-10',
      gtin: '6430123450005',
      description: 'Syringe 10 ml Luer lock',
      qty: 20000,
      price: 0.12,
      currency: 'EUR',
      vat: 24,
      sterile: true,
      contract: RAM_FI,
    }),
  ],
  dn0751: [
    line({
      id: 'OM-DIS-WIP-200',
      supplierNo: 'HY-WIP-200',
      mfrNo: 'HY-WIP-200',
      gtin: '6430123450007',
      description: 'Disinfectant wipes, canister of 200',
      qty: 3600,
      uom: 'can',
      price: 4.5,
      currency: 'EUR',
      vat: 24,
      lot: 'LOT-HY-WIP-22',
      expiry: '11.2027',
      contract: RAM_FI,
      actual: '03.03.2026',
    }),
    line({
      id: 'OM-SYR-10-LL',
      supplierNo: 'HY-SYR-10',
      mfrNo: 'HY-SYR-10',
      gtin: '6430123450005',
      description: 'Syringe 10 ml Luer lock',
      qty: 20000,
      price: 0.12,
      currency: 'EUR',
      vat: 24,
      lot: 'LOT-HY-9044',
      expiry: '15.04.2026',
      sterile: true,
      contract: RAM_FI,
      actual: '03.03.2026',
    }),
  ],
} as const satisfies Record<string, LineItem[]>

function withLots(src: LineItem[], lots: Array<{ lot: string; expiry: string; actual?: string }>): LineItem[] {
  return src.map((item, index) => ({
    ...item,
    lotNumber: lots[index]?.lot ?? item.lotNumber,
    expiryDate: lots[index]?.expiry ?? item.expiryDate,
    deliveryDateActual: lots[index]?.actual ?? item.deliveryDateActual,
  }))
}

/** Showcase-first order: a clean PO→invoice flow, then mixed completes and flags. */
export const DOCUMENTS: ProcurementDocument[] = [
  make({
    id: 'po-0841',
    docType: 'purchase_order',
    supplier: NORDICA,
    poNumber: 'PO-2026-0841',
    amount: 151500,
    currency: 'SEK',
    date: '03.03.2026',
    entity: 'SE',
    language: 'sv',
    lineItems: items.po0841,
  }),
  make({
    id: 'oc-0841',
    docType: 'order_confirmation',
    supplier: NORDICA,
    poNumber: 'PO-2026-0841',
    amount: 151500,
    currency: 'SEK',
    date: '04.03.2026',
    entity: 'SE',
    language: 'sv',
    lineItems: items.po0841,
  }),
  make({
    id: 'dn-0841',
    docType: 'delivery_note',
    supplier: NORDICA,
    poNumber: 'PO-2026-0841',
    amount: 151500,
    currency: 'SEK',
    date: '11.03.2026',
    entity: 'SE',
    language: 'sv',
    lineItems: items.dn0841,
  }),
  make({
    id: 'inv-0841',
    docType: 'invoice',
    supplier: NORDICA,
    poNumber: 'PO-2026-0841',
    amount: 151500,
    currency: 'SEK',
    date: '12.03.2026',
    entity: 'SE',
    language: 'sv',
    channel: 'peppol',
    lineItems: items.po0841,
  }),
  make({
    id: 'po-0912',
    docType: 'purchase_order',
    supplier: SCANSTERILE,
    poNumber: 'PO-2026-0912',
    amount: 60600,
    currency: 'EUR',
    date: '18.03.2026',
    entity: 'NO',
    language: 'nb',
    lineItems: items.po0912,
  }),
  make({
    id: 'dn-0912',
    docType: 'delivery_note',
    supplier: SCANSTERILE,
    poNumber: 'PO-2026-0912',
    amount: 60600,
    currency: 'EUR',
    date: '26.03.2026',
    entity: 'NO',
    language: 'de',
    lineItems: items.dn0912,
    flaggedFields: ['supplier'],
    flagReason: 'Substitution: SCAN-4412 delivered against ordered SCAN-4410 (OM-GOWN-XL-S)',
    flagLineId: 'OM-GOWN-XL-S',
    confidenceOverrides: { supplier: 0.54 },
  }),
  make({
    id: 'inv-0733',
    docType: 'invoice',
    supplier: BALTIC,
    poNumber: 'PO-2026-0733',
    amount: 58200,
    currency: 'EUR',
    date: '10.03.2026',
    entity: 'EE',
    language: 'en',
    lineItems: items.inv0733,
  }),
  make({
    id: 'oc-0733',
    docType: 'order_confirmation',
    supplier: BALTIC,
    poNumber: 'PO-2026-0733',
    amount: 61600,
    currency: 'EUR',
    date: '09.02.2026',
    entity: 'EE',
    language: 'en',
    lineItems: items.po0733,
  }),
  make({
    id: 'po-1104',
    docType: 'purchase_order',
    supplier: HYGIA,
    poNumber: 'PO-2026-1104',
    amount: 32000,
    currency: 'EUR',
    date: '01.04.2026',
    entity: 'FI',
    language: 'fi',
    lineItems: items.po1104,
  }),
  make({
    id: 'inv-0842',
    docType: 'invoice',
    supplier: NORDICA,
    poNumber: 'PO-2026-0842',
    amount: 39100,
    currency: 'SEK',
    date: '28.03.2026',
    entity: 'SE',
    language: 'sv',
    lineItems: items.inv0842,
    flaggedFields: ['amount'],
    flagReason: 'UoM mismatch: PO in pieces, invoice in boxes of 100 (OM-GLV-NIT-M / OM-GLV-NIT-L)',
    flagLineId: 'OM-GLV-NIT-M',
    confidenceOverrides: { amount: 0.61 },
  }),
  make({
    id: 'asn-0841',
    docType: 'packing_list',
    supplier: NORDICA,
    poNumber: 'PO-2026-0841',
    amount: 151500,
    currency: 'SEK',
    date: '09.03.2026',
    entity: 'SE',
    language: 'sv',
    lineItems: items.dn0841,
  }),
  make({
    id: 'oc-0912',
    docType: 'order_confirmation',
    supplier: SCANSTERILE,
    poNumber: 'PO-2026-0912',
    amount: 60600,
    currency: 'EUR',
    date: '19.03.2026',
    entity: 'NO',
    language: 'de',
    lineItems: items.po0912,
  }),
  make({
    id: 'inv-0912',
    docType: 'invoice',
    supplier: SCANSTERILE,
    poNumber: 'PO-2026-0912',
    amount: 60600,
    currency: 'EUR',
    date: '02.04.2026',
    entity: 'NO',
    language: 'de',
    lineItems: items.dn0912.map((item) => ({
      ...item,
      lotNumber: undefined,
      expiryDate: undefined,
      deliveryDateActual: undefined,
    })),
  }),
  make({
    id: 'po-0733',
    docType: 'purchase_order',
    supplier: BALTIC,
    poNumber: 'PO-2026-0733',
    amount: 61600,
    currency: 'EUR',
    date: '08.02.2026',
    entity: 'EE',
    language: 'en',
    lineItems: items.po0733,
  }),
  make({
    id: 'dn-0733a',
    docType: 'delivery_note',
    supplier: BALTIC,
    poNumber: 'PO-2026-0733',
    amount: 27400,
    currency: 'EUR',
    date: '20.02.2026',
    entity: 'EE',
    language: 'en',
    lineItems: items.dn0733a,
  }),
  make({
    id: 'dn-0733b',
    docType: 'delivery_note',
    supplier: BALTIC,
    poNumber: 'PO-2026-0733',
    amount: 24000,
    currency: 'EUR',
    date: '27.02.2026',
    entity: 'EE',
    language: 'en',
    lineItems: items.dn0733b,
  }),
  make({
    id: 'dn-0733c',
    docType: 'delivery_note',
    supplier: BALTIC,
    poNumber: 'PO-2026-0733',
    amount: 6800,
    currency: 'EUR',
    date: '06.03.2026',
    entity: 'EE',
    language: 'en',
    lineItems: items.dn0733c,
    flaggedFields: ['amount'],
    flagReason: 'Partial delivery: line OM-WND-HC-1010 still 1,000 pcs open after three deliveries',
    flagLineId: 'OM-WND-HC-1010',
    confidenceOverrides: { amount: 0.57 },
  }),
  make({
    id: 'oc-1104',
    docType: 'order_confirmation',
    supplier: HYGIA,
    poNumber: 'PO-2026-1104',
    amount: 32000,
    currency: 'EUR',
    date: '02.04.2026',
    entity: 'FI',
    language: 'fi',
    lineItems: items.po1104,
  }),
  make({
    id: 'dn-1104',
    docType: 'delivery_note',
    supplier: HYGIA,
    poNumber: 'PO-2026-1104',
    amount: 32000,
    currency: 'EUR',
    date: '08.04.2026',
    entity: 'FI',
    language: 'fi',
    lineItems: withLots(items.po1104, [
      { lot: 'LOT-HY-SYR-41', expiry: '04.2028', actual: '08.04.2026' },
      { lot: 'LOT-HY-INC-18', expiry: '11.2027', actual: '08.04.2026' },
      { lot: 'LOT-HY-WIP-09', expiry: '09.2027', actual: '08.04.2026' },
    ]),
  }),
  make({
    id: 'inv-1104',
    docType: 'invoice',
    supplier: HYGIA,
    poNumber: 'PO-2026-1104',
    amount: 33500,
    currency: 'EUR',
    date: '09.04.2026',
    entity: 'FI',
    language: 'fi',
    lineItems: items.inv1104,
    flaggedFields: ['amount'],
    flagReason: 'Price variance: syringe 10 ml invoiced €0.15 vs contract €0.12 (OM-SYR-10-LL)',
    flagLineId: 'OM-SYR-10-LL',
    confidenceOverrides: { poNumber: 0.91, amount: 0.55 },
  }),
  make({
    id: 'po-0528',
    docType: 'purchase_order',
    supplier: FJORD,
    poNumber: 'PO-2026-0528',
    amount: 155550,
    currency: 'NOK',
    date: '14.01.2026',
    entity: 'NO',
    language: 'nb',
    lineItems: items.po0528,
  }),
  make({
    id: 'oc-0528',
    docType: 'order_confirmation',
    supplier: FJORD,
    poNumber: 'PO-2026-0528',
    amount: 155550,
    currency: 'NOK',
    date: '15.01.2026',
    entity: 'NO',
    language: 'nb',
    lineItems: items.po0528,
  }),
  make({
    id: 'dn-0528',
    docType: 'delivery_note',
    supplier: FJORD,
    poNumber: 'PO-2026-0528',
    amount: 155550,
    currency: 'NOK',
    date: '29.01.2026',
    entity: 'NO',
    language: 'nb',
    lineItems: items.dn0528,
    flaggedFields: ['date'],
    flagReason: 'Missing lot number on sterile product OM-CAT-CH14',
    flagLineId: 'OM-CAT-CH14',
    confidenceOverrides: { date: 0.49 },
  }),
  make({
    id: 'inv-0528',
    docType: 'invoice',
    supplier: FJORD,
    poNumber: 'PO-2026-0528',
    amount: 155550,
    currency: 'NOK',
    date: '02.02.2026',
    entity: 'NO',
    language: 'nb',
    lineItems: items.po0528,
  }),
  make({
    id: 'cn-0528',
    docType: 'credit_note',
    supplier: FJORD,
    poNumber: 'PO-2026-0528',
    amount: -5200,
    currency: 'NOK',
    date: '18.02.2026',
    entity: 'NO',
    language: 'nb',
    linkedInvoiceId: 'inv-0528',
    lineItems: items.cn0528,
    flaggedFields: ['poNumber'],
    flagReason: 'Credit note must be linked to invoice INV-0528 (damaged sterile packaging)',
    flagLineId: 'OM-CAT-CH14',
    confidenceOverrides: { poNumber: 0.52 },
  }),
  make({
    id: 'po-0842',
    docType: 'purchase_order',
    supplier: NORDICA,
    poNumber: 'PO-2026-0842',
    amount: 39100,
    currency: 'SEK',
    date: '16.03.2026',
    entity: 'SE',
    language: 'sv',
    lineItems: items.po0842,
  }),
  make({
    id: 'oc-0842',
    docType: 'order_confirmation',
    supplier: NORDICA,
    poNumber: 'PO-2026-0842',
    amount: 39100,
    currency: 'SEK',
    date: '17.03.2026',
    entity: 'SE',
    language: 'sv',
    lineItems: items.oc0842,
    flaggedFields: ['amount'],
    flagReason: 'UoM mismatch: PO in pieces, confirmation in cases of 1,000 pcs',
    flagLineId: 'OM-GLV-NIT-M',
    confidenceOverrides: { amount: 0.58 },
  }),
  make({
    id: 'dn-0842',
    docType: 'delivery_note',
    supplier: NORDICA,
    poNumber: 'PO-2026-0842',
    amount: 39100,
    currency: 'SEK',
    date: '26.03.2026',
    entity: 'SE',
    language: 'sv',
    lineItems: withLots(items.po0842, [
      { lot: 'LOT-NG-26220', expiry: '04.2028', actual: '26.03.2026' },
      { lot: 'LOT-NG-26221', expiry: '04.2028', actual: '26.03.2026' },
    ]),
  }),
  make({
    id: 'po-0918',
    docType: 'purchase_order',
    supplier: ORESUND,
    poNumber: 'PO-2026-0918',
    amount: 79800,
    currency: 'DKK',
    date: '05.04.2026',
    entity: 'DK',
    language: 'da',
    lineItems: items.po0918,
  }),
  make({
    id: 'oc-0918',
    docType: 'order_confirmation',
    supplier: ORESUND,
    poNumber: 'PO-2026-0918',
    amount: 79800,
    currency: 'DKK',
    date: '06.04.2026',
    entity: 'DK',
    language: 'da',
    lineItems: items.po0918,
  }),
  make({
    id: 'inv-0918',
    docType: 'invoice',
    supplier: ORESUND,
    poNumber: 'PO-2026-0918',
    amount: 79800,
    currency: 'DKK',
    date: '15.04.2026',
    entity: 'DK',
    language: 'da',
    channel: 'peppol',
    lineItems: items.po0918,
  }),
  make({
    id: 'po-0751',
    docType: 'purchase_order',
    supplier: HYGIA,
    poNumber: 'PO-2026-0751',
    amount: 18600,
    currency: 'EUR',
    date: '21.02.2026',
    entity: 'FI',
    language: 'fi',
    lineItems: items.po0751,
  }),
  make({
    id: 'oc-0751',
    docType: 'order_confirmation',
    supplier: HYGIA,
    poNumber: 'PO-2026-0751',
    amount: 18600,
    currency: 'EUR',
    date: '22.02.2026',
    entity: 'FI',
    language: 'fi',
    lineItems: items.po0751,
  }),
  make({
    id: 'dn-0751',
    docType: 'delivery_note',
    supplier: HYGIA,
    poNumber: 'PO-2026-0751',
    amount: 18600,
    currency: 'EUR',
    date: '03.03.2026',
    entity: 'FI',
    language: 'fi',
    lineItems: items.dn0751,
    flaggedFields: ['date'],
    flagReason: 'Expiry 15.04.2026 is shorter than the agreed 12-month remaining shelf life (OM-SYR-10-LL)',
    flagLineId: 'OM-SYR-10-LL',
    confidenceOverrides: { date: 0.51 },
  }),
  make({
    id: 'inv-0751',
    docType: 'invoice',
    supplier: HYGIA,
    poNumber: 'PO-2026-0751',
    amount: 18600,
    currency: 'EUR',
    date: '04.03.2026',
    entity: 'FI',
    language: 'fi',
    lineItems: items.po0751,
  }),
]

export const DOC_TYPE_INDEX: Record<DocType, number> = {
  purchase_order: 0,
  order_confirmation: 1,
  packing_list: 2,
  delivery_note: 3,
  invoice: 4,
  credit_note: 5,
}

/** Extra PO suffixes walk this mix so Orders is not all invoiced. */
const STAGE_MIX = [0, 1, 2, 3, 4, 0, 1]

const FLAGGED_FLOOR_BY_PO: Record<string, number> = {}
for (const doc of DOCUMENTS) {
  if (!doc.flagged) continue
  FLAGGED_FLOOR_BY_PO[doc.poNumber] = Math.max(
    FLAGGED_FLOOR_BY_PO[doc.poNumber] ?? 0,
    DOC_TYPE_INDEX[doc.docType],
  )
}

function cyclePoNumber(poNumber: string, cycle: number): string {
  const suffix = cycle % UNIQUE_PO_CYCLES
  if (suffix === 0) return poNumber
  return `${poNumber}-${String(suffix).padStart(2, '0')}`
}

function poNumeric(poNumber: string): number {
  return Number(poNumber.replace(/\D/g, '').slice(-4)) || 0
}

/** Highest document type to keep for this PO variant (0 = PO only … 5 = credit note). */
function orderStageCap(basePo: string, suffix: number): number {
  const flaggedFloor = FLAGGED_FLOOR_BY_PO[basePo] ?? 0
  if (suffix === 0) return 5
  const mixed = STAGE_MIX[(suffix - 1 + poNumeric(basePo)) % STAGE_MIX.length]
  return Math.max(mixed, flaggedFloor)
}

export function buildBatch(droppedNames: string[] = []): ProcurementDocument[] {
  const batch: ProcurementDocument[] = []
  let i = 0
  let reviewCount = 0
  while (batch.length < BATCH_SIZE) {
    const src = DOCUMENTS[i % DOCUMENTS.length]
    const cycle = Math.floor(i / DOCUMENTS.length)
    const suffix = cycle % UNIQUE_PO_CYCLES
    i += 1
    if (DOC_TYPE_INDEX[src.docType] > orderStageCap(src.poNumber, suffix)) continue

    const overlayName = droppedNames[batch.length]
    const keepFlag = src.flagged && reviewCount < REVIEW_QUEUE_SIZE
    if (keepFlag) reviewCount += 1
    batch.push({
      ...src,
      lineItems: src.lineItems.map((item) => ({ ...item })),
      fieldConfidence: keepFlag ? { ...src.fieldConfidence } : { ...HIGH },
      flaggedFields: keepFlag ? [...src.flaggedFields] : [],
      flagReason: keepFlag ? src.flagReason : undefined,
      flagLineId: keepFlag ? src.flagLineId : undefined,
      flagged: keepFlag,
      overallConfidence: keepFlag ? src.overallConfidence : src.channel === 'peppol' ? 0.99 : 0.94,
      id: cycle === 0 ? src.id : `${src.id}-c${cycle}`,
      poNumber: cyclePoNumber(src.poNumber, cycle),
      linkedInvoiceId:
        src.linkedInvoiceId && cycle === 0
          ? src.linkedInvoiceId
          : src.linkedInvoiceId
            ? `${src.linkedInvoiceId}-c${cycle}`
            : undefined,
      fileName:
        overlayName ??
        (cycle === 0
          ? src.fileName
          : src.fileName.replace(/\.(pdf|xml)$/, `-${String(suffix).padStart(2, '0')}.$1`)),
    })
  }
  return batch
}
