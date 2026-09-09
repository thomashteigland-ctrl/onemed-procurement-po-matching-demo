import { create } from 'zustand'
import { EXTRACT_FIELDS, parseAmountInput } from '../lib/format'
import { graphMeta } from '../lib/queryMatcher'
import type {
  AppScreen,
  ChatMessage,
  ExtractionStatus,
  FieldKey,
  MappingResult,
  ProcurementDocument,
  QueryKind,
  SavedDashboard,
  SavedGraph,
} from '../types'

export interface DemoState {
  screen: AppScreen
  phase: 'idle' | 'processing' | 'done'
  intakeSource: 'drop' | 'email' | null
  batch: ProcurementDocument[]
  processedCount: number
  completed: ProcurementDocument[]
  flagged: ProcurementDocument[]
  currentDoc: ProcurementDocument | null
  visibleFields: FieldKey[]
  jsonVisible: boolean
  extractionStatus: ExtractionStatus | null
  approvedIds: string[]
  correctingId: string | null
  toast: string | null
  animateRows: boolean
  mappingStatus: 'idle' | 'running' | 'done'
  mappingStep: string
  mappingPass: number
  mappingResults: Record<string, MappingResult>
  setScreen: (screen: AppScreen) => void
  initBatch: (batch: ProcurementDocument[], source: 'drop' | 'email') => void
  beginDocument: (doc: ProcurementDocument) => void
  revealField: (field: FieldKey) => void
  revealAllFields: () => void
  showJson: () => void
  setExtractionStatus: (status: ExtractionStatus) => void
  commitDocument: (doc: ProcurementDocument) => void
  commitMany: (docs: ProcurementDocument[]) => void
  finishProcessing: () => void
  approve: (id: string) => void
  approveAboveMapping: (threshold: number, notifyNone?: boolean) => number
  startCorrect: (id: string) => void
  closeCorrect: () => void
  saveCorrection: () => void
  updateDocumentField: (id: string, field: FieldKey, value: string) => void
  setMappingRunning: (step: string) => void
  setMappingResults: (results: Record<string, MappingResult>) => void
  setToast: (message: string | null) => void
  graphs: SavedGraph[]
  dashboards: SavedDashboard[]
  selectedAskId: string | null
  askDraft: boolean
  chatMessages: ChatMessage[]
  createDashboard: () => void
  startNewGraph: () => void
  selectAskItem: (id: string | null) => void
  deleteGraph: (id: string) => void
  deleteDashboard: (id: string) => void
  addChat: (role: ChatMessage['role'], text: string) => void
  saveGraphFromQuery: (question: string, kind: QueryKind, supplier?: string) => void
  reset: () => void
}

const initial = {
  screen: 'intake' as AppScreen,
  phase: 'idle' as const,
  intakeSource: null,
  batch: [] as ProcurementDocument[],
  processedCount: 0,
  completed: [] as ProcurementDocument[],
  flagged: [] as ProcurementDocument[],
  currentDoc: null,
  visibleFields: [] as FieldKey[],
  jsonVisible: false,
  extractionStatus: null,
  approvedIds: [] as string[],
  correctingId: null,
  toast: null,
  animateRows: true,
  mappingStatus: 'idle' as const,
  mappingStep: '',
  mappingPass: 0,
  mappingResults: {} as Record<string, MappingResult>,
  graphs: [] as SavedGraph[],
  dashboards: [] as SavedDashboard[],
  selectedAskId: null as string | null,
  askDraft: false,
  chatMessages: [] as ChatMessage[],
}

function routeDoc(
  completed: ProcurementDocument[],
  flagged: ProcurementDocument[],
  doc: ProcurementDocument,
) {
  if (doc.flagged) {
    flagged.push(doc)
  } else {
    completed.push(doc)
  }
}

function moveApproved(
  state: Pick<DemoState, 'flagged' | 'completed' | 'approvedIds'>,
  ids: string[],
) {
  const idSet = new Set(ids.filter((id) => !state.approvedIds.includes(id)))
  if (idSet.size === 0) {
    return {
      flagged: state.flagged,
      completed: state.completed,
      approvedIds: state.approvedIds,
      moved: 0,
    }
  }
  const moving = state.flagged.filter((doc) => idSet.has(doc.id))
  const remaining = state.flagged.filter((doc) => !idSet.has(doc.id))
  return {
    flagged: remaining,
    completed: [
      ...state.completed,
      ...moving.map((doc) => ({ ...doc, flagged: false })),
    ],
    approvedIds: [...state.approvedIds, ...idSet],
    moved: moving.length,
  }
}

function applyField(
  doc: ProcurementDocument,
  field: FieldKey,
  value: string,
): ProcurementDocument {
  if (field === 'supplier') return { ...doc, supplier: value }
  if (field === 'poNumber') return { ...doc, poNumber: value }
  if (field === 'date') return { ...doc, date: value }
  if (field === 'amount') {
    const parsed = parseAmountInput(value)
    return parsed == null ? doc : { ...doc, amount: parsed }
  }
  if (field === 'docType') {
    if (
      value === 'purchase_order' ||
      value === 'order_confirmation' ||
      value === 'packing_list' ||
      value === 'delivery_note' ||
      value === 'invoice' ||
      value === 'credit_note'
    ) {
      return { ...doc, docType: value }
    }
  }
  return doc
}

export const useDemoStore = create<DemoState>((set, get) => ({
  ...initial,
  setScreen: (screen) => set({ screen }),
  initBatch: (batch, source) =>
    set({
      ...initial,
      screen: 'processing',
      phase: 'processing',
      intakeSource: source,
      batch,
      animateRows: true,
    }),
  beginDocument: (doc) =>
    set({
      currentDoc: doc,
      visibleFields: [],
      jsonVisible: false,
      extractionStatus: 'extracting',
    }),
  revealField: (field) =>
    set((state) => ({
      visibleFields: state.visibleFields.includes(field)
        ? state.visibleFields
        : [...state.visibleFields, field],
    })),
  revealAllFields: () => set({ visibleFields: [...EXTRACT_FIELDS] }),
  showJson: () => set({ jsonVisible: true }),
  setExtractionStatus: (status) => set({ extractionStatus: status }),
  commitDocument: (doc) =>
    set((state) => {
      const completed = [...state.completed]
      const flagged = [...state.flagged]
      routeDoc(completed, flagged, doc)
      return {
        completed,
        flagged,
        processedCount: state.processedCount + 1,
      }
    }),
  commitMany: (docs) =>
    set((state) => {
      const completed = [...state.completed]
      const flagged = [...state.flagged]
      for (const doc of docs) {
        routeDoc(completed, flagged, doc)
      }
      return {
        completed,
        flagged,
        processedCount: state.processedCount + docs.length,
        animateRows: false,
      }
    }),
  finishProcessing: () =>
    set({
      phase: 'done',
      animateRows: false,
    }),
  approve: (id) => {
    const next = moveApproved(get(), [id])
    if (next.moved === 0) return
    set({
      flagged: next.flagged,
      completed: next.completed,
      approvedIds: next.approvedIds,
      toast: 'Document approved — check Orders to confirm alignment',
    })
  },
  approveAboveMapping: (threshold, notifyNone = true) => {
    const state = get()
    const ids = state.flagged
      .filter((doc) => (state.mappingResults[doc.id]?.ensemble ?? 0) >= threshold)
      .map((doc) => doc.id)
    const next = moveApproved(state, ids)
    if (next.moved === 0) {
      if (notifyNone) set({ toast: 'No remaining documents at that confidence' })
      return 0
    }
    set({
      flagged: next.flagged,
      completed: next.completed,
      approvedIds: next.approvedIds,
      toast: `${next.moved} approved at ≥${Math.round(threshold * 100)}%. ${next.flagged.length} still need review.`,
    })
    return next.moved
  },
  startCorrect: (id) => set({ correctingId: id }),
  closeCorrect: () => set({ correctingId: null }),
  saveCorrection: () =>
    set({
      toast: 'Correction saved (demo)',
      correctingId: null,
    }),
  updateDocumentField: (id, field, value) =>
    set((state) => {
      const patch = (doc: ProcurementDocument) =>
        doc.id === id ? applyField(doc, field, value) : doc
      return {
        flagged: state.flagged.map(patch),
        completed: state.completed.map(patch),
        currentDoc: state.currentDoc ? patch(state.currentDoc) : null,
      }
    }),
  setMappingRunning: (step) => set({ mappingStatus: 'running', mappingStep: step }),
  setMappingResults: (results) =>
    set((state) => ({
      mappingStatus: 'done' as const,
      mappingStep: 'Quorum complete',
      mappingPass: state.mappingPass + 1,
      mappingResults: results,
      flagged: state.flagged.map((doc) => {
        const result = results[doc.id]
        if (!result) return doc
        return {
          ...doc,
          fieldConfidence: result.fieldConfidence,
          overallConfidence: result.ensemble,
        }
      }),
    })),
  setToast: (message) => set({ toast: message }),
  createDashboard: () =>
    set((state) => {
      const n = state.dashboards.length + 1
      const dashboard: SavedDashboard = {
        id: `dashboard-${Date.now()}`,
        name: `Dashboard ${n}`,
        description: 'Empty dashboard — add graphs from chat.',
        graphIds: [],
      }
      return {
        dashboards: [...state.dashboards, dashboard],
        selectedAskId: dashboard.id,
        askDraft: false,
        chatMessages: [
          ...state.chatMessages,
          {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            text: `Created ${dashboard.name}. Ask for a chart to add it here.`,
          },
        ],
      }
    }),
  startNewGraph: () =>
    set((state) => ({
      askDraft: true,
      selectedAskId: null,
      chatMessages: [
        ...state.chatMessages,
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          text: 'What should this graph show? Try spend by country, unit price, fill rate, backorders, or price variance — it will be added to the dashboard.',
        },
      ],
    })),
  selectAskItem: (id) => set({ selectedAskId: id, askDraft: false }),
  deleteGraph: (id) =>
    set((state) => ({
      graphs: state.graphs.filter((graph) => graph.id !== id),
      dashboards: state.dashboards.map((dashboard) => {
        const graphIds = dashboard.graphIds.filter((graphId) => graphId !== id)
        return {
          ...dashboard,
          graphIds,
          description:
            graphIds.length === 0
              ? 'Empty dashboard — add graphs from chat.'
              : `${graphIds.length} graphs`,
        }
      }),
      selectedAskId: state.selectedAskId === id ? null : state.selectedAskId,
    })),
  deleteDashboard: (id) =>
    set((state) => ({
      dashboards: state.dashboards.filter((dashboard) => dashboard.id !== id),
      graphs: state.graphs.map((graph) =>
        graph.dashboardId === id ? { ...graph, dashboardId: undefined } : graph,
      ),
      selectedAskId: state.selectedAskId === id ? null : state.selectedAskId,
    })),
  addChat: (role, text) =>
    set((state) => ({
      chatMessages: [
        ...state.chatMessages,
        { id: `msg-${Date.now()}-${role}`, role, text },
      ],
    })),
  saveGraphFromQuery: (question, kind, supplier) =>
    set((state) => {
      const meta = graphMeta(kind, question, supplier)
      const graph: SavedGraph = {
        id: `graph-${Date.now()}`,
        name: meta.name,
        description: meta.description,
        question,
        kind,
        supplier,
      }

      let dashboards = state.dashboards
      const selectedDash = dashboards.find((dashboard) => dashboard.id === state.selectedAskId)
      const selectedGraph = state.graphs.find((item) => item.id === state.selectedAskId)
      let target =
        selectedDash ??
        dashboards.find((dashboard) => dashboard.id === selectedGraph?.dashboardId) ??
        dashboards[dashboards.length - 1]

      if (!target) {
        target = {
          id: `dashboard-${Date.now()}`,
          name: 'Dashboard 1',
          description: 'Empty dashboard — add graphs from chat.',
          graphIds: [],
        }
        dashboards = [target]
      }

      graph.dashboardId = target.id
      dashboards = dashboards.map((dashboard) =>
        dashboard.id === target.id
          ? {
              ...dashboard,
              graphIds: [...dashboard.graphIds, graph.id],
              description: `${dashboard.graphIds.length + 1} graphs`,
            }
          : dashboard,
      )

      return {
        graphs: [...state.graphs, graph],
        dashboards,
        selectedAskId: target.id,
        askDraft: false,
        chatMessages: [
          ...state.chatMessages,
          {
            id: `msg-${Date.now()}-a`,
            role: 'assistant' as const,
            text: `Added “${graph.name}” to ${target.name}.`,
          },
        ],
      }
    }),
  reset: () => set({ ...initial }),
}))
