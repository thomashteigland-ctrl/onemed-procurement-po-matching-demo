import { useEffect, useRef, useState } from 'react'
import { BarChart3, LayoutDashboard, Plus, Send, Trash2 } from 'lucide-react'
import { DataChart } from '../components/DataChart'
import { SUPPLIERS } from '../data/documents'
import { matchQuery, mentionedSupplier } from '../lib/queryMatcher'
import { useDemoStore } from '../store/demoStore'
import type { SavedDashboard, SavedGraph } from '../types'

const SUGGESTIONS = [
  'Spend by supplier per country',
  'Average unit price per article across suppliers',
  'Fill rate and on-time delivery per supplier',
  'Backorder exposure: open PO lines by value and age',
  'Price variance against contract, by supplier',
]

function SidebarItem({
  active,
  onSelect,
  onDelete,
  name,
  description,
  icon,
}: {
  active: boolean
  onSelect: () => void
  onDelete: () => void
  name: string
  description: string
  icon: 'graph' | 'dashboard'
}) {
  return (
    <div
      className={`group relative rounded-lg px-2.5 py-2 ${
        active ? 'bg-teal-light' : 'hover:bg-paper'
      }`}
    >
      <button type="button" onClick={onSelect} className="w-full pr-7 text-left">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          {icon === 'dashboard' ? (
            <LayoutDashboard className="size-3.5 text-muted" />
          ) : (
            <BarChart3 className="size-3.5 text-muted" />
          )}
          {name}
        </span>
        <span className="mt-0.5 line-clamp-2 text-[11px] text-muted">{description}</span>
      </button>
      <button
        type="button"
        aria-label={`Delete ${name}`}
        onClick={(event) => {
          event.stopPropagation()
          onDelete()
        }}
        className="absolute top-2 right-2 rounded p-1 text-muted opacity-0 hover:bg-white hover:text-rose group-hover:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  )
}

export function TalkToDataScreen() {
  const completed = useDemoStore((s) => s.completed)
  const flagged = useDemoStore((s) => s.flagged)
  const records = [...completed, ...flagged]
  const graphs = useDemoStore((s) => s.graphs)
  const dashboards = useDemoStore((s) => s.dashboards)
  const selectedAskId = useDemoStore((s) => s.selectedAskId)
  const askDraft = useDemoStore((s) => s.askDraft)
  const chatMessages = useDemoStore((s) => s.chatMessages)
  const createDashboard = useDemoStore((s) => s.createDashboard)
  const startNewGraph = useDemoStore((s) => s.startNewGraph)
  const selectAskItem = useDemoStore((s) => s.selectAskItem)
  const deleteGraph = useDemoStore((s) => s.deleteGraph)
  const deleteDashboard = useDemoStore((s) => s.deleteDashboard)
  const addChat = useDemoStore((s) => s.addChat)
  const saveGraphFromQuery = useDemoStore((s) => s.saveGraphFromQuery)

  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages.length])

  const selectedGraph = graphs.find((graph) => graph.id === selectedAskId)
  const selectedDashboard = dashboards.find((dashboard) => dashboard.id === selectedAskId)
  const dashboardGraphs = selectedDashboard
    ? graphs.filter((graph) => selectedDashboard.graphIds.includes(graph.id))
    : []

  function ask(question: string) {
    const trimmed = question.trim()
    if (!trimmed) return
    addChat('user', trimmed)
    const kind = matchQuery(trimmed)
    const supplier = mentionedSupplier(trimmed, SUPPLIERS)
    if (kind === 'unknown') {
      addChat('assistant', 'Try spend by country, unit price, fill rate, backorders, or price variance.')
    } else {
      saveGraphFromQuery(trimmed, kind, supplier)
    }
    setInput('')
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 p-4 lg:grid-cols-[16.5rem_minmax(0,1fr)_20rem]">
      <aside className="flex min-h-0 flex-col rounded-xl border border-line bg-white">
        <div className="flex gap-2 border-b border-line p-3">
          <button
            type="button"
            onClick={startNewGraph}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-teal-dark px-2 py-1.5 text-[11px] font-semibold text-white"
          >
            <Plus className="size-3.5" />
            New graph
          </button>
          <button
            type="button"
            onClick={createDashboard}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-line px-2 py-1.5 text-[11px] font-semibold text-ink"
          >
            <Plus className="size-3.5" />
            New dashboard
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-2">
          {dashboards.length === 0 && graphs.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-muted">
              No graphs yet. Create one from chat.
            </p>
          )}
          {dashboards.length > 0 && (
            <p className="px-2 pt-1 pb-1 text-[10px] font-semibold tracking-wide text-muted uppercase">
              Dashboards
            </p>
          )}
          {dashboards.map((dashboard: SavedDashboard) => (
            <SidebarItem
              key={dashboard.id}
              icon="dashboard"
              active={selectedAskId === dashboard.id}
              name={dashboard.name}
              description={dashboard.description}
              onSelect={() => selectAskItem(dashboard.id)}
              onDelete={() => deleteDashboard(dashboard.id)}
            />
          ))}
          {graphs.length > 0 && (
            <p className="px-2 pt-3 pb-1 text-[10px] font-semibold tracking-wide text-muted uppercase">
              Graphs
            </p>
          )}
          {graphs.map((graph: SavedGraph) => (
            <SidebarItem
              key={graph.id}
              icon="graph"
              active={selectedAskId === graph.id}
              name={graph.name}
              description={graph.description}
              onSelect={() => selectAskItem(graph.id)}
              onDelete={() => deleteGraph(graph.id)}
            />
          ))}
        </div>
      </aside>

      <section className="flex min-h-0 flex-col rounded-xl border border-line bg-white p-4">
        {records.length === 0 && (
          <p className="m-auto text-sm text-muted">Run intake first so charts have data.</p>
        )}
        {records.length > 0 && askDraft && !selectedGraph && !selectedDashboard && (
          <p className="m-auto max-w-sm text-center text-sm text-muted">
            Click a suggested question in chat — the graph is added to the dashboard.
          </p>
        )}
        {records.length > 0 && selectedGraph && (
          <DataChart graph={selectedGraph} completed={records} />
        )}
        {records.length > 0 && selectedDashboard && (
          <div className="min-h-0 flex-1 overflow-auto">
            <h2 className="mb-3 text-lg font-semibold text-ink">{selectedDashboard.name}</h2>
            {dashboardGraphs.length === 0 ? (
              <p className="text-sm text-muted">Ask chat to add a graph to this dashboard.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {dashboardGraphs.map((graph) => (
                  <button
                    key={graph.id}
                    type="button"
                    onClick={() => selectAskItem(graph.id)}
                    className="h-72 rounded-lg border border-line p-3 text-left hover:border-teal"
                  >
                    <DataChart graph={graph} completed={records} compact />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {records.length > 0 && !askDraft && !selectedGraph && !selectedDashboard && (
          <p className="m-auto text-sm text-muted">Pick a graph or create a new one.</p>
        )}
      </section>

      <aside className="flex min-h-0 flex-col rounded-xl border border-line bg-white">
        <p className="border-b border-line px-3 py-2 text-xs font-semibold tracking-wide text-muted uppercase">
          Chat
        </p>
        <div className="min-h-0 flex-1 space-y-2 overflow-auto p-3">
          {chatMessages.length === 0 && (
            <div className="space-y-2">
              <p className="text-[11px] text-muted">Suggested questions</p>
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => ask(suggestion)}
                  className="block w-full rounded-lg border border-line bg-paper px-3 py-2 text-left text-xs text-ink-soft hover:border-teal hover:text-ink"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          {chatMessages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[95%] rounded-2xl px-3 py-2 text-sm ${
                message.role === 'user'
                  ? 'ml-auto bg-teal-dark text-white'
                  : 'bg-paper text-ink'
              }`}
            >
              {message.text}
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <form
          className="border-t border-line p-3"
          onSubmit={(event) => {
            event.preventDefault()
            ask(input)
          }}
        >
          {chatMessages.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => ask(suggestion)}
                  className="rounded-full border border-line bg-paper px-2.5 py-1 text-left text-[11px] text-ink-soft hover:border-teal hover:text-ink"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Or click a suggestion above…"
              className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-teal"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-teal-dark px-3 text-white"
            >
              <Send className="size-4" />
            </button>
          </div>
        </form>
      </aside>
    </div>
  )
}
