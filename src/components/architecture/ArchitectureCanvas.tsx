import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Bot } from 'lucide-react'
import {
  ARCHITECTURE_EDGES,
  LAYER_META,
  nodesForLayer,
  nodesForSourceGroup,
  type ArchitectureNode as ArchNode,
} from '../../data/architecture'
import { ArchitectureNode } from './ArchitectureNode'
import { buildDrawPaths, type Box } from './edgePath'

interface ArchitectureCanvasProps {
  overview: boolean
  activeNodeIds: Set<string>
  activeEdgeIds: Set<string>
  triggerNodeIds: Set<string>
}

export function ArchitectureCanvas({
  overview,
  activeNodeIds,
  activeEdgeIds,
  triggerNodeIds,
}: ArchitectureCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const nodeEls = useRef(new Map<string, HTMLDivElement>())
  const refCbs = useRef(new Map<string, (el: HTMLDivElement | null) => void>())
  const [boxes, setBoxes] = useState<Record<string, Box>>({})

  const setNodeRef = useCallback((id: string) => {
    let cb = refCbs.current.get(id)
    if (!cb) {
      cb = (el: HTMLDivElement | null) => {
        if (el) nodeEls.current.set(id, el)
        else nodeEls.current.delete(id)
      }
      refCbs.current.set(id, cb)
    }
    return cb
  }, [])

  const measure = useCallback(() => {
    const svg = svgRef.current
    if (!svg) return
    const origin = svg.getBoundingClientRect()
    const boxes: Record<string, Box> = {}
    for (const [id, el] of nodeEls.current) {
      const r = el.getBoundingClientRect()
      boxes[id] = {
        left: r.left - origin.left,
        top: r.top - origin.top,
        width: r.width,
        height: r.height,
        right: r.right - origin.left,
        bottom: r.bottom - origin.top,
      }
    }
    setBoxes(boxes)
  }, [])

  useLayoutEffect(() => {
    measure()
    const frame = window.requestAnimationFrame(measure)
    const wrap = wrapRef.current
    const svg = svgRef.current
    const observer = new ResizeObserver(measure)
    if (wrap) observer.observe(wrap)
    if (svg) observer.observe(svg)
    window.addEventListener('resize', measure)
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  const drawPaths = useMemo(
    () => buildDrawPaths(ARCHITECTURE_EDGES, boxes, overview ? null : activeEdgeIds),
    [boxes, overview, activeEdgeIds],
  )

  function nodeState(id: string) {
    if (overview) return { active: false, dimmed: false }
    const active = activeNodeIds.has(id)
    return { active, dimmed: !active }
  }

  function renderNode(node: ArchNode, compact = false) {
    const { active, dimmed } = nodeState(node.id)
    return (
      <ArchitectureNode
        key={node.id}
        node={node}
        active={active}
        dimmed={dimmed}
        trigger={!overview && triggerNodeIds.has(node.id)}
        compact={compact}
        nodeRef={setNodeRef(node.id)}
      />
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div ref={wrapRef} className="relative min-h-full px-1 pb-4">
        <svg
          ref={svgRef}
          className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
          aria-hidden
        >
          <defs>
            <marker
              id="arch-arrow"
              viewBox="0 0 10 10"
              markerWidth="9"
              markerHeight="9"
              refX="10"
              refY="5"
              orient="auto"
              markerUnits="userSpaceOnUse"
              overflow="visible"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
            </marker>
          </defs>
          {drawPaths.map((path) => (
            <path
              key={path.id}
              d={path.d}
              fill="none"
              stroke={overview ? '#9bb3c4' : '#081e32'}
              strokeWidth={overview ? 1 : 1.6}
              opacity={overview ? 0.5 : 0.95}
              markerEnd={path.marker ? 'url(#arch-arrow)' : undefined}
            />
          ))}
        </svg>

        <div className="relative flex flex-col gap-5 pt-1">
          <section className="flex flex-wrap items-start gap-x-8 gap-y-4">
            <div className="shrink-0">
              <p className="relative z-20 mb-2 text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
                External data sources
              </p>
              <div className="flex flex-wrap gap-2">
                {nodesForSourceGroup('external').map((node) => renderNode(node))}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="relative z-20 mb-2 text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
                Data platform (unified stores)
              </p>
              <div className="flex flex-wrap gap-2">
                {nodesForLayer('platform').map((node) => renderNode(node))}
              </div>
            </div>
          </section>

          <section className="flex items-start gap-3">
            <p className="relative z-20 w-[108px] shrink-0 pt-2 text-[10px] leading-tight font-semibold tracking-[0.14em] text-muted uppercase">
              Internal systems (fragmented)
            </p>
            <div className="flex min-w-0 flex-1 flex-wrap gap-2">
              {nodesForSourceGroup('internal').map((node) => renderNode(node))}
            </div>
          </section>

          {LAYER_META.filter((layer) => layer.id !== 'sources' && layer.id !== 'platform').map(
            (layer) => {
              const isAgents = layer.id === 'agents'
              return (
                <section
                  key={layer.id}
                  className={`relative flex items-start gap-3 ${isAgents ? 'px-2 py-2.5' : ''}`}
                >
                  {isAgents && (
                    <div className="pointer-events-none absolute inset-0 z-0 rounded-xl bg-teal-light/80 ring-1 ring-teal" />
                  )}
                  <p
                    className={`relative z-20 w-[108px] shrink-0 pt-2 text-[10px] leading-tight font-semibold tracking-[0.14em] uppercase ${
                      isAgents ? 'text-ink' : 'text-muted'
                    }`}
                  >
                    {isAgents && <Bot className="mb-1 size-3.5 text-ink" />}
                    {layer.label}
                  </p>
                  <div
                    className={
                      isAgents || layer.id === 'middleware'
                        ? 'flex min-w-0 flex-1 flex-nowrap gap-1.5'
                        : 'flex min-w-0 flex-1 flex-wrap gap-2'
                    }
                  >
                    {nodesForLayer(layer.id).map((node) => renderNode(node, isAgents))}
                  </div>
                </section>
              )
            },
          )}
        </div>
      </div>
    </div>
  )
}
