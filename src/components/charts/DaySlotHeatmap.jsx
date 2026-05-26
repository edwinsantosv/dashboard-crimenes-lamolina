import { useState, useCallback, useMemo } from 'react'
import { DAYS_ES, TIME_SLOT_LABELS, TIME_SLOTS } from '../../utils/dataUtils'

const SEV_BG = [
  'var(--sev-0-soft)',
  'var(--sev-1-soft)',
  'var(--sev-2-soft)',
  'var(--sev-3-soft)',
  'var(--sev-4-soft)',
]
const SEV_FG = ['var(--sev-0)','var(--sev-1)','var(--sev-2)','var(--sev-3)','var(--sev-4)']

function sevLevel(v, max) {
  if (!v || !max) return 0
  const t = v / max
  if (t < 0.15) return 0
  if (t < 0.35) return 1
  if (t < 0.60) return 2
  if (t < 0.80) return 3
  return 4
}

export default function DaySlotHeatmap({ matrix, colTotals, rowTotals, cellFilter, onCellClick }) {
  const [tip, setTip] = useState(null)

  const allVals    = matrix.flat()
  const maxCell    = Math.max(...allVals, 1)
  const maxRow     = Math.max(...rowTotals, 1)
  const maxCol     = Math.max(...colTotals, 1)
  const grandTotal = rowTotals.reduce((a, b) => a + b, 0)
  const avgCell    = grandTotal / 28  // 7×4

  const showTip = useCallback((e, val, d, s) => {
    if (!val) { setTip(null); return }
    setTip({
      val, d, s,
      day: DAYS_ES[d], slot: TIME_SLOT_LABELS[TIME_SLOTS[s]],
      pctRow: rowTotals[d] > 0 ? (val / rowTotals[d] * 100) : 0,
      pctCol: colTotals[s] > 0 ? (val / colTotals[s] * 100) : 0,
      pctGrand: grandTotal > 0 ? (val / grandTotal * 100) : 0,
      vsAvg: avgCell > 0 ? ((val - avgCell) / avgCell * 100) : 0,
      x: e.clientX, y: e.clientY,
    })
  }, [rowTotals, colTotals, grandTotal, avgCell])

  const moveTip  = useCallback(e => setTip(t => t ? { ...t, x: e.clientX, y: e.clientY } : t), [])
  const hideTip  = useCallback(() => setTip(null), [])
  const handleClick = useCallback((d, s, val) => {
    if (!val) return
    const active = cellFilter?.day === d && cellFilter?.slot === s
    onCellClick?.(active ? null : { day: d, slot: s })
  }, [cellFilter, onCellClick])

  const slotLabels = TIME_SLOTS.map(s => TIME_SLOT_LABELS[s])

  return (
    <div style={{ position: 'relative' }}>
      {tip && (
        <div style={{
          position: 'fixed', left: tip.x + 16, top: tip.y - 130, zIndex: 9999,
          background: 'var(--bg-panel)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '12px 16px', fontSize: 12, pointerEvents: 'none',
          boxShadow: 'var(--shadow-lg)', minWidth: 200, fontFamily: 'var(--font-body)',
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--fg)', marginBottom: 8 }}>
            {tip.day} · {tip.slot}
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--accent)', marginBottom: 10, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {tip.val.toLocaleString()}
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--fg-muted)', marginLeft: 6 }}>incidencias</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            {[
              [`% de todos los ${tip.day}`, `${tip.pctRow.toFixed(1)}%`],
              [`% de franja ${tip.slot}`, `${tip.pctCol.toFixed(1)}%`],
              ['% del total', `${tip.pctGrand.toFixed(2)}%`],
              ['vs promedio celda', `${tip.vsAvg > 0 ? '+' : ''}${tip.vsAvg.toFixed(0)}%`],
            ].map(([lbl, val]) => (
              <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--fg-muted)', gap: 16 }}>
                <span>{lbl}</span>
                <strong style={{ color: lbl.startsWith('vs') ? (tip.vsAvg > 0 ? 'var(--up)' : 'var(--down)') : 'var(--fg)' }}>{val}</strong>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 10, color: 'var(--fg-dim)', borderTop: '1px solid var(--border)', paddingTop: 6 }}>
            {cellFilter?.day === tip.d && cellFilter?.slot === tip.s
              ? '✅ Filtrando · clic para quitar'
              : '🖱 Clic para filtrar todos los gráficos'}
          </div>
        </div>
      )}

      <div className="heatmap-scroll">
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 4, tableLayout: 'fixed', minWidth: 340 }}>
          <colgroup>
            <col style={{ width: 36 }} />
            {TIME_SLOTS.map((_, i) => <col key={i} />)}
            <col style={{ width: 48 }} />
          </colgroup>
          <thead>
            <tr>
              <td />
              {slotLabels.map((label, s) => {
                const isSelCol = cellFilter?.slot === s
                const sev = sevLevel(colTotals[s], maxCol)
                return (
                  <th key={s} style={{ padding: '0 0 4px', textAlign: 'center' }}>
                    <div style={{
                      padding: '5px 4px', borderRadius: 6, marginBottom: 2,
                      background: SEV_BG[sev],
                      color: isSelCol ? 'var(--accent)' : SEV_FG[sev],
                      fontWeight: isSelCol ? 800 : 700,
                      outline: isSelCol ? '2px solid var(--accent)' : 'none',
                      outlineOffset: '-1px',
                      fontSize: 12, fontVariantNumeric: 'tabular-nums',
                    }}>
                      {colTotals[s] || '–'}
                    </div>
                    <div style={{ fontSize: 9, color: isSelCol ? 'var(--accent)' : 'var(--fg-muted)', lineHeight: 1.3 }}>
                      {label.replace('–', '–\n')}
                    </div>
                  </th>
                )
              })}
              <th style={{ padding: '0 0 4px', textAlign: 'center' }}>
                <div style={{ padding: '5px 4px', borderRadius: 6, fontSize: 10, color: 'var(--fg-dim)', fontWeight: 700 }}>Total</div>
                <div style={{ fontSize: 9, color: 'var(--fg-dim)' }}>sem.</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {DAYS_ES.map((day, d) => {
              const isSelRow = cellFilter?.day === d
              const rowSev   = sevLevel(rowTotals[d], maxRow)
              return (
                <tr key={day}>
                  <td style={{
                    textAlign: 'right', paddingRight: 8, fontSize: 11,
                    color: isSelRow ? 'var(--accent)' : 'var(--fg-muted)',
                    fontWeight: isSelRow ? 800 : 600, whiteSpace: 'nowrap',
                  }}>{day}</td>
                  {TIME_SLOTS.map((_, s) => {
                    const val      = matrix[d][s]
                    const sev      = sevLevel(val, maxCell)
                    const isSelCell = cellFilter?.day === d && cellFilter?.slot === s
                    const isHover  = tip?.d === d && tip?.s === s
                    return (
                      <td key={s} style={{ padding: 0 }}>
                        <div
                          onMouseEnter={e => showTip(e, val, d, s)}
                          onMouseMove={moveTip}
                          onMouseLeave={hideTip}
                          onClick={() => handleClick(d, s, val)}
                          style={{
                            height: 38, borderRadius: 6,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                            background: isSelCell ? 'var(--accent-soft)' : SEV_BG[sev],
                            color: isSelCell ? 'var(--accent)' : val > 0 ? SEV_FG[Math.max(sev, 1)] : 'var(--border-strong)',
                            outline: isSelCell ? '2px solid var(--accent)' : sev >= 4 ? '1.5px solid var(--sev-4)' : 'none',
                            outlineOffset: '-1px',
                            cursor: val > 0 ? 'pointer' : 'default',
                            transition: 'filter 0.1s',
                            filter: isHover ? 'brightness(0.9)' : 'none',
                          }}
                        >
                          {val || ''}
                        </div>
                      </td>
                    )
                  })}
                  <td style={{ padding: '0 0 0 4px' }}>
                    <div style={{
                      height: 38, borderRadius: 6,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: SEV_BG[rowSev], fontSize: 11, fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      color: isSelRow ? 'var(--accent)' : SEV_FG[rowSev],
                    }}>
                      {rowTotals[d]}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td />
              {colTotals.map((v, i) => (
                <td key={i} style={{ textAlign: 'center', paddingTop: 3 }}>
                  <span style={{ fontSize: 9, color: cellFilter?.slot === i ? 'var(--accent)' : 'var(--fg-dim)' }}>
                    {v > 0 ? `${(v / grandTotal * 100).toFixed(0)}%` : ''}
                  </span>
                </td>
              ))}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Legend */}
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, color: 'var(--fg-dim)', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, color: 'var(--fg-muted)' }}>Intensidad:</span>
        {['Baja','Media-baja','Media','Alta','Muy alta'].map((lbl, i) => (
          <span key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: SEV_BG[i], border: `1.5px solid ${SEV_FG[i]}`, borderRadius: 3 }} />
            {lbl}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--fg-dim)' }}>Hover para detalles · Clic para filtrar</span>
      </div>
    </div>
  )
}
