import { useState, useMemo } from 'react'
import { useData } from '../hooks/useData.jsx'
import { filterIncidents, computePivot, getTopModalidades, YEAR_HEX, severityLevel } from '../utils/dataUtils'
import ModalidadSelect from '../components/ModalidadSelect.jsx'

const DIMENSIONS = [
  { value: 'month',       label: '🗓️ Mes' },
  { value: 'day_of_week', label: '📆 Día de semana' },
  { value: 'time_slot',   label: '🕐 Franja horaria' },
  { value: 'modalidad',   label: '🔍 Modalidad' },
  { value: 'delito',      label: '⚖️ Tipo de delito' },
]

const ALL_YEARS = [2022, 2023, 2024, 2025, 2026]

function Loading() {
  return <div className="loading-wrap"><div className="spinner" /><span>Cargando datos…</span></div>
}

function downloadCSV(rows, cols, matrix, rowLabel, colLabel) {
  const header = [rowLabel, ...cols].join(',')
  const lines = rows.map(r => {
    const cells = cols.map(c => matrix[r]?.[c] || 0)
    return [`"${r}"`, ...cells].join(',')
  })
  const csv = [header, ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pivot_${rowLabel}_x_${colLabel}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function PivotTable() {
  const { data, loading, error } = useData()
  const [rowDim, setRowDim]       = useState('modalidad')
  const [colDim, setColDim]       = useState('month')
  const [activeYears, setActiveYears] = useState([2023, 2024, 2025, 2026])
  const [modalidad, setModalidad]     = useState('TODAS')
  const [maxRows, setMaxRows]         = useState(20)
  const [sortBy, setSortBy]           = useState('total') // 'total' | 'name'
  const [showPct, setShowPct]         = useState(false)

  const topModalidades = useMemo(() => {
    if (!data) return []
    return getTopModalidades(data.incidents, 30).map(m => m.full)
  }, [data])

  const filtered = useMemo(() => {
    if (!data) return []
    return filterIncidents(data.incidents, { years: activeYears, modalidad })
  }, [data, activeYears, modalidad])

  const { rows: allRows, cols, matrix } = useMemo(
    () => computePivot(filtered, rowDim, colDim),
    [filtered, rowDim, colDim]
  )

  const rowTotals = useMemo(() => {
    const t = {}
    for (const r of allRows) t[r] = cols.reduce((s, c) => s + (matrix[r]?.[c] || 0), 0)
    return t
  }, [allRows, cols, matrix])

  const colTotals = useMemo(() => {
    const t = {}
    for (const c of cols) t[c] = allRows.reduce((s, r) => s + (matrix[r]?.[c] || 0), 0)
    return t
  }, [allRows, cols, matrix])

  const grandTotal = useMemo(() => allRows.reduce((s, r) => s + rowTotals[r], 0), [allRows, rowTotals])

  const sortedRows = useMemo(() => {
    const r = [...allRows]
    if (sortBy === 'total') r.sort((a, b) => rowTotals[b] - rowTotals[a])
    else r.sort((a, b) => String(a).localeCompare(String(b)))
    return r.slice(0, maxRows)
  }, [allRows, rowTotals, sortBy, maxRows])

  const maxCell = useMemo(() => Math.max(...sortedRows.flatMap(r => cols.map(c => matrix[r]?.[c] || 0)), 1), [sortedRows, cols, matrix])

  function cellBg(val) {
    if (!val) return 'transparent'
    const sev = severityLevel(val, maxCell)
    return `var(--sev-${sev}-soft)`
  }

  function cellText(val, rowTotal) {
    if (!val) return '–'
    if (showPct && rowTotal) return `${((val / rowTotal) * 100).toFixed(1)}%`
    return val.toLocaleString()
  }

  function toggleYear(y) {
    setActiveYears(prev => prev.includes(y) ? prev.filter(x => x !== y) : [...prev, y])
  }

  const rowDimLabel = DIMENSIONS.find(d => d.value === rowDim)?.label || rowDim
  const colDimLabel = DIMENSIONS.find(d => d.value === colDim)?.label || colDim

  if (loading) return <Loading />
  if (error) return <div className="loading-wrap"><span style={{ color: 'var(--up)' }}>Error: {error}</span></div>

  return (
    <>
      <div className="page-header">
        <h1>Tabla interactiva de incidencias</h1>
        <p>
          {filtered.length.toLocaleString()} incidencias · {allRows.length} valores en filas · {cols.length} valores en columnas
        </p>
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              📋 Filas (agrupación)
            </label>
            <select className="filter-select" style={{ width: '100%' }} value={rowDim} onChange={e => setRowDim(e.target.value)}>
              {DIMENSIONS.filter(d => d.value !== colDim).map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              📊 Columnas (agrupación)
            </label>
            <select className="filter-select" style={{ width: '100%' }} value={colDim} onChange={e => setColDim(e.target.value)}>
              {DIMENSIONS.filter(d => d.value !== rowDim).map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              🔍 Modalidad
            </label>
            <ModalidadSelect
              value={modalidad}
              onChange={e => setModalidad(e.target.value)}
              availableModalidades={topModalidades}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              ⚙️ Opciones
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select className="filter-select" value={maxRows} onChange={e => setMaxRows(Number(e.target.value))}>
                <option value={10}>Top 10 filas</option>
                <option value={20}>Top 20 filas</option>
                <option value={50}>Top 50 filas</option>
                <option value={9999}>Todas</option>
              </select>
              <button className={`filter-chip${sortBy === 'total' ? ' active' : ''}`} onClick={() => setSortBy('total')}>↓ Por total</button>
              <button className={`filter-chip${sortBy === 'name' ? ' active' : ''}`} onClick={() => setSortBy('name')}>A–Z</button>
              <button className={`filter-chip${showPct ? ' active' : ''}`} onClick={() => setShowPct(v => !v)}>%</button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="filter-label">Año</span>
          {ALL_YEARS.map(y => (
            <button key={y}
              className={`filter-chip y${y}${activeYears.includes(y) ? ' yactive' : ''}`}
              onClick={() => toggleYear(y)}>{y}</button>
          ))}
          <button
            onClick={() => downloadCSV(sortedRows, cols, matrix, rowDimLabel, colDimLabel)}
            style={{
              marginLeft: 'auto', padding: '5px 14px', borderRadius: 20,
              border: '1px solid var(--border)', background: 'var(--bg)',
              color: 'var(--fg-muted)', fontSize: 12, cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            ⬇ Exportar CSV
          </button>
        </div>
      </div>

      {/* Pivot table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 340px)', minHeight: 300 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <th className="pivot-th">{rowDimLabel} ↕</th>
                {cols.map(c => (
                  <th key={c} className="pivot-th" style={{ minWidth: 80 }}>{c}</th>
                ))}
                <th className="pivot-th" style={{ color: 'var(--accent)' }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r, ri) => {
                const rowTotal = rowTotals[r]
                return (
                  <tr key={r} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td className="pivot-row-hd" title={String(r)}>
                      <span style={{ display: 'block', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {String(r)}
                      </span>
                    </td>
                    {cols.map(c => {
                      const val = matrix[r]?.[c] || 0
                      const sev = severityLevel(val, maxCell)
                      return (
                        <td key={c} className="pivot-td" style={{
                          background: cellBg(val),
                          color: val ? `var(--sev-${Math.max(sev,1)})` : 'var(--fg-dim)',
                          fontWeight: sev >= 3 ? 700 : val > 0 ? 500 : 400,
                        }}>
                          {cellText(val, rowTotal)}
                        </td>
                      )
                    })}
                    <td className="pivot-td" style={{ color: 'var(--accent)', fontWeight: 700, background: 'var(--accent-soft)' }}>
                      {rowTotal.toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--border)', position: 'sticky', bottom: 0, background: 'var(--bg-panel)' }}>
                <td className="pivot-row-hd" style={{ color: 'var(--accent)', fontWeight: 700 }}>TOTAL</td>
                {cols.map(c => (
                  <td key={c} className="pivot-td" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                    {(colTotals[c] || 0).toLocaleString()}
                  </td>
                ))}
                <td className="pivot-td" style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 13 }}>
                  {grandTotal.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {allRows.length > maxRows && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--fg-muted)', textAlign: 'center' }}>
            Mostrando {Math.min(maxRows, sortedRows.length)} de {allRows.length} filas ·
            <button onClick={() => setMaxRows(v => v + 20)}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, marginLeft: 6 }}>
              Ver más ↓
            </button>
          </div>
        )}
      </div>

      {/* Quick insights */}
      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {sortedRows.slice(0, 3).map((r, i) => {
          const medals = ['1°', '2°', '3°']
          const sevColors = ['var(--sev-4)', 'var(--sev-3)', 'var(--sev-2)']
          return (
            <div key={r} className="card" style={{ padding: '16px 18px', borderLeft: `3px solid ${sevColors[i]}` }}>
              <div style={{ fontSize: 10, color: 'var(--fg-dim)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{medals[i]} {rowDimLabel}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={String(r)}>{String(r)}</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: sevColors[i], fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-display)' }}>{rowTotals[r].toLocaleString()}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{grandTotal ? ((rowTotals[r] / grandTotal) * 100).toFixed(1) : 0}% del total</div>
            </div>
          )
        })}
      </div>
    </>
  )
}
