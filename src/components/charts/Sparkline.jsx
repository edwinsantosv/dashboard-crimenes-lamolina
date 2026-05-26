// Sparkline — 36px tall mini line chart with gradient fill
export default function Sparkline({ data = [], color = 'var(--accent)', height = 36, width = '100%' }) {
  if (!data.length) return null
  const max   = Math.max(...data, 1)
  const min   = Math.min(...data)
  const range = max - min || 1
  const W     = 120
  const H     = height
  const pad   = 2

  const xs = data.map((_, i) => pad + (i / (data.length - 1 || 1)) * (W - pad * 2))
  const ys = data.map(v => H - pad - ((v - min) / range) * (H - pad * 2))

  const line   = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
  const area   = `${line} L${xs[xs.length-1].toFixed(1)},${H} L${xs[0].toFixed(1)},${H} Z`
  const gradId = `sg-${Math.random().toString(36).slice(2,7)}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width, height, display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.00" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line}  fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      <circle cx={xs[xs.length-1]} cy={ys[ys.length-1]} r="2.5" fill={color} />
    </svg>
  )
}
