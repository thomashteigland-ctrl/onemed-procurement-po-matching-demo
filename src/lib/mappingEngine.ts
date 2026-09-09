import { mappingForDocs } from './confidenceMapping'
import { useDemoStore } from '../store/demoStore'

let cancelled = false
const timeouts: number[] = []

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const id = window.setTimeout(resolve, ms)
    timeouts.push(id)
  })
}

export function stopMapping() {
  cancelled = true
  for (const id of timeouts) window.clearTimeout(id)
  timeouts.length = 0
}

export async function runConfidenceMapping() {
  stopMapping()
  cancelled = false
  useDemoStore.getState().setMappingRunning('Sending scans through OCR…')
  await sleep(450)
  if (cancelled) return

  for (let i = 1; i <= 10; i += 1) {
    if (cancelled) return
    useDemoStore.getState().setMappingRunning(`LLM pass ${i} of 10…`)
    await sleep(160)
  }

  if (cancelled) return
  const { flagged, mappingPass, mappingResults } = useDemoStore.getState()
  useDemoStore.getState().setMappingResults(mappingForDocs(flagged, mappingPass + 1, mappingResults))
}
