import { EXTRACT_FIELDS } from './format'
import type { FieldKey, MappingResult, ProcurementDocument } from '../types'

export function baseDocId(id: string): string {
  return id.replace(/-c\d+$/, '')
}

const LLM_MODELS = [
  'GPT-4.1',
  'Claude 4',
  'Gemini 2.5',
  'Mistral Large',
  'Llama 4',
  'Command R+',
  'Qwen 3',
  'DeepSeek V3',
  'Nova Pro',
  'Phi-4',
] as const

/** First-pass quorum target: models agreeing the flagged value is correct. */
const FIRST_PASS: Record<string, number> = {
  'dn-0912': 0.88,
  'oc-0842': 0.89,
  'inv-0842': 0.87,
  'inv-1104': 0.61,
  'dn-0528': 0.58,
  'dn-0751': 0.86,
  'cn-0528': 0.9,
  'dn-0733c': 0.84,
}

const CEILING: Record<string, number> = {
  'dn-0912': 0.94,
  'oc-0842': 0.96,
  'inv-0842': 0.93,
  'inv-1104': 0.67,
  'dn-0528': 0.64,
  'dn-0751': 0.93,
  'cn-0528': 0.96,
  'dn-0733c': 0.91,
}

function hash(input: string): number {
  let value = 0
  for (let i = 0; i < input.length; i += 1) {
    value = (value * 31 + input.charCodeAt(i)) >>> 0
  }
  return value
}

function clamp(n: number): number {
  return Math.min(0.99, Math.max(0.38, n))
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

function jitter(seed: string, spread: number): number {
  return ((hash(seed) % 1000) / 1000 - 0.5) * spread
}

function nextEnsemble(
  base: string,
  seed: string,
  pass: number,
  previous?: number,
  original?: number,
): number {
  const first = FIRST_PASS[base] ?? 0.8
  const ceiling = CEILING[base] ?? Math.min(0.97, first + 0.08)
  if (pass <= 1) {
    const from = original ?? 0.5
    return clamp(lerp(from, first, 0.88) + jitter(`${seed}:p1`, 0.02))
  }
  const from = previous ?? first
  const step = pass === 2 ? 0.45 : 0.22
  return clamp(lerp(from, ceiling, step) + jitter(`${seed}:p${pass}`, 0.012))
}

function modelVotes(base: string, ensemble: number, pass: number) {
  const agreeCount = Math.max(4, Math.min(10, Math.round(ensemble * 10)))
  return LLM_MODELS.map((model, index) => {
    const agrees = index < agreeCount
    const center = agrees ? Math.max(ensemble, 0.82) : Math.min(0.52, ensemble - 0.18)
    return {
      model,
      confidence: clamp(center + jitter(`${base}:${model}:p${pass}`, agrees ? 0.04 : 0.06)),
    }
  })
}

function nextFieldConfidence(
  doc: ProcurementDocument,
  ensemble: number,
  pass: number,
  previous?: Record<FieldKey, number>,
): Record<FieldKey, number> {
  const next = { ...doc.fieldConfidence }
  for (const field of EXTRACT_FIELDS) {
    const current = previous?.[field] ?? doc.fieldConfidence[field]
    const flagged = doc.flaggedFields.includes(field)
    const target = flagged ? ensemble : Math.max(current, 0.96)
    const t = pass <= 1 ? (flagged ? 0.9 : 0.35) : flagged ? 0.4 : 0.15
    next[field] = clamp(lerp(current, target, t) + jitter(`${doc.id}:${field}:p${pass}`, pass <= 1 ? 0.02 : 0.008))
  }
  return next
}

export function buildMappingResult(
  doc: ProcurementDocument,
  pass: number,
  previous?: MappingResult,
): MappingResult {
  const base = baseDocId(doc.id)
  const ensemble = nextEnsemble(base, doc.id, pass, previous?.ensemble, doc.overallConfidence)
  const models = modelVotes(doc.id, ensemble, pass)
  const agreeCount = models.filter((vote) => vote.confidence >= 0.75).length
  const ocrConfidence = clamp(ensemble - 0.04 + jitter(`${doc.id}:ocr:p${pass}`, 0.02))
  return {
    ocrConfidence,
    models,
    ensemble,
    agreeCount,
    fieldConfidence: nextFieldConfidence(doc, ensemble, pass, previous?.fieldConfidence),
  }
}

export function mappingForDocs(
  docs: ProcurementDocument[],
  pass: number,
  previous: Record<string, MappingResult> = {},
): Record<string, MappingResult> {
  const results: Record<string, MappingResult> = {}
  for (const doc of docs) {
    results[doc.id] = buildMappingResult(doc, pass, previous[doc.id])
  }
  return results
}
