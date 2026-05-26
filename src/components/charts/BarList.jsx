// Horizontal bar list with severity coloring and optional click-to-filter
import { severityLevel } from '../../utils/dataUtils'

const SEV_BG = ['var(--sev-0-soft)','var(--sev-1-soft)','var(--sev-2-soft)','var(--sev-3-soft)','var(--sev-4-soft)']
const SEV_FG = ['var(--sev-0)','var(--sev-1)','var(--sev-2)','var(--sev-3)','var(--sev-4)']

export default function BarList({ items = [], total = 0, onItemClick, activeItem }) {
  if (!items.length) return null
  const max = items[0]?.value || 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((item, i) => {
        const sev   = severityLevel(item.value, max)
        const pct   = total > 0 ? (item.value / total * 100).toFixed(1) : '—'
        const barW  = `${(item.value / max * 100).toFixed(1)}%`
        const isActive = activeItem === (item.full || item.name)

        return (
          <div key={item.name}
            onClick={() => onItemClick?.(item.full || item.name)}
            style={{
              cursor: onItemClick ? 'pointer' : 'default',
              borderRadius: 8,
              overflow: 'hidden',
              background: isActive ? 'var(--accent-soft)' : 'var(--bg)',
              border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
              transition: 'border-color 0.12s',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '7px 12px', gap: 10, position: 'relative' }}>
              {/* Background bar */}
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: barW, background: SEV_BG[sev],
                transition: 'width 0.4s ease', borderRadius: 8,
              }} />
              {/* Rank */}
              <span style={{ fontSize: 10, color: 'var(--fg-dim)', fontWeight: 600, width: 16, textAlign: 'right', position: 'relative', zIndex: 1, flexShrink: 0 }}>
                {i + 1}
              </span>
              {/* Name */}
              <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: isActive ? 'var(--accent)' : 'var(--fg)', position: 'relative', zIndex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}
              </span>
              {/* Value + % */}
              <span style={{ fontSize: 12, fontWeight: 700, color: SEV_FG[sev], fontVariantNumeric: 'tabular-nums', position: 'relative', zIndex: 1, flexShrink: 0 }}>
                {item.value.toLocaleString()}
              </span>
              <span style={{ fontSize: 10, color: 'var(--fg-dim)', width: 38, textAlign: 'right', position: 'relative', zIndex: 1, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                {pct}%
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
