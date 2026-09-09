import { useMemo, useState } from 'react'
import { ArchitectureCanvas } from '../components/architecture/ArchitectureCanvas'
import { WORKFLOW_STEPS, type WorkflowStepId } from '../data/architecture'

export function ArchitectureScreen() {
  const [stepId, setStepId] = useState<WorkflowStepId>('overview')
  const step = WORKFLOW_STEPS.find((item) => item.id === stepId) ?? WORKFLOW_STEPS[0]
  const overview = step.id === 'overview'
  const activeNodeIds = useMemo(() => new Set(step.nodeIds), [step])
  const activeEdgeIds = useMemo(() => new Set(step.edgeIds), [step])
  const triggerNodeIds = useMemo(() => new Set(step.triggerNodeIds), [step])

  return (
    <div className="flex h-full min-h-0 flex-col bg-paper px-5 pt-4 pb-3">
      <div className="mb-3 shrink-0">
        <h2 className="text-xl font-semibold tracking-tight text-ink">Data architecture</h2>
        <p className="text-sm text-muted">
          How vendor documents reach OneMed through Outlook, Peppol or OneDrive, then agents check SAP and write Excel. Click a step to follow the path.
        </p>
      </div>

      <div className="mb-2 flex shrink-0 flex-wrap gap-1.5">
        {WORKFLOW_STEPS.map((item) => {
          const active = item.id === step.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setStepId(item.id)}
              className={`rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                active
                  ? 'border-ink bg-ink text-white'
                  : 'border-line bg-white text-ink-soft hover:border-ink-soft hover:text-ink'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <p className="mb-3 max-w-3xl shrink-0 text-xs leading-relaxed text-muted">{step.caption}</p>

      <ArchitectureCanvas
        overview={overview}
        activeNodeIds={activeNodeIds}
        activeEdgeIds={activeEdgeIds}
        triggerNodeIds={triggerNodeIds}
      />

      <div className="mt-3 flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-2.5 text-[11px] text-ink-soft">
        <span className="inline-flex items-center gap-2">
          <span className="size-3.5 rounded-sm border border-amber bg-amber-light ring-1 ring-amber/40" />
          Trigger for this step — where the selected path starts
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3.5 rounded-sm border border-dashed border-rose/70 bg-white" />
          Missing — not built yet
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3.5 rounded-sm border border-[#7ec8e8] bg-teal-light" />
          Agent processing
        </span>
      </div>
    </div>
  )
}
