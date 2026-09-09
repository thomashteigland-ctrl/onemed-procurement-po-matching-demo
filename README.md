# OneMed — Inbound document matching demo

Self-contained partner/client demo: unstructured inbound supplier documents (PO, order confirmation, packing list/ASN, delivery note, invoice, credit note) become structured data, with confidence-based routing and a simple “talk to your data” dashboard.

The domain is medical-device distribution: OneMed buys to resell into healthcare, not to consume as production input. Matching is line-level and many-to-many (one PO, several deliveries and invoices).

No backend and no live LLM. Extraction, confidence, and matching are pre-scripted so the demo is repeatable.

## Run

```bash
npm install
npm run dev
```

Open the local URL Vite prints (typically `http://localhost:5173`).

## Live demo script

1. **Architecture** — Always in the header (even before intake). Click through the five steps. Note Peppol / EHF as a structured inbound channel alongside the email long tail.
2. **Intake** — Click **Simulate email intake** (or drop any files / click the drop zone). Shared inbox is `inkop@onemed.com`. The sample batch is 1,000 documents.
3. **Processing** — Watch extraction. Flagged files land in Review; orders start to fill in. Delivery notes capture lot number and expiry.
4. **Review** — Open a document (preview on the right). Click **Run confidence-based mapping** (OCR + 10 LLMs). Scores appear on each row. **Approve all ≥ 80%**, then **Check orders**. Scripted exceptions include UoM mismatch, substitution, missing lot, short expiry, partial delivery, price variance, and a credit note.
5. **Orders** — Filter by stage or **Missing document**. Line table shows ordered / confirmed / delivered / invoiced / still open. PO-2026-0918 has no delivery note. PO-2026-0733 has three delivery notes against one line.
6. **Ask data** — Try spend by country, average unit price across suppliers, fill rate, backorder exposure, or price variance vs contract.
7. **Reset demo** in the header and repeat.

## What is simulated

- Document contents are CSS previews, not parsed PDFs. Languages include Swedish, Norwegian, Danish, Finnish, German and English. A few invoices arrive as Peppol (already structured).
- Confidence and order stage (PO created → confirmed → delivered → invoiced) are derived from the sample documents. Line-level mismatches are pre-authored so review is easy to show.
- Natural-language questions are keyword-matched to canned analytics views (no SQL, no model).
- Supplier names are fictional. No patient or clinical data.
