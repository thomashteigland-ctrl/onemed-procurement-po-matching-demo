import { FileText, Minus, Plus } from 'lucide-react'
import { ENTITY_ADDRESS, ENTITY_LEGAL, ENTITY_ORG, docTypeShort, formatMoney } from '../lib/format'
import type { DocLanguage, DocType, ProcurementDocument } from '../types'

const TITLES: Record<DocLanguage, Record<DocType, string>> = {
  sv: {
    purchase_order: 'INKÖPSORDER',
    order_confirmation: 'ORDERBEKRÄFTELSE',
    packing_list: 'FÖLJESEDEL / PACKLISTA',
    delivery_note: 'FÖLJESEDEL',
    invoice: 'FAKTURA',
    credit_note: 'KREDITFAKTURA',
  },
  nb: {
    purchase_order: 'INNKJØPSORDRE',
    order_confirmation: 'ORDREBEKREFTELSE',
    packing_list: 'PAKKLISTE',
    delivery_note: 'FØLGESSEDEL',
    invoice: 'FAKTURA',
    credit_note: 'KREDITNOTA',
  },
  da: {
    purchase_order: 'INDKØBSORDRE',
    order_confirmation: 'ORDREBEKRÆFTELSE',
    packing_list: 'PAKKELISTE',
    delivery_note: 'FØLGESEDDEL',
    invoice: 'FAKTURA',
    credit_note: 'KREDITNOTA',
  },
  fi: {
    purchase_order: 'OSTOTILAUS',
    order_confirmation: 'TILAUSVAHVISTUS',
    packing_list: 'PAKKAUSLUETTELO',
    delivery_note: 'LÄHETE',
    invoice: 'LASKU',
    credit_note: 'HYVITYSLASKU',
  },
  en: {
    purchase_order: 'PURCHASE ORDER',
    order_confirmation: 'ORDER CONFIRMATION',
    packing_list: 'PACKING LIST / ASN',
    delivery_note: 'DELIVERY NOTE',
    invoice: 'INVOICE',
    credit_note: 'CREDIT NOTE',
  },
  de: {
    purchase_order: 'BESTELLUNG',
    order_confirmation: 'AUFTRAGSBESTÄTIGUNG',
    packing_list: 'PACKLISTE / ASN',
    delivery_note: 'LIEFERSCHEIN',
    invoice: 'RECHNUNG',
    credit_note: 'GUTSCHRIFT',
  },
}

const TO_LABEL: Record<DocLanguage, string> = {
  sv: 'Till',
  nb: 'Til',
  da: 'Til',
  fi: 'Vastaanottaja',
  en: 'To',
  de: 'An',
}

const FROM_LABEL: Record<DocLanguage, string> = {
  sv: 'Från',
  nb: 'Fra',
  da: 'Fra',
  fi: 'Lähettäjä',
  en: 'From',
  de: 'Von',
}

function Barcode() {
  return (
    <div className="mt-4 flex h-7 items-end gap-px overflow-hidden opacity-70">
      {Array.from({ length: 48 }, (_, i) => (
        <span
          key={i}
          className="bg-[#1a1510]"
          style={{
            width: i % 7 === 0 ? 2 : 1,
            height: `${10 + ((i * 13) % 16)}px`,
          }}
        />
      ))}
    </div>
  )
}

export function DocumentPreview({
  doc,
  compact = false,
}: {
  doc: ProcurementDocument
  compact?: boolean
}) {
  const title = TITLES[doc.language][doc.docType]
  const fromSupplier =
    doc.docType !== 'purchase_order'
  const issuer = fromSupplier ? doc.supplier : ENTITY_LEGAL[doc.entity]
  const recipient = fromSupplier ? ENTITY_LEGAL[doc.entity] : doc.supplier
  const recipientAddr = fromSupplier ? ENTITY_ADDRESS[doc.entity] : ''
  const smudged = doc.date.includes('?')
  const showLot = doc.docType === 'delivery_note' || doc.docType === 'packing_list'
  const peppol = doc.channel === 'peppol'
  const paperClass = peppol ? 'paper-peppol' : 'paper-scan'

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg bg-[#3c4043] shadow-[0_16px_40px_rgba(8,30,50,0.28)]">
      <div className="flex shrink-0 items-center gap-2 px-3 py-1.5 text-[11px] text-white/80">
        <FileText className="size-3.5" />
        <span className="min-w-0 truncate font-mono">{doc.fileName}</span>
        <span className="ml-auto flex items-center gap-2 text-white/50">
          <Minus className="size-3" />
          100%
          <Plus className="size-3" />
          <span>1 / 1</span>
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-[#525659] p-4">
        <article
          className={`${paperClass} font-serif mx-auto w-full max-w-[28rem] origin-top text-[#1a1510] ${
            compact ? 'p-4 text-[10px]' : 'p-6 text-[11px]'
          }`}
          style={{ transform: peppol ? undefined : 'rotate(-0.35deg)' }}
        >
          <header className="flex items-start justify-between border-b border-[#1a1510]/25 pb-3">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.22em] uppercase">{issuer}</p>
              <p className={`${compact ? 'text-base' : 'text-xl'} mt-1 font-bold tracking-wide`}>
                {title}
              </p>
              <p className="mt-1 text-[10px] opacity-70">
                {fromSupplier ? '' : `${ENTITY_ORG[doc.entity]} · `}
                {doc.shipTo}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] tracking-widest uppercase opacity-60">{docTypeShort(doc.docType)}</p>
              <p className="font-mono text-[11px]">{doc.poNumber}</p>
              <p className={`mt-1 font-mono ${smudged ? 'bg-[#1a1510]/20 italic blur-[0.4px]' : ''}`}>
                {doc.date}
              </p>
              {peppol && (
                <p className="mt-1 rounded-sm bg-[#004785] px-1.5 py-0.5 text-[8px] font-semibold tracking-wide text-white uppercase">
                  Peppol BIS 3.0
                </p>
              )}
            </div>
          </header>

          <div className={`mt-3 grid grid-cols-2 gap-x-4 gap-y-1 ${compact ? '' : 'text-[11px]'}`}>
            <div>
              <p className="text-[9px] tracking-wide uppercase opacity-55">{TO_LABEL[doc.language]}</p>
              <p className="font-semibold">{recipient}</p>
              <p className="opacity-70">{fromSupplier ? recipientAddr : 'Goods for resale'}</p>
            </div>
            <div>
              <p className="text-[9px] tracking-wide uppercase opacity-55">{FROM_LABEL[doc.language]}</p>
              <p className="font-semibold">{issuer}</p>
              <p className="opacity-70">Expected: {doc.expectedDelivery}</p>
              {doc.linkedInvoiceId && (
                <p className="opacity-70">Ref: {doc.linkedInvoiceId}</p>
              )}
            </div>
          </div>

          <table className="mt-4 w-full border-collapse">
            <thead>
              <tr className="border-y border-[#1a1510]/30 text-left text-[9px] tracking-wide uppercase opacity-60">
                <th className="py-1 font-semibold">Article</th>
                <th className="py-1 text-right font-semibold">Qty</th>
                <th className="py-1 text-right font-semibold">UoM</th>
                {showLot && !compact && <th className="py-1 font-semibold">Lot / exp.</th>}
                {!compact && <th className="py-1 text-right font-semibold">Price</th>}
                <th className="py-1 text-right font-semibold">Sum</th>
              </tr>
            </thead>
            <tbody>
              {doc.lineItems.map((item) => (
                <tr key={`${item.internalArticleId}-${item.supplierArticleNo}`} className="border-b border-[#1a1510]/15">
                  <td className="py-1 pr-2">
                    <p>{item.description}</p>
                    <p className="font-mono text-[9px] opacity-55">
                      {item.internalArticleId} · {item.supplierArticleNo}
                      {item.sterile ? ' · sterile' : ''}
                      {item.substitutedFor ? ` · alt. for ${item.substitutedFor}` : ''}
                    </p>
                  </td>
                  <td className="py-1 text-right font-mono">{item.quantity}</td>
                  <td className="py-1 text-right font-mono">{item.unitOfMeasure}</td>
                  {showLot && !compact && (
                    <td className="py-1 font-mono text-[9px]">
                      {item.lotNumber ?? '—'}
                      {item.expiryDate ? ` · ${item.expiryDate}` : ''}
                    </td>
                  )}
                  {!compact && (
                    <td className="py-1 text-right font-mono">
                      {formatMoney(item.unitPrice, item.currency, 2)}
                    </td>
                  )}
                  <td className="py-1 text-right font-mono">
                    {formatMoney(item.lineTotal, item.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex items-end justify-between">
            {doc.docType === 'delivery_note' ? (
              <p className="rotate-[-8deg] border-2 border-red-800/80 px-2 py-0.5 text-[10px] font-bold tracking-widest text-red-800/80 uppercase">
                Received
              </p>
            ) : peppol ? (
              <p className="max-w-[55%] text-[9px] opacity-50">
                Structured e-invoice · passed through · not OCR
              </p>
            ) : (
              <p className="max-w-[50%] text-[9px] opacity-50">
                Page 1 of 1 · Scanned PDF
              </p>
            )}
            <div className="text-right">
              <p className="text-[9px] tracking-wide uppercase opacity-55">Total {doc.currency}</p>
              <p className={`${compact ? 'text-base' : 'text-lg'} font-bold`}>
                {formatMoney(doc.amount, doc.currency)}
              </p>
            </div>
          </div>
          {!compact && <Barcode />}
        </article>
      </div>
    </div>
  )
}
