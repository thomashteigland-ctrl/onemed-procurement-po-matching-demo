import { ARCHITECTURE_NODES, type ArchitectureLayer } from '../../data/architecture'

type Side = 'top' | 'bottom' | 'left' | 'right'

export interface Box {
  left: number
  top: number
  width: number
  height: number
  right: number
  bottom: number
}

export interface RoutedEdge {
  x1: number
  y1: number
  x2: number
  y2: number
  fromSide: Side
  toSide: Side
}

const LAYER_ORDER: Record<ArchitectureLayer, number> = {
  sources: 0,
  platform: 0,
  middleware: 2,
  agents: 3,
  dashboard: 4,
}

const NODE_BY_ID = Object.fromEntries(ARCHITECTURE_NODES.map((node) => [node.id, node]))

function visualBand(id: string) {
  const node = NODE_BY_ID[id]
  if (!node) return 0
  if (node.group === 'external' || node.layer === 'platform') return 0
  if (node.group === 'internal') return 1
  if (node.layer === 'middleware') return 2
  if (node.layer === 'agents') return 3
  if (node.layer === 'dashboard') return 4
  return LAYER_ORDER[node.layer] ?? 0
}

function centerX(box: Box) {
  return box.left + box.width / 2
}

function centerY(box: Box) {
  return box.top + box.height / 2
}

const SIDE_ENTRY = new Set(['dash-documents', 'dash-orders'])

function pickSides(fromId: string, toId: string, from: Box, to: Box): { from: Side; to: Side } {
  const dx = centerX(to) - centerX(from)
  const dy = centerY(to) - centerY(from)
  const overlapY = Math.min(from.bottom, to.bottom) - Math.max(from.top, to.top)
  const overlapX = Math.min(from.right, to.right) - Math.max(from.left, to.left)
  const sideBySide = overlapY > Math.min(from.height, to.height) * 0.35
  const stacked = overlapX > Math.min(from.width, to.width) * 0.35

  if (SIDE_ENTRY.has(toId)) {
    return dx >= 0 ? { from: 'right', to: 'left' } : { from: 'left', to: 'right' }
  }

  const fromLayer = visualBand(fromId)
  const toLayer = visualBand(toId)

  if (fromLayer === toLayer) {
    if (sideBySide || Math.abs(dx) >= Math.abs(dy)) {
      return dx >= 0 ? { from: 'right', to: 'left' } : { from: 'left', to: 'right' }
    }
    return dy >= 0 ? { from: 'bottom', to: 'top' } : { from: 'top', to: 'bottom' }
  }

  if (sideBySide && !stacked && Math.abs(dx) > Math.abs(dy)) {
    return dx >= 0 ? { from: 'right', to: 'left' } : { from: 'left', to: 'right' }
  }

  return fromLayer < toLayer ? { from: 'bottom', to: 'top' } : { from: 'top', to: 'bottom' }
}

function slotT(index: number, count: number) {
  if (count <= 1) return 0.5
  return 0.22 + (0.56 * index) / (count - 1)
}

function portPoint(box: Box, side: Side, t: number, intoBox = 0) {
  const alongX = box.left + box.width * t
  const alongY = box.top + box.height * t
  switch (side) {
    case 'top':
      return { x: alongX, y: box.top + intoBox }
    case 'bottom':
      return { x: alongX, y: box.bottom - intoBox }
    case 'left':
      return { x: box.left + intoBox, y: alongY }
    case 'right':
      return { x: box.right - intoBox, y: alongY }
  }
}

function outward(x: number, y: number, side: Side, amount: number) {
  switch (side) {
    case 'top':
      return { x, y: y - amount }
    case 'bottom':
      return { x, y: y + amount }
    case 'left':
      return { x: x - amount, y }
    case 'right':
      return { x: x + amount, y }
  }
}

export function routeEdges(
  edges: { id: string; from: string; to: string }[],
  boxes: Record<string, Box>,
): Record<string, RoutedEdge> {
  const ready: { id: string; from: string; to: string; fromSide: Side; toSide: Side }[] = []

  for (const edge of edges) {
    const from = boxes[edge.from]
    const to = boxes[edge.to]
    if (!from || !to) continue
    const sides = pickSides(edge.from, edge.to, from, to)
    ready.push({ ...edge, fromSide: sides.from, toSide: sides.to })
  }

  const fromT = new Map<string, number>()
  const toT = new Map<string, number>()

  const fromGroups = new Map<string, typeof ready>()
  const toGroups = new Map<string, typeof ready>()
  for (const edge of ready) {
    const fk = `${edge.from}:${edge.fromSide}`
    const tk = `${edge.to}:${edge.toSide}`
    const fg = fromGroups.get(fk) ?? []
    fg.push(edge)
    fromGroups.set(fk, fg)
    const tg = toGroups.get(tk) ?? []
    tg.push(edge)
    toGroups.set(tk, tg)
  }

  for (const [key, group] of fromGroups) {
    const side = key.split(':')[1] as Side
    const vertical = side === 'top' || side === 'bottom'
    group.sort((a, b) => {
      const aBox = boxes[a.to]
      const bBox = boxes[b.to]
      return vertical ? centerX(aBox) - centerX(bBox) : centerY(aBox) - centerY(bBox)
    })
    group.forEach((edge, index) => fromT.set(edge.id, slotT(index, group.length)))
  }

  for (const [key, group] of toGroups) {
    const side = key.split(':')[1] as Side
    const vertical = side === 'top' || side === 'bottom'
    group.sort((a, b) => {
      const aBox = boxes[a.from]
      const bBox = boxes[b.from]
      return vertical ? centerX(aBox) - centerX(bBox) : centerY(aBox) - centerY(bBox)
    })
    group.forEach((edge, index) => toT.set(edge.id, slotT(index, group.length)))
  }

  const next: Record<string, RoutedEdge> = {}
  for (const edge of ready) {
    const fromBox = boxes[edge.from]
    const toBox = boxes[edge.to]
    const start = portPoint(fromBox, edge.fromSide, fromT.get(edge.id) ?? 0.5)
    const end = portPoint(toBox, edge.toSide, toT.get(edge.id) ?? 0.5)
    next[edge.id] = {
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      fromSide: edge.fromSide,
      toSide: edge.toSide,
    }
  }
  return next
}

export function edgePath(edge: RoutedEdge) {
  const stub = 10
  const dist = Math.hypot(edge.x2 - edge.x1, edge.y2 - edge.y1)
  const curve = Math.min(72, Math.max(20, dist * 0.38))
  const startStub = outward(edge.x1, edge.y1, edge.fromSide, stub)
  const endStub = outward(edge.x2, edge.y2, edge.toSide, stub)
  const c1 = outward(startStub.x, startStub.y, edge.fromSide, curve)
  const c2 = outward(endStub.x, endStub.y, edge.toSide, curve)
  return `M ${edge.x1} ${edge.y1} L ${startStub.x} ${startStub.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${endStub.x} ${endStub.y} L ${edge.x2} ${edge.y2}`
}

export interface DrawPath {
  id: string
  d: string
  marker: boolean
}

const BUS_GAP = 16

function faninBus(froms: Box[], to: Box): { trunk: string; into: string; stubs: string[] } {
  const toCx = centerX(to)
  const toCy = centerY(to)
  const rowSlop = Math.max(to.height, ...froms.map((box) => box.height)) * 0.8
  const below = froms.filter((box) => centerY(box) > toCy + rowSlop)
  const above = froms.filter((box) => centerY(box) < toCy - rowSlop)
  const peers = froms.filter((box) => Math.abs(centerY(box) - toCy) <= rowSlop)

  const collectBelow = below.length > 0 || (peers.length > 0 && above.length === 0)
  if (collectBelow || above.length > 0) {
    const gapTop = collectBelow
      ? Math.max(to.bottom, ...peers.map((box) => box.bottom))
      : Math.max(...above.map((box) => box.bottom))
    const gapBottom = collectBelow
      ? below.length
        ? Math.min(...below.map((box) => box.top))
        : gapTop + BUS_GAP * 2
      : Math.min(to.top, ...peers.map((box) => box.top))
    const busY =
      gapBottom > gapTop + 8 ? (gapTop + Math.min(gapBottom, gapTop + 32)) / 2 : gapTop + BUS_GAP
    const xs = [toCx, ...froms.map((box) => centerX(box))]
    const trunk = `M ${Math.min(...xs)} ${busY} L ${Math.max(...xs)} ${busY}`
    const into = collectBelow
      ? `M ${toCx} ${busY} L ${toCx} ${to.bottom}`
      : `M ${toCx} ${busY} L ${toCx} ${to.top}`
    const stubs = froms.map((box) => {
      const x = centerX(box)
      return centerY(box) > busY
        ? `M ${x} ${box.top} L ${x} ${busY}`
        : `M ${x} ${box.bottom} L ${x} ${busY}`
    })
    return { trunk, into, stubs }
  }

  const fromLeft = froms.reduce((sum, box) => sum + centerX(box), 0) / froms.length < toCx
  const busX = fromLeft ? to.left - BUS_GAP : to.right + BUS_GAP
  const ys = [toCy, ...froms.map((box) => centerY(box))]
  const trunk = `M ${busX} ${Math.min(...ys)} L ${busX} ${Math.max(...ys)}`
  const into = fromLeft ? `M ${busX} ${toCy} L ${to.left} ${toCy}` : `M ${busX} ${toCy} L ${to.right} ${toCy}`
  const stubs = froms.map((box) => {
    const y = centerY(box)
    const startX = fromLeft ? box.right : box.left
    return `M ${startX} ${y} L ${busX} ${y}`
  })
  return { trunk, into, stubs }
}

function fanoutBus(from: Box, tos: Box[], fromBand: number, toBand: number): { trunk: string; stubs: string[] } {
  const fromCx = centerX(from)
  const fromCy = centerY(from)
  const sameBand = fromBand === toBand

  if (sameBand) {
    const targetsRight = tos.every((box) => centerX(box) >= fromCx)
    const busX = targetsRight
      ? Math.min(...tos.map((box) => box.left)) - BUS_GAP
      : Math.max(...tos.map((box) => box.right)) + BUS_GAP
    const startX = targetsRight ? from.right : from.left
    const ys = [fromCy, ...tos.map((box) => centerY(box))]
    const trunk = `M ${startX} ${fromCy} L ${busX} ${fromCy} M ${busX} ${Math.min(...ys)} L ${busX} ${Math.max(...ys)}`
    const stubs = tos.map((box) => {
      const y = centerY(box)
      const endX = targetsRight ? box.left : box.right
      return `M ${busX} ${y} L ${endX} ${y}`
    })
    return { trunk, stubs }
  }

  const downward = toBand > fromBand
  if (downward) {
    const busY = Math.min(...tos.map((box) => box.top)) - BUS_GAP
    const xs = [fromCx, ...tos.map((box) => centerX(box))]
    const trunk = `M ${fromCx} ${from.bottom} L ${fromCx} ${busY} M ${Math.min(...xs)} ${busY} L ${Math.max(...xs)} ${busY}`
    const stubs = tos.map((box) => `M ${centerX(box)} ${busY} L ${centerX(box)} ${box.top}`)
    return { trunk, stubs }
  }

  const busY = Math.max(...tos.map((box) => box.bottom)) + BUS_GAP
  const xs = [fromCx, ...tos.map((box) => centerX(box))]
  const trunk = `M ${fromCx} ${from.top} L ${fromCx} ${busY} M ${Math.min(...xs)} ${busY} L ${Math.max(...xs)} ${busY}`
  const stubs = tos.map((box) => `M ${centerX(box)} ${busY} L ${centerX(box)} ${box.bottom}`)
  return { trunk, stubs }
}

export function buildDrawPaths(
  edges: { id: string; from: string; to: string }[],
  boxes: Record<string, Box>,
  visibleIds: Set<string> | null,
): DrawPath[] {
  const visible = edges.filter((edge) => {
    if (!boxes[edge.from] || !boxes[edge.to]) return false
    if (visibleIds && !visibleIds.has(edge.id)) return false
    return true
  })

  const groups = new Map<string, typeof visible>()
  for (const edge of visible) {
    if (SIDE_ENTRY.has(edge.to)) continue
    const key = `${edge.from}=>${visualBand(edge.to)}`
    const group = groups.get(key) ?? []
    group.push(edge)
    groups.set(key, group)
  }

  const used = new Set<string>()
  const paths: DrawPath[] = []

  for (const [key, group] of groups) {
    if (group.length < 2) continue
    const fromBox = boxes[group[0].from]
    const toBoxes = group.map((edge) => boxes[edge.to])
    const { trunk, stubs } = fanoutBus(
      fromBox,
      toBoxes,
      visualBand(group[0].from),
      visualBand(group[0].to),
    )
    paths.push({ id: `${key}-trunk`, d: trunk, marker: false })
    stubs.forEach((d, index) => {
      paths.push({ id: `${key}-stub-${group[index].id}`, d, marker: true })
    })
    group.forEach((edge) => used.add(edge.id))
  }

  const fanins = new Map<string, typeof visible>()
  for (const edge of visible) {
    if (used.has(edge.id) || SIDE_ENTRY.has(edge.to)) continue
    const group = fanins.get(edge.to) ?? []
    group.push(edge)
    fanins.set(edge.to, group)
  }

  for (const [toId, group] of fanins) {
    if (group.length < 2) continue
    const { trunk, into, stubs } = faninBus(
      group.map((edge) => boxes[edge.from]),
      boxes[toId],
    )
    paths.push({ id: `${toId}-fanin-trunk`, d: trunk, marker: false })
    paths.push({ id: `${toId}-fanin-into`, d: into, marker: true })
    stubs.forEach((d, index) => {
      paths.push({ id: `${toId}-fanin-stub-${group[index].id}`, d, marker: false })
    })
    group.forEach((edge) => used.add(edge.id))
  }

  const singles = routeEdges(
    visible.filter((edge) => !used.has(edge.id)),
    boxes,
  )
  for (const [id, routed] of Object.entries(singles)) {
    paths.push({ id, d: edgePath(routed), marker: true })
  }

  return paths
}
