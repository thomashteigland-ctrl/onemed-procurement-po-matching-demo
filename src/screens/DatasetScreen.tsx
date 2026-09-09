import { DataTable } from '../components/DataTable'
import { useDemoStore } from '../store/demoStore'

export function DatasetScreen() {
  const completed = useDemoStore((s) => s.completed)

  return (
    <div className="flex h-full min-h-0 flex-col p-5">
      <div className="mb-4">
        <h2 className="text-xl font-semibold tracking-tight text-ink">Extracted documents</h2>
        <p className="text-sm text-muted">
          Every auto-completed file as a structured row — including Peppol invoices that passed through. Open <span className="font-medium text-ink">Orders</span> to see line-level match state per PO.
        </p>
      </div>
      <DataTable rows={completed} maxRows={80} />
    </div>
  )
}
