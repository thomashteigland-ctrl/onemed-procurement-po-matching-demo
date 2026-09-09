import type { ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ENTITY_LABEL, formatCompactMoney, formatMoney } from '../lib/format'
import {
  avgUnitPrice,
  backorderRows,
  fillRateBySupplier,
  priceVarianceBySupplier,
  spendBySupplierEntity,
} from '../lib/queryMatcher'
import type { CountryEntity, Currency, ProcurementDocument, SavedGraph } from '../types'

const NAVY = '#004785'
const GREEN = '#7fb124'
const AMBER = '#b45309'
const SLATE = '#3a5166'
const MUTED = '#5c7388'
const PALETTE = [NAVY, GREEN, AMBER, SLATE, '#6b8cae', '#9bbf4a', '#2a6f97', '#c4a35a']
const ENTITY_COLORS: Partial<Record<CountryEntity, string>> = {
  SE: NAVY,
  NO: GREEN,
  DK: AMBER,
  FI: SLATE,
  EE: '#6b8cae',
}

/** Display-only FX so mixed Nordic currencies can share one axis. */
const EUR_FX: Record<Currency, number> = {
  EUR: 1,
  SEK: 0.087,
  NOK: 0.086,
  DKK: 0.134,
}

function toEur(amount: number, currency: Currency): number {
  return amount * EUR_FX[currency]
}

function shortSupplier(name: string) {
  return name.replace(/ (AB|AS|A\/S|Oy|OÜ|GmbH)$/, '').split(' ')[0]
}

function shortProduct(name: string) {
  return name.replace(/,.*$/, '').replace(/ sterile$/i, '')
}

const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: '1px solid #d0ddc8',
  background: '#fff',
}

function ChartShell({
  title,
  note,
  compact,
  kpis,
  children,
}: {
  title: string
  note?: string
  compact: boolean
  kpis?: { label: string; value: string; hint?: string }[]
  children: ReactNode
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="mb-0.5 text-xs font-semibold tracking-wide text-muted uppercase">{title}</p>
      {note && !compact && <p className="mb-2 text-[11px] text-muted">{note}</p>}
      {kpis && kpis.length > 0 && !compact && (
        <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-lg border border-line bg-paper px-3 py-2">
              <p className="text-[10px] font-semibold tracking-wide text-muted uppercase">
                {kpi.label}
              </p>
              <p className="mt-0.5 font-semibold text-lg text-ink tabular-nums">{kpi.value}</p>
              {kpi.hint && <p className="text-[11px] text-muted">{kpi.hint}</p>}
            </div>
          ))}
        </div>
      )}
      <div className={compact ? 'h-48 min-h-48' : 'min-h-64 flex-1'}>{children}</div>
    </div>
  )
}

function DonutCenter({
  viewBox,
  total,
  caption,
}: {
  viewBox?: { cx?: number; cy?: number }
  total: number
  caption: string
}) {
  const cx = viewBox?.cx
  const cy = viewBox?.cy
  if (cx == null || cy == null) return null
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-0.35em" className="fill-ink" fontSize="15" fontWeight={700}>
        {formatCompactMoney(total, 'EUR')}
      </tspan>
      <tspan x={cx} dy="1.4em" className="fill-muted" fontSize="10">
        {caption}
      </tspan>
    </text>
  )
}

export function DataChart({
  graph,
  completed,
  compact = false,
}: {
  graph: SavedGraph
  completed: ProcurementDocument[]
  compact?: boolean
}) {
  const spend = spendBySupplierEntity(completed, graph.supplier)
  const prices = avgUnitPrice(completed)
  const fill = fillRateBySupplier(completed)
  const backorders = backorderRows(completed)
  const variance = priceVarianceBySupplier(completed)
  const highlighted = graph.supplier
    ? spend.filter((row) => row.supplier === graph.supplier)
    : []

  if (graph.kind === 'unknown') {
    return <p className="text-sm text-muted">This question did not match a known chart.</p>
  }

  if (graph.kind === 'unitPrice') {
    const data = prices
      .map((row) => ({
        ...row,
        label: `${shortProduct(row.product)} · ${shortSupplier(row.supplier)} · ${row.entity}`,
        eur: Number(toEur(row.avgUnitPrice, row.currency).toFixed(3)),
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, compact ? 6 : 12)
    return (
      <ChartShell
        title={graph.name}
        note="Unit prices converted to EUR. Bars are the highest-volume article / supplier / market combinations."
        compact={compact}
        kpis={[
          {
            label: 'Articles compared',
            value: String(new Set(prices.map((row) => row.articleId)).size),
          },
          {
            label: 'Highest € / unit',
            value: data[0] ? formatMoney(data[0].eur, 'EUR', 2) : '—',
            hint: data[0] ? shortProduct(data[0].product) : undefined,
          },
        ]}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
          >
            <CartesianGrid stroke="#d0ddc8" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: MUTED }}
              tickFormatter={(value: number) => formatMoney(value, 'EUR', value < 1 ? 2 : 0)}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={compact ? 108 : 188}
              tick={{ fontSize: 10, fill: MUTED }}
            />
            <Tooltip
              formatter={(_value, _name, item) => {
                const row = item?.payload as (typeof data)[number] | undefined
                if (!row) return ''
                return formatMoney(row.avgUnitPrice, row.currency, 2)
              }}
              contentStyle={TOOLTIP_STYLE}
            />
            <Bar dataKey="eur" name="Unit price €" radius={[0, 4, 4, 0]} maxBarSize={22}>
              {data.map((row) => (
                <Cell
                  key={`${row.articleId}-${row.supplier}-${row.entity}`}
                  fill={ENTITY_COLORS[row.entity] ?? NAVY}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>
    )
  }

  if (graph.kind === 'fillRate') {
    const data = fill.map((row) => ({
      ...row,
      name: shortSupplier(row.supplier),
      fillPct: Math.round(row.fillRate * 100),
      onTimePct: Math.round(row.onTimeRate * 100),
    }))
    const avgFill =
      data.length === 0 ? 0 : Math.round(data.reduce((sum, row) => sum + row.fillPct, 0) / data.length)
    const avgOnTime =
      data.length === 0
        ? 0
        : Math.round(data.reduce((sum, row) => sum + row.onTimePct, 0) / data.length)
    const weakest = [...data].sort((a, b) => a.fillPct - b.fillPct)[0]
    return (
      <ChartShell
        title={graph.name}
        note="Fill rate is delivered vs ordered quantity. On-time is delivery notes on or before the expected date."
        compact={compact}
        kpis={[
          { label: 'Avg fill rate', value: `${avgFill}%` },
          { label: 'Avg on-time', value: `${avgOnTime}%` },
          {
            label: 'Weakest fill',
            value: weakest ? `${weakest.fillPct}%` : '—',
            hint: weakest?.name,
          },
        ]}
      >
        <div
          className={`grid h-full min-h-0 gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)]'}`}
        >
          {!compact && (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
                <PolarGrid stroke="#d0ddc8" />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: MUTED }} />
                <PolarRadiusAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: MUTED }}
                  angle={90}
                />
                <Radar
                  name="Fill rate"
                  dataKey="fillPct"
                  stroke={NAVY}
                  fill={NAVY}
                  fillOpacity={0.28}
                />
                <Radar
                  name="On-time"
                  dataKey="onTimePct"
                  stroke={GREEN}
                  fill={GREEN}
                  fillOpacity={0.22}
                />
                <Legend />
                <Tooltip formatter={(value) => `${Number(value ?? 0)}%`} contentStyle={TOOLTIP_STYLE} />
              </RadarChart>
            </ResponsiveContainer>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 8 }}>
              <CartesianGrid stroke="#d0ddc8" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: MUTED }} />
              <YAxis
                tick={{ fontSize: 11, fill: MUTED }}
                width={36}
                domain={[0, 100]}
                unit="%"
              />
              <Tooltip formatter={(value) => `${Number(value ?? 0)}%`} contentStyle={TOOLTIP_STYLE} />
              <Legend />
              <Bar
                dataKey="fillPct"
                name="Fill rate"
                fill={NAVY}
                radius={[4, 4, 0, 0]}
                maxBarSize={compact ? 28 : 40}
              />
              <Bar
                dataKey="onTimePct"
                name="On-time"
                fill={GREEN}
                radius={[4, 4, 0, 0]}
                maxBarSize={compact ? 28 : 40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartShell>
    )
  }

  if (graph.kind === 'backorder') {
    const bySupplier = new Map<string, { supplier: string; eur: number; lines: number }>()
    for (const row of backorders) {
      const current = bySupplier.get(row.supplier) ?? {
        supplier: row.supplier,
        eur: 0,
        lines: 0,
      }
      current.eur += toEur(row.value, row.currency)
      current.lines += 1
      bySupplier.set(row.supplier, current)
    }
    const supplierBars = [...bySupplier.values()]
      .map((row) => ({ ...row, name: shortSupplier(row.supplier), eur: Number(row.eur.toFixed(0)) }))
      .sort((a, b) => b.eur - a.eur)
    const scatter = [...backorders]
      .sort((a, b) => toEur(b.value, b.currency) - toEur(a.value, a.currency))
      .slice(0, 40)
      .map((row, index) => ({
        ...row,
        i: index,
        eur: Number(toEur(row.value, row.currency).toFixed(0)),
      }))
    const totalEur = supplierBars.reduce((sum, row) => sum + row.eur, 0)
    const oldest = scatter.reduce<(typeof scatter)[number] | undefined>(
      (max, row) => (!max || row.ageDays > max.ageDays ? row : max),
      undefined,
    )
    return (
      <ChartShell
        title={graph.name}
        note="Open PO lines still expected from the supplier. Value converted to EUR. Age is days past expected delivery."
        compact={compact}
        kpis={[
          { label: 'Open value', value: formatCompactMoney(totalEur, 'EUR') },
          { label: 'Open lines', value: String(backorders.length) },
          {
            label: 'Oldest line',
            value: oldest ? `${oldest.ageDays}d` : '—',
            hint: oldest ? shortProduct(oldest.product) : undefined,
          },
        ]}
      >
        <div
          className={`grid h-full min-h-0 gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={supplierBars}
              layout="vertical"
              margin={{ top: 8, right: 12, left: 8, bottom: 8 }}
            >
              <CartesianGrid stroke="#d0ddc8" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: MUTED }}
                tickFormatter={(value: number) => formatCompactMoney(value, 'EUR')}
              />
              <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11, fill: MUTED }} />
              <Tooltip
                formatter={(value) => formatMoney(Number(value ?? 0), 'EUR')}
                contentStyle={TOOLTIP_STYLE}
              />
              <Bar dataKey="eur" name="Open value €" fill={AMBER} radius={[0, 4, 4, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
          {!compact && (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 16, left: 8, bottom: 12 }}>
                <CartesianGrid stroke="#d0ddc8" />
                <XAxis
                  type="number"
                  dataKey="ageDays"
                  name="Age"
                  unit="d"
                  tick={{ fontSize: 11, fill: MUTED }}
                />
                <YAxis
                  type="number"
                  dataKey="eur"
                  name="Value"
                  tick={{ fontSize: 11, fill: MUTED }}
                  tickFormatter={(value: number) => formatCompactMoney(value, 'EUR')}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value, name) =>
                    name === 'Value'
                      ? formatMoney(Number(value ?? 0), 'EUR')
                      : `${Number(value ?? 0)} days`
                  }
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as (typeof scatter)[number] | undefined
                    return row ? `${row.poNumber} · ${shortProduct(row.product)}` : ''
                  }}
                />
                <Scatter name="Open lines" data={scatter} fill={NAVY} />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>
      </ChartShell>
    )
  }

  if (graph.kind === 'priceVariance') {
    const unique = [
      ...new Map(
        variance.map((row) => [`${row.supplier}-${row.articleId}-${row.currency}`, row]),
      ).values(),
    ]
    const data = unique
      .map((row) => ({
        ...row,
        label: `${shortProduct(row.product)} · ${shortSupplier(row.supplier)}`,
        variancePct: Number(row.variancePct.toFixed(1)),
      }))
      .slice(0, compact ? 6 : 12)
    const over = unique.filter((row) => row.variancePct > 0)
    const worst = unique[0]
    return (
      <ChartShell
        title={graph.name}
        note="Invoiced unit price vs contracted PO price. Positive means the supplier billed above contract."
        compact={compact}
        kpis={[
          { label: 'Lines over contract', value: String(over.length) },
          {
            label: 'Largest gap',
            value: worst ? `${worst.variancePct > 0 ? '+' : ''}${worst.variancePct.toFixed(0)}%` : '—',
            hint: worst ? shortProduct(worst.product) : undefined,
          },
        ]}
      >
        {data.length === 0 ? (
          <p className="m-auto text-sm text-muted">No price variances in the current batch.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
            >
              <CartesianGrid stroke="#d0ddc8" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: MUTED }}
                tickFormatter={(value: number) => `${value}%`}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={compact ? 100 : 160}
                tick={{ fontSize: 10, fill: MUTED }}
              />
              <ReferenceLine x={0} stroke={SLATE} />
              <Tooltip
                formatter={(value) => `${Number(value ?? 0) > 0 ? '+' : ''}${Number(value ?? 0)}%`}
                contentStyle={TOOLTIP_STYLE}
              />
              <Bar dataKey="variancePct" name="Variance" radius={[0, 4, 4, 0]} maxBarSize={28}>
                {data.map((row) => (
                  <Cell
                    key={`${row.supplier}-${row.articleId}-${row.currency}`}
                    fill={row.variancePct > 0 ? AMBER : GREEN}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartShell>
    )
  }

  const bySupplier = new Map<string, { name: string; supplier: string; eur: number }>()
  const entitySet = new Set<CountryEntity>()
  const stackedMap = new Map<string, { name: string; supplier: string } & Partial<Record<CountryEntity, number>>>()
  for (const row of spend) {
    const eur = toEur(row.spend, row.currency)
    entitySet.add(row.entity)
    const supplier = bySupplier.get(row.supplier) ?? {
      name: shortSupplier(row.supplier),
      supplier: row.supplier,
      eur: 0,
    }
    supplier.eur += eur
    bySupplier.set(row.supplier, supplier)
    const stacked = stackedMap.get(row.supplier) ?? {
      name: shortSupplier(row.supplier),
      supplier: row.supplier,
    }
    stacked[row.entity] = (stacked[row.entity] ?? 0) + Number(eur.toFixed(0))
    stackedMap.set(row.supplier, stacked)
  }
  const pieData = [...bySupplier.values()]
    .map((row) => ({ ...row, eur: Number(row.eur.toFixed(0)) }))
    .sort((a, b) => b.eur - a.eur)
  const entities = [...entitySet]
  const stackedData = [...stackedMap.values()].sort((a, b) => {
    const totalA = entities.reduce((sum, entity) => sum + (a[entity] ?? 0), 0)
    const totalB = entities.reduce((sum, entity) => sum + (b[entity] ?? 0), 0)
    return totalB - totalA
  })
  const totalEur = pieData.reduce((sum, row) => sum + row.eur, 0)
  const top = pieData[0]

  return (
    <ChartShell
      title={graph.name}
      note="Invoice spend converted to EUR so country entities can be compared on one chart."
      compact={compact}
      kpis={[
        { label: 'Total spend', value: formatCompactMoney(totalEur, 'EUR') },
        {
          label: 'Largest supplier',
          value: top?.name ?? '—',
          hint: top ? formatCompactMoney(top.eur, 'EUR') : undefined,
        },
        { label: 'Markets', value: String(entities.length) },
        ...(highlighted.length > 0
          ? highlighted.slice(0, 1).map((row) => ({
              label: ENTITY_LABEL[row.entity],
              value: formatMoney(row.spend, row.currency),
            }))
          : []),
      ]}
    >
      <div
        className={`grid h-full min-h-0 gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-[17rem_minmax(0,1fr)]'}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="eur"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={compact ? 32 : 52}
              outerRadius={compact ? 58 : 82}
              paddingAngle={2}
            >
              {pieData.map((row, index) => (
                <Cell key={row.supplier} fill={PALETTE[index % PALETTE.length]} />
              ))}
              <Label
                content={(props) => (
                  <DonutCenter
                    viewBox={props.viewBox as { cx?: number; cy?: number }}
                    total={totalEur}
                    caption="total €"
                  />
                )}
              />
            </Pie>
            <Tooltip
              formatter={(value) => formatMoney(Number(value ?? 0), 'EUR')}
              contentStyle={TOOLTIP_STYLE}
            />
            {!compact && <Legend wrapperStyle={{ fontSize: 11 }} />}
          </PieChart>
        </ResponsiveContainer>
        {!compact && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stackedData}
              layout="vertical"
              margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
            >
              <CartesianGrid stroke="#d0ddc8" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: MUTED }}
                tickFormatter={(value: number) => formatCompactMoney(value, 'EUR')}
              />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: MUTED }} />
              <Tooltip
                formatter={(value, name) => [
                  formatMoney(Number(value ?? 0), 'EUR'),
                  ENTITY_LABEL[name as CountryEntity] ?? name,
                ]}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend
                formatter={(value) => ENTITY_LABEL[value as CountryEntity] ?? value}
                wrapperStyle={{ fontSize: 11 }}
              />
              {entities.map((entity) => (
                <Bar
                  key={entity}
                  dataKey={entity}
                  name={entity}
                  stackId="spend"
                  fill={ENTITY_COLORS[entity] ?? MUTED}
                  radius={[0, 4, 4, 0]}
                  maxBarSize={28}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartShell>
  )
}
