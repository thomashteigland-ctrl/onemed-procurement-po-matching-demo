import { buildBatch } from '../data/documents'
import { EXTRACT_FIELDS } from './format'
import {
  BURST_SIZE,
  SHOWCASE_COUNT,
} from './constants'
import { useDemoStore } from '../store/demoStore'

let cancelled = false
const timeouts: number[] = []

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const id = window.setTimeout(resolve, ms)
    timeouts.push(id)
  })
}

function clearQueued() {
  for (const id of timeouts) {
    window.clearTimeout(id)
  }
  timeouts.length = 0
}

export function stopProcessing() {
  cancelled = true
  clearQueued()
}

export async function startProcessing(
  source: 'drop' | 'email',
  droppedNames: string[] = [],
) {
  stopProcessing()
  cancelled = false
  const batch = buildBatch(droppedNames)
  useDemoStore.getState().initBatch(batch, source)

  for (let i = 0; i < SHOWCASE_COUNT; i += 1) {
    if (cancelled) return
    const doc = batch[i]
    const store = useDemoStore.getState()
    store.beginDocument(doc)
    await sleep(140)
    if (cancelled) return

    for (const field of EXTRACT_FIELDS) {
      if (cancelled) return
      useDemoStore.getState().revealField(field)
      await sleep(220)
    }

    if (cancelled) return
    useDemoStore.getState().showJson()
    await sleep(250)
    if (cancelled) return

    useDemoStore.getState().setExtractionStatus(doc.flagged ? 'flagged' : 'completed')
    await sleep(280)
    if (cancelled) return

    useDemoStore.getState().commitDocument(doc)
    await sleep(120)
  }

  if (cancelled) return

  for (let i = SHOWCASE_COUNT; i < batch.length; i += BURST_SIZE) {
    if (cancelled) return
    const slice = batch.slice(i, i + BURST_SIZE)
    const last = slice[slice.length - 1]
    const store = useDemoStore.getState()
    store.beginDocument(last)
    store.revealAllFields()
    store.showJson()
    await sleep(40)
    if (cancelled) return
    store.setExtractionStatus(last.flagged ? 'flagged' : 'completed')
    store.commitMany(slice)
    await sleep(70)
  }

  if (cancelled) return
  useDemoStore.getState().finishProcessing()
}
