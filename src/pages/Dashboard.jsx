import { useState, useMemo, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { useData } from '../hooks/useData.jsx'
import {
  YEAR_HEX, filterIncidents, getKPIByYear, getMonthlyTrend,
  getTopModalidades, getStolenObjects, getDayRisk, getHourlyRisk,
  getDaySlotMatrix, getSparklineData, getSlopeData, getSectorTrend,
  getStoryLead, getKeyInsights, MONTHS_ES, DAYS_FULL, TIME_SLOT_LABELS,
  severityLevel,
} from '../utils/dataUtils'
import Sparkline from '../components/charts/Sparkline'
import DaySlotHeatmap from '../components/charts/DaySlotHeatmap'
import SlopeChart from '../components/charts/SlopeChart'
import ModalidadSelect from '../components/ModalidadSelect.jsx'
import BarList from '../components/charts/BarList'
import SectorList from '../components/charts/SectorList'

const ALL_YEARS    = [2022, 2023, 2024, 2025, 2026]
const DISPLAY_YEARS = [2023, 2024, 2025, 2026]

// ── Tooltip factory ────────────────────────────────────────────────────────
function RTooltip({ active, payload, label, total }) {
  if (!active || !payload?.length) return null
  const sum = payload.reduce((s, p) => s + (p.value || 0), 0)
  return (
    <div className="rt">
      <div className="rt-label">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey ?? p.name} className="rt-row">
          <span className="rt-name" style={{ color: p.stroke || p.fill }}>{p.name}</span>
          <span>
            <span className="rt-val">{(p.value || 0).toLocaleString()}</span>
            {total > 0 && <span className="rt-pct">{((p.value||0)/total*100).toFixed(1)}%</span>}
          </span>
        </div>
      ))}
      {payload.length > 1 && (
        <div className="rt-row" style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 4 }}>
          <span className="rt-name">Total período</span>
          <span className="rt-val" style={{ color: 'var(--accent)' }}>{sum.toLocaleString()}</span>
        </div>
      )}
    </div>
  )
}

function Loading() {
  return <div className="loading-wrap"><div className="spinner" /><span>Cargando datos…</span></div>
}

// ── 1. Story lead + Heatmap ────────────────────────────────────────────────
function StorySection({ incidents, cellFilter, onCellClick }) {
  const lead = useMemo(() => getStoryLead(incidents, null), [incidents])
  const { matrix, colTotals, rowTotals } = useMemo(() => getDaySlotMatrix(incidents), [incidents])

  if (!lead) return null
  const trend = lead.yoyPct
  const trendText = trend != null
    ? (trend > 0 ? `subió un ${trend.toFixed(1)}% vs mismo período de 2025` : `bajó un ${Math.abs(trend).toFixed(1)}% vs mismo período de 2025`)
    : null

  const dayPlural = lead.peakDay?.endsWith('s') ? lead.peakDay : lead.peakDay + 's'

  return (
    <div className="story-lead" style={{ marginBottom: 20 }}>
      <div className="story-card">
        <div className="story-question">¿Cuándo cuidarse en La Molina?</div>
        <div className="story-answer">
          Los <mark>{dayPlural}</mark> entre las{' '}
          <mark>{lead.peakSlot}</mark> concentran más incidentes
        </div>
        <div className="story-body">
          La franja de {lead.peakSlot.split('–')[0]} representa el <strong>{lead.slotPct}%</strong> de
          todos los incidentes registrados. El delito más frecuente es{' '}
          <strong>{lead.topMod}</strong> ({lead.topModPct}% del total).
          {trendText && ` En 2026, la incidencia ${trendText}.`}
        </div>
        <div className="story-recommendation">
          <strong>Recomendación:</strong>{' '}Reforzar patrullaje los {dayPlural} durante la franja de {lead.peakSlot}, especialmente en zonas de mayor densidad. Reportar incidentes en <strong>105</strong> (PNP).
        </div>
      </div>

      <div className="card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <div className="card-label" style={{ margin: 0 }}>Incidencias por día y franja horaria</div>
          {cellFilter && (
            <span style={{
              fontSize: 11, background: 'var(--accent-soft)', border: '1px solid var(--accent)',
              borderRadius: 20, padding: '2px 10px', color: 'var(--accent)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              🔍 {DAYS_FULL[cellFilter.day]} · {TIME_SLOT_LABELS[['08-14','14-20','20-02','02-08'][cellFilter.slot]]}
              <button onClick={() => onCellClick(null)}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}>✕</button>
            </span>
          )}
        </div>
        <DaySlotHeatmap
          matrix={matrix} colTotals={colTotals} rowTotals={rowTotals}
          cellFilter={cellFilter} onCellClick={onCellClick}
        />
      </div>
    </div>
  )
}

// ── 2. KPI Cards with sparklines ───────────────────────────────────────────
function KPIGrid({ incidents, allIncidents, activeYears, onToggleYear, ytdMaxMonth }) {
  const byYear = getKPIByYear(allIncidents)
  // YTD 2025 — same months as the current 2026 data — for a fair delta on the 2026 card
  const ytd2025 = ytdMaxMonth
    ? allIncidents.filter(i => i.year === 2025 && i.month != null && i.month <= ytdMaxMonth).length
    : null

  return (
    <div className="kpi-grid" style={{ marginBottom: 20 }}>
      {/* Lead card — total current period */}
      <div className="card" style={{ background: 'var(--fg)', color: 'var(--bg-panel)', border: 'none', padding: '20px 22px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10 }}>
          Total en el período
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 900, lineHeight: 1, marginBottom: 8, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
          {incidents.length.toLocaleString()}
        </div>
        <div style={{ fontSize: 12, opacity: 0.6 }}>
          incidencias · {activeYears.sort().join(', ')}
        </div>
      </div>

      {DISPLAY_YEARS.map(y => {
        const val  = byYear[y] || 0
        // For 2026: compare YTD 2026 vs YTD 2025 (same months) — otherwise raw year-over-year
        const prev      = (y === 2026 && ytd2025 != null) ? ytd2025 : byYear[y - 1]
        const prevLabel = (y === 2026 && ytd2025 != null) ? `2025 YTD` : String(y - 1)
        const delta = prev ? ((val - prev) / prev * 100) : null
        const active = activeYears.includes(y)
        const spark  = getSparklineData(allIncidents, y)
        const color  = YEAR_HEX[y]

        return (
          <div key={y}
            className={`kpi-card y${y}${!active ? ' inactive' : ''}`}
            onClick={() => onToggleYear(y)}
            title={active ? `Ocultar ${y}` : `Mostrar ${y}`}>
            <div className="kpi-year" style={{ color }}>
              {y}{!active && ' · oculto'}
            </div>
            <div className="kpi-value num" style={{ color: 'var(--fg)' }}>
              {val.toLocaleString()}
            </div>
            {delta != null && Math.abs(delta) < 500 && (
              <div className={`kpi-delta ${delta > 0 ? 'up' : 'down'}`}>
                {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
                <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--fg-dim)', marginLeft: 2 }}>vs {prevLabel}</span>
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              <Sparkline data={spark} color={color} height={34} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── 3. Alert strip ─────────────────────────────────────────────────────────
function AlertStrip({ insights }) {
  if (!insights.length) return null
  const sevNum = { 'sev-0': 0, 'sev-1': 1, 'sev-2': 2, 'sev-3': 3, 'sev-4': 4 }
  return (
    <div className="alerts-grid" style={{ marginBottom: 20 }}>
      {insights.map(ins => {
        const s = sevNum[ins.type] ?? 0
        return (
          <div key={ins.id} className={`alert-card ${ins.type}`}>
            <div className="alert-label">{ins.label}</div>
            <div className="alert-value" style={{ color: `var(--sev-${s})` }}>{ins.value}</div>
            <div className="alert-detail">{ins.detail}</div>
          </div>
        )
      })}
    </div>
  )
}

// ── 4. Monthly trend ───────────────────────────────────────────────────────
function MonthlyTrend({ incidents, allIncidents, activeYears, ytdMaxMonth, total }) {
  const years = ALL_YEARS.filter(y => activeYears.includes(y))
  const data  = getMonthlyTrend(allIncidents, years)

  return (
    <div className="card chart-full" style={{ height: 300, marginBottom: 16 }}>
      <div className="card-label">Tendencia mensual por año</div>
      <ResponsiveContainer width="100%" height={245}>
        <LineChart data={data} margin={{ left: 0, right: 24, top: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="month" tick={{ fill: 'var(--fg-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'var(--fg-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
          <Tooltip content={<RTooltip total={null} />} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          {years.map(y => (
            <Line key={y} type="monotone" dataKey={y} name={String(y)}
              stroke={YEAR_HEX[y]} strokeWidth={y === 2025 ? 2.5 : 1.5}
              dot={false} activeDot={{ r: 4, fill: YEAR_HEX[y], stroke: 'var(--bg-panel)', strokeWidth: 2 }}
              strokeDasharray={y === 2026 ? '6 3' : undefined}
            />
          ))}
          {ytdMaxMonth && ytdMaxMonth < 12 && (
            <ReferenceLine x={MONTHS_ES[ytdMaxMonth - 1]} stroke="var(--border-strong)"
              strokeDasharray="4 4" label={{ value: 'Hoy', fill: 'var(--fg-dim)', fontSize: 10 }} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── 5. Day bars + Hour bands ───────────────────────────────────────────────
function DayBars({ incidents, total }) {
  const data = getDayRisk(incidents)
  const sorted = [...data].sort((a, b) => a.value - b.value)
  const mid    = Math.floor(sorted.length / 2)
  const avg    = sorted.length % 2 !== 0
    ? sorted[mid].value
    : (sorted[mid - 1].value + sorted[mid].value) / 2

  return (
    <div className="card" style={{ height: 280 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
        <span className="card-label" style={{ margin: 0 }}>Días de mayor riesgo</span>
        <span style={{ fontSize: 11, color: 'var(--fg-dim)' }}>
          mediana: <strong style={{ color: 'var(--fg-muted)' }}>{Math.round(avg).toLocaleString()}</strong>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={228}>
        <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <ReferenceLine y={avg} stroke="var(--accent)" strokeDasharray="4 3" strokeWidth={1.5}
            label={{ value: 'mediana', position: 'insideTopRight', fontSize: 9, fill: 'var(--accent)', dy: -4 }} />
          <XAxis dataKey="name" tick={{ fill: 'var(--fg-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'var(--fg-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
          <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload
            const diff = d.value - avg
            return (
              <div className="rt">
                <div className="rt-label">{d.full}</div>
                <div className="rt-row">
                  <span className="rt-name">Incidencias</span>
                  <span><span className="rt-val">{d.value.toLocaleString()}</span><span className="rt-pct"> {d.pct}%</span></span>
                </div>
                <div className="rt-row" style={{ marginTop: 2 }}>
                  <span className="rt-name">vs mediana</span>
                  <span style={{ color: diff > 0 ? 'var(--up)' : 'var(--down)', fontWeight: 700, fontSize: 12 }}>
                    {diff > 0 ? '+' : ''}{Math.round(diff).toLocaleString()}
                  </span>
                </div>
              </div>
            )
          }} />
          <Bar dataKey="value" name="Incidencias" radius={[5,5,0,0]}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.value > avg ? 'var(--sev-3)' : 'var(--sev-0)'}
                fillOpacity={d.value > avg ? 0.9 : 0.6}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function HourBands({ incidents }) {
  const data    = getHourlyRisk(incidents)
  const max     = Math.max(...data.map(d => d.value), 1)
  const total   = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="card" style={{ height: 280 }}>
      <div className="card-label">Franjas horarias de riesgo</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8 }}>
        {data.map(d => {
          const sev  = severityLevel(d.value, max)
          const barW = `${(d.value / max * 100).toFixed(1)}%`
          const pct  = total > 0 ? (d.value / total * 100).toFixed(1) : 0
          const bg   = `var(--sev-${sev}-soft)`
          const fg   = `var(--sev-${Math.max(sev,1)})`
          return (
            <div key={d.slot} style={{ position: 'relative' }}>
              <div style={{ height: 38, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: barW, background: bg, transition: 'width 0.4s' }} />
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', height: '100%', padding: '0 12px', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--fg)', fontWeight: 600 }}>{d.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 800, color: fg, fontVariantNumeric: 'tabular-nums' }}>
                    {d.value.toLocaleString()}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--fg-dim)', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 6. Slope chart + Donut ─────────────────────────────────────────────────
const SLOPE_TABS = [
  { id: 'yoy',  label: '2025 → 2026', from: 2025, to: 2026 },
  { id: '2425', label: '2024 → 2025', from: 2024, to: 2025 },
  { id: '2324', label: '2023 → 2024', from: 2023, to: 2024 },
]

function SlopeAndDonut({ incidents, total }) {
  const [tab, setTab] = useState('yoy')
  const { from, to } = SLOPE_TABS.find(t => t.id === tab)

  const slopeData  = useMemo(() => getSlopeData(incidents, from, to, 10), [incidents, from, to])
  const donutData  = useMemo(() => getStolenObjects(incidents), [incidents])
  const donutTotal = donutData.reduce((s, d) => s + d.value, 0)

  const SEV_COLORS = ['var(--sev-4)','var(--sev-3)','var(--sev-2)','var(--sev-1)','var(--sev-0)','#a78bfa','#22d3ee']

  return (
    <div className="charts-grid" style={{ marginBottom: 16 }}>
      <div className="card">
        {/* Header with tabs */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
          <div>
            <div className="card-label" style={{ margin: 0 }}>¿Qué modalidades subieron?</div>
            <div className="card-hint" style={{ margin: 0 }}>Cada línea es un tipo de delito. Rojo = aumentó, verde = bajó.</div>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {SLOPE_TABS.map(t => (
              <button key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                  border: tab === t.id ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  background: tab === t.id ? 'var(--accent-soft)' : 'var(--bg)',
                  color: tab === t.id ? 'var(--accent)' : 'var(--fg-muted)',
                  transition: 'all 0.12s', whiteSpace: 'nowrap',
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <SlopeChart items={slopeData} fromYear={from} toYear={to} />
      </div>
      <div className="card">
        <div className="card-label">Objetos sustraídos más frecuentes</div>
        {donutTotal === 0 ? (
          <div className="loading-wrap" style={{ height: 220 }}>
            <span style={{ fontSize: 13, color: 'var(--fg-dim)' }}>Sin datos de objetos</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={donutData} cx="50%" cy="48%" innerRadius={56} outerRadius={90}
                dataKey="value" nameKey="name" paddingAngle={3}>
                {donutData.map((_, i) => <Cell key={i} fill={SEV_COLORS[i % SEV_COLORS.length]} />)}
              </Pie>
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0]
                return (
                  <div className="rt">
                    <div className="rt-label">{d.name}</div>
                    <div className="rt-row">
                      <span className="rt-name">Unidades</span>
                      <span><span className="rt-val">{d.value.toLocaleString()}</span>
                        <span className="rt-pct"> {donutTotal > 0 ? (d.value/donutTotal*100).toFixed(1) : 0}%</span></span>
                    </div>
                  </div>
                )
              }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

// ── 7. Top modalidades ─────────────────────────────────────────────────────
function TopModalidades({ incidents, total, modalidad, onBarClick }) {
  const data = useMemo(() => getTopModalidades(incidents, 10), [incidents])
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
        <div className="card-label" style={{ margin: 0 }}>Top 10 modalidades delictivas</div>
        <span style={{ fontSize: 10, color: 'var(--fg-dim)' }}>· clic para filtrar</span>
        {modalidad !== 'TODAS' && (
          <button onClick={() => onBarClick('TODAS')}
            style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--border)', color: 'var(--fg-muted)', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>
            ✕ quitar filtro
          </button>
        )}
      </div>
      <BarList items={data} total={total} onItemClick={onBarClick} activeItem={modalidad !== 'TODAS' ? modalidad : null} />
    </div>
  )
}

// ── 8. Sector list ─────────────────────────────────────────────────────────
function Sectores({ incidents }) {
  const data = useMemo(() => getSectorTrend(incidents), [incidents])
  if (!data.length) return null
  return (
    <div className="card">
      <div className="card-label">Sectores de serenazgo</div>
      <div className="card-hint">Incidencias 2026 con variación respecto a 2025</div>
      <SectorList items={data} />
    </div>
  )
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data, loading, error } = useData()
  const [activeYears, setActiveYears] = useState([2023, 2024, 2025, 2026])
  const [modalidad,   setModalidad]   = useState('TODAS')
  const [cellFilter,  setCellFilter]  = useState(null)

  const allYearsInData = useMemo(() => {
    if (!data) return ALL_YEARS
    return [...new Set(data.incidents.map(i => i.year))].sort()
  }, [data])

  const topModalidades = useMemo(() => {
    if (!data) return []
    return getTopModalidades(data.incidents, 30).map(m => m.full)
  }, [data])

  // Base filter (year + modalidad) — used for heatmap
  const filtered = useMemo(() => {
    if (!data) return []
    return filterIncidents(data.incidents, { years: activeYears, modalidad })
  }, [data, activeYears, modalidad])

  // Deep filter (+ cell) — used for all other charts
  const filteredDeep = useMemo(() => {
    if (!cellFilter) return filtered
    const slots = ['08-14','14-20','20-02','02-08']
    const slotKey = slots[cellFilter.slot]
    return filtered.filter(inc => inc.day_of_week === cellFilter.day && inc.time_slot === slotKey)
  }, [filtered, cellFilter])

  const ytdMaxMonth = data?.meta?.ytd_max_month || 5
  const total       = filteredDeep.length

  const insights = useMemo(() => {
    if (!data) return []
    return getKeyInsights(filteredDeep, ytdMaxMonth)
  }, [filteredDeep, ytdMaxMonth, data])

  const toggleYear = useCallback(y => {
    setActiveYears(prev => prev.includes(y) ? prev.filter(x => x !== y) : [...prev, y])
    // Persist
    const next = activeYears.includes(y) ? activeYears.filter(x => x !== y) : [...activeYears, y]
    localStorage.setItem('la-molina:years', JSON.stringify(next))
  }, [activeYears])

  if (loading) return <Loading />
  if (error)   return <div className="loading-wrap"><span style={{ color: 'var(--up)' }}>Error: {error}</span></div>

  return (
    <>
      {/* ── Page header ── */}
      <div className="page-header">
        <h1>¿Cómo va la seguridad en La Molina?</h1>
        <p>Incidencias registradas 2022–2026 · Fuente: Comisaría La Molina · SIDPOL</p>
      </div>

      {/* ── Sticky filter bar ── */}
      <div className="filter-bar">
        <span className="filter-label">Año</span>
        {allYearsInData.map(y => (
          <button key={y}
            className={`filter-chip y${y}${activeYears.includes(y) ? ' yactive' : ''}`}
            onClick={() => toggleYear(y)}>
            {y}
          </button>
        ))}
        <span className="filter-label" style={{ marginLeft: 8 }}>Modalidad</span>
        <ModalidadSelect
          value={modalidad}
          onChange={e => setModalidad(e.target.value)}
          availableModalidades={topModalidades}
        />
        {modalidad !== 'TODAS' && (
          <button onClick={() => setModalidad('TODAS')}
            style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--fg-muted)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}>
            ✕
          </button>
        )}
        {cellFilter && (
          <button onClick={() => setCellFilter(null)}
            style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: 20, padding: '4px 12px', fontSize: 11, cursor: 'pointer' }}>
            ✕ {DAYS_FULL[cellFilter.day].slice(0,3)} · {['08-14','14-20','20-02','02-08'][cellFilter.slot]}
          </button>
        )}
        <span className="filter-count">
          Mostrando <strong>{filteredDeep.length.toLocaleString()}</strong> incidencias
        </span>
      </div>

      {/* ── 1. Story lead + heatmap ── */}
      <StorySection incidents={filtered} cellFilter={cellFilter} onCellClick={setCellFilter} />

      {/* ── 2. KPI cards with sparklines ── */}
      <KPIGrid incidents={filteredDeep} allIncidents={data?.incidents || []} activeYears={activeYears} onToggleYear={toggleYear} ytdMaxMonth={ytdMaxMonth} />

      {/* ── 3. Alert strip ── */}
      <AlertStrip insights={insights} />

      {/* ── 4. Monthly trend ── */}
      <MonthlyTrend
        incidents={filteredDeep}
        allIncidents={data?.incidents || []}
        activeYears={activeYears}
        ytdMaxMonth={ytdMaxMonth}
        total={total}
      />

      {/* ── 5. Day bars + Hour bands ── */}
      <div className="charts-grid" style={{ marginBottom: 16 }}>
        <DayBars    incidents={filteredDeep} total={total} />
        <HourBands  incidents={filteredDeep} />
      </div>

      {/* ── 6. Slope chart + Donut ── */}
      <SlopeAndDonut incidents={filteredDeep} total={total} />

      {/* ── 7. Top modalidades ── */}
      <TopModalidades incidents={filteredDeep} total={total} modalidad={modalidad} onBarClick={m => setModalidad(m === 'TODAS' ? 'TODAS' : m)} />

      {/* ── 8. Sector list ── */}
      <Sectores incidents={data?.incidents || []} />

      {/* ── Footer ── */}
      <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
        {/* Logos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
          {[
            { src: '/dashboard-crimenes-lamolina/logo-pnp.png',  alt: 'Policía Nacional del Perú' },
            { src: '/dashboard-crimenes-lamolina/logo-idd.png',  alt: 'Instituto para la Democracia Digital' },
            { src: '/dashboard-crimenes-lamolina/logo-acl.png',  alt: 'Azul Center Labs' },
            { src: '/dashboard-crimenes-lamolina/logo-eia.png',  alt: 'Escuela de Inteligencia Artificial' },
          ].map(({ src, alt }) => (
            <img key={src} src={src} alt={alt} title={alt} className="footer-logo"
              style={{ height: 32, width: 'auto', objectFit: 'contain' }} />
          ))}
        </div>

        {/* Créditos */}
        <div style={{ fontSize: 11, color: 'var(--fg-dim)', lineHeight: 1.6 }}>
          <span>Fuente: Comisaría PNP Santa Felicia – La Molina · Datos SIDPOL · 2022–2026</span>
          <span style={{ margin: '0 8px', opacity: 0.4 }}>·</span>
          <span>Desarrollado por <strong style={{ fontWeight: 600, color: 'var(--fg-dim)' }}>Instituto para la Democracia Digital (IDD)</strong> · <a href="https://www.idd.pe" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--fg-dim)', textDecoration: 'underline' }}>idd.pe</a></span>
          <span style={{ margin: '0 8px', opacity: 0.4 }}>·</span>
          <span>Director del proyecto: <strong style={{ fontWeight: 600, color: 'var(--fg-dim)' }}>Edwin Santos Vidal</strong></span>
        </div>
      </div>
    </>
  )
}
