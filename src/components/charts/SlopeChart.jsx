// Slope chart: each modalidad as a line from fromYear to toYear
import { useState, useRef, useEffect } from 'react'

const PAD_TOP = 32, PAD_BTM = 24, PAD_L = 134, PAD_R = 110, H_ROW = 28

export default function SlopeChart({ items = [], fromYear = 2024, toYear = 2025 }) {
  const [hovered, setHovered]   = useState(null)
  const wrapRef                 = useRef(null)
  const [W, setW]               = useState(480)

  // Track container width so the chart fills its card at any size
  useEffect(() => {
    if (!wrapRef.current) return
    const obs = new ResizeObserver(([e]) => {
      const w = e.contentRect.width
      if (w > 0) setW(w)
    })
    obs.observe(wrapRef.current)
    return () => obs.disconnect()
  }, [])

  if (!items.length) return null

  const H     = PAD_TOP + items.length * H_ROW + PAD_BTM
  const xFrom = PAD_L
  const xTo   = W - PAD_R

  const yFromVals = [...items].sort((a, b) => b.from - a.from)
  const yToVals   = [...items].sort((a, b) => b.to   - a.to)

  const rankFrom = Object.fromEntries(yFromVals.map((d, i) => [d.full, i]))
  const rankTo   = Object.fromEntries(yToVals.map((d, i) =>  [d.full, i]))

  const yFromPx = item => PAD_TOP + rankFrom[item.full] * H_ROW + H_ROW / 2
  const yToPx   = item => PAD_TOP + rankTo[item.full]   * H_ROW + H_ROW / 2

  return (
    <div ref={wrapRef} style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: H, display: 'block', fontFamily: 'var(--font-body)' }}
      >
        {/* Column headers */}
        <text x={xFrom} y={18} textAnchor="middle" fill="var(--fg-muted)" fontSize={11} fontWeight={700}>{fromYear}</text>
        <text x={xTo}   y={18} textAnchor="middle" fill="var(--fg-muted)" fontSize={11} fontWeight={700}>{toYear}</text>

        {/* Vertical guide lines */}
        <line x1={xFrom} y1={PAD_TOP - 8} x2={xFrom} y2={H - PAD_BTM} stroke="var(--border)" strokeWidth={1} />
        <line x1={xTo}   y1={PAD_TOP - 8} x2={xTo}   y2={H - PAD_BTM} stroke="var(--border)" strokeWidth={1} />

        {items.map((item, i) => {
          const y1    = yFromPx(item)
          const y2    = yToPx(item)
          const isUp  = item.delta > 0
          const isHov = hovered === i
          const color = isUp ? 'var(--up)' : item.delta < 0 ? 'var(--down)' : 'var(--sev-0)'
          const op    = isHov ? 1 : 0.55
          const sw    = isHov ? 2 : 1.5

          return (
            <g key={item.full}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'default' }}>

              {/* Slope line */}
              <line x1={xFrom} y1={y1} x2={xTo} y2={y2}
                stroke={color} strokeWidth={sw} strokeOpacity={op} />

              {/* Left: value */}
              <circle cx={xFrom} cy={y1} r={isHov ? 4 : 3} fill={color} fillOpacity={op} />
              <text x={xFrom - 8} y={y1 + 4} textAnchor="end"
                fill={isHov ? 'var(--fg)' : 'var(--fg-muted)'}
                fontSize={isHov ? 11 : 10} fontWeight={isHov ? 600 : 400}
                style={{ fontVariantNumeric: 'tabular-nums' }}>
                {item.from.toLocaleString()}
              </text>

              {/* Right: value + delta */}
              <circle cx={xTo} cy={y2} r={isHov ? 4 : 3} fill={color} fillOpacity={op} />
              <text x={xTo + 8} y={y2 + 4} textAnchor="start"
                fill={isHov ? 'var(--fg)' : 'var(--fg-muted)'}
                fontSize={isHov ? 11 : 10} fontWeight={isHov ? 600 : 400}
                style={{ fontVariantNumeric: 'tabular-nums' }}>
                {item.to.toLocaleString()}
                {item.delta !== 0 && (
                  <tspan fill={color} fontWeight={700} fontSize={9}>
                    {' '}{isUp ? '▲' : '▼'}{Math.abs(item.delta)}
                  </tspan>
                )}
              </text>

              {/* Row label (left side) */}
              <text x={xFrom - 42} y={y1 + 4} textAnchor="end"
                fill={isHov ? 'var(--fg)' : 'var(--fg-muted)'}
                fontSize={isHov ? 10 : 9} fontWeight={isHov ? 600 : 400}>
                {item.name.length > 16 ? item.name.slice(0, 16) + '…' : item.name}
              </text>

              {/* Center label on hover */}
              {isHov && (
                <text x={(xFrom + xTo) / 2} y={(y1 + y2) / 2 - 6}
                  textAnchor="middle" fill="var(--fg)" fontSize={10} fontWeight={600}>
                  {item.name}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--fg-muted)', marginTop: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: 'var(--up)', fontWeight: 700 }}>▲</span> Aumentó
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: 'var(--down)', fontWeight: 700 }}>▼</span> Disminuyó
        </span>
        <span style={{ color: 'var(--fg-dim)', fontSize: 10, marginLeft: 'auto' }}>Hover para ver nombre</span>
      </div>
    </div>
  )
}
