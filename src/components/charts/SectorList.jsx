// Sector list with severity bar + trend arrow
import { severityLevel } from '../../utils/dataUtils'

const SEV_BG = ['var(--sev-0-soft)','var(--sev-1-soft)','var(--sev-2-soft)','var(--sev-3-soft)','var(--sev-4-soft)']
const SEV_FG = ['var(--sev-0)','var(--sev-1)','var(--sev-2)','var(--sev-3)','var(--sev-4)']

export default function SectorList({ items = [] }) {
  if (!items.length) return null
  const max = items[0]?.current || 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map(item => {
        const sev  = severityLevel(item.current, max)
        const barW = `${(item.current / max * 100).toFixed(1)}%`
        const trendColor = item.trend === 'up' ? 'var(--up)' : item.trend === 'down' ? 'var(--down)' : 'var(--fg-dim)'

        return (
          <div key={item.sector} style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 10, padding: '10px 14px', position: 'relative', overflow: 'hidden',
          }}>
            {/* Background bar */}
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: barW, background: SEV_BG[sev],
              transition: 'width 0.4s ease',
            }} />

            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', flex: 1 }}>
                {item.sector !== 'Sin sector' ? `Sector ${item.sector}` : 'Sin sector'}
              </span>
              <span style={{ fontSize: 15, fontWeight: 800, color: SEV_FG[sev], fontVariantNumeric: 'tabular-nums' }}>
                {item.current.toLocaleString()}
              </span>
              {item.delta != null && (
                <span style={{ fontSize: 11, fontWeight: 700, color: trendColor, minWidth: 52, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {item.trend === 'up' ? '▲' : item.trend === 'down' ? '▼' : '→'}
                  {' '}{Math.abs(item.delta).toFixed(1)}%
                </span>
              )}
            </div>
            {item.prev > 0 && (
              <div style={{ position: 'relative', zIndex: 1, fontSize: 10, color: 'var(--fg-dim)', marginTop: 2 }}>
                vs {item.prev.toLocaleString()} en 2024
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
