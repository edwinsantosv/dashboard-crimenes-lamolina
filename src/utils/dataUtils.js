// CSS variable references — auto-update with theme changes
export const YEAR_COLORS = {
  2022: 'var(--yr-2022)',
  2023: 'var(--yr-2023)',
  2024: 'var(--yr-2024)',
  2025: 'var(--yr-2025)',
  2026: 'var(--yr-2026)',
}

// Resolved hex for libs that can't read CSS vars (Leaflet, Recharts SVG fill)
export const YEAR_HEX = {
  2022: '#9BAAB2',
  2023: '#6B7A82',
  2024: '#4D6B78',
  2025: '#14242E',
  2026: '#FF7638',
}

// Resolved at runtime — call getCSSVar('--yr-2026') for current theme value
export function getCSSVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export const SECTOR_COLORS = {
  1: '#f43f5e',
  2: '#6366f1',
  3: '#f59e0b',
  4: '#10b981',
}

export const CHART_PALETTE = [
  'var(--sev-4)', 'var(--sev-3)', 'var(--sev-2)', 'var(--sev-1)',
  'var(--yr-2026)', 'var(--yr-2024)', 'var(--yr-2023)',
  '#6366f1', '#22d3ee', '#a78bfa',
]

export const MONTHS_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

export const MONTHS_FULL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export const DAYS_ES   = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
export const DAYS_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export const TIME_SLOTS = ['08-14', '14-20', '20-02', '02-08']
export const TIME_SLOT_LABELS = {
  '08-14': '08:00–14:00',
  '14-20': '14:00–20:00',
  '20-02': '20:00–02:00',
  '02-08': '02:00–08:00',
}

// ── Severity ─────────────────────────────────────────────────────────────────
// Returns 0–4 based on value vs max
export function severityLevel(value, max) {
  if (!value || !max) return 0
  const t = value / max
  if (t < 0.15) return 0
  if (t < 0.35) return 1
  if (t < 0.60) return 2
  if (t < 0.80) return 3
  return 4
}

export const SEV_VARS = ['--sev-0','--sev-1','--sev-2','--sev-3','--sev-4']
export const SEV_SOFT = ['--sev-0-soft','--sev-1-soft','--sev-2-soft','--sev-3-soft','--sev-4-soft']

// ── Modalidad categories ─────────────────────────────────────────────────────
export const MODALIDAD_CATEGORIES = [
  {
    id: 'hurtos',
    label: '🏃 Hurtos',
    modalidades: [
      'HURTO', 'HURTO DE CELULAR', 'HURTO AGRAVADO',
      'HURTO AGRAVADO EN CASA HABITADA', 'HURTO AGRAVADO DURANTE LA NOCHE',
      'HURTO DE VEHICULO', 'HURTO DE ACCESORIOS Y AUTOPARTES DE VEHICULOS',
      'H. AGRAV.',
    ],
  },
  {
    id: 'robos',
    label: '🥊 Robos',
    modalidades: [
      'ROBO', 'ROBO AGRAVADO', 'ROBO AGRAVADO A MANO ARMADA', 'TENTATIVA DE ROBO',
    ],
  },
  {
    id: 'fraude',
    label: '💻 Fraude y estafas',
    modalidades: [
      'FRAUDE INFORMATICO', 'F.INF.', 'F. INF.', 'ESTAFA', 'ESTAFA AGRAVADA',
      'SUPLANTACION DE IDENTIDAD', 'APROPIACION ILICITA COMUN',
    ],
  },
  {
    id: 'persona',
    label: '👤 Contra la persona',
    modalidades: [
      'EXTORSION', 'ACOSO', 'LESIONES', 'VIOLACION SEXUAL',
      'ACTOS CONTRA EL PUDOR', 'COACCION',
    ],
  },
  {
    id: 'propiedad',
    label: '🏠 Contra la propiedad',
    modalidades: ['USURPACION', 'DAÑO SIMPLE'],
  },
  {
    id: 'transito',
    label: '🚗 Tránsito',
    modalidades: ['CONDUCCION EN ESTADO DE EBRIEDAD O DROGADICCION'],
  },
  {
    id: 'orden',
    label: '📋 Orden público',
    modalidades: ['DESOBEDIENCIA O RESISTENCIA A LA AUTORIDAD', 'ABUSO DE AUTORIDAD'],
  },
]

// Build reverse lookup: modalidad string → category id
const _modToCat = {}
for (const cat of MODALIDAD_CATEGORIES) {
  for (const m of cat.modalidades) _modToCat[m] = cat.id
}
export function getModalidadCategoryId(modalidad) {
  return _modToCat[modalidad] ?? null
}

// ── Core utils ───────────────────────────────────────────────────────────────
export function countBy(arr, key) {
  const counts = {}
  for (const item of arr) {
    const k = item[key] ?? 'N/A'
    counts[k] = (counts[k] || 0) + 1
  }
  return counts
}

export function filterIncidents(incidents, { years, modalidad, sector } = {}) {
  // Pre-resolve category membership if needed
  let catModalidades = null
  if (modalidad && modalidad.startsWith('CAT:')) {
    const catId = modalidad.slice(4)
    const cat = MODALIDAD_CATEGORIES.find(c => c.id === catId)
    catModalidades = cat ? new Set(cat.modalidades) : new Set()
  }

  return incidents.filter(inc => {
    if (years && years.length > 0 && !years.includes(inc.year)) return false
    if (modalidad && modalidad !== 'TODAS') {
      if (catModalidades) {
        if (!catModalidades.has(inc.modalidad)) return false
      } else {
        if (inc.modalidad !== modalidad) return false
      }
    }
    if (sector && sector !== 'TODOS' && String(inc.sector) !== String(sector)) return false
    return true
  })
}

export function getKPIByYear(incidents) {
  const byYear = {}
  for (const inc of incidents) {
    byYear[inc.year] = (byYear[inc.year] || 0) + 1
  }
  return byYear
}

export function getMonthlyTrend(incidents, years) {
  const result = []
  for (let m = 1; m <= 12; m++) {
    const point = { month: MONTHS_ES[m - 1] }
    for (const y of years) {
      point[y] = incidents.filter(i => i.year === y && i.month === m).length
    }
    result.push(point)
  }
  return result
}

export function getTopModalidades(incidents, n = 10) {
  const counts = countBy(incidents, 'modalidad')
  return Object.entries(counts)
    .filter(([k]) => k !== 'DESCONOCIDO')
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, value]) => ({ name: truncate(name, 28), full: name, value }))
}

export function getStolenObjects(incidents) {
  const keys   = ['celular', 'cartera', 'billetera', 'auto', 'dinero', 'diversos']
  const labels = { celular: 'Celular', cartera: 'Cartera', billetera: 'Billetera', auto: 'Auto', dinero: 'Dinero', diversos: 'Diversos' }
  return keys
    .map(k => ({ name: labels[k], key: k, value: incidents.reduce((s, i) => s + (i[k] || 0), 0) }))
    .filter(d => d.value > 0)
}

export function getDayRisk(incidents) {
  const counts = Array(7).fill(0)
  let total = 0
  for (const inc of incidents) {
    if (inc.day_of_week != null) { counts[inc.day_of_week]++; total++ }
  }
  return DAYS_ES.map((name, i) => ({
    name, full: DAYS_FULL[i], value: counts[i],
    pct: total ? (counts[i] / total * 100).toFixed(1) : 0,
  }))
}

export function getHourlyRisk(incidents) {
  const slots = TIME_SLOTS
  const labels = TIME_SLOT_LABELS
  const counts = {}
  for (const s of slots) counts[s] = 0
  for (const inc of incidents) {
    if (inc.time_slot && counts[inc.time_slot] !== undefined) counts[inc.time_slot]++
  }
  return slots.map(s => ({ name: labels[s], slot: s, value: counts[s] }))
}

export function getAnnualComparison(incidents, years, topN = 6) {
  const topMods = getTopModalidades(incidents, topN).map(m => m.full)
  return topMods.map(mod => {
    const row = { modalidad: truncate(mod, 20), full: mod }
    for (const y of years) {
      row[y] = incidents.filter(i => i.year === y && i.modalidad === mod).length
    }
    return row
  })
}

export function getYTDComparison(incidents, ytdMaxMonth, years) {
  const result = []
  for (let m = 1; m <= ytdMaxMonth; m++) {
    const point = { month: MONTHS_ES[m - 1], monthNum: m }
    for (const y of years) {
      point[y] = incidents.filter(i => i.year === y && i.month === m).length
    }
    result.push(point)
  }
  return result
}

export function getYTDTotals(incidents, ytdMaxMonth, years) {
  return years.map(y => ({
    year: y,
    total: incidents.filter(i => i.year === y && i.month != null && i.month <= ytdMaxMonth).length,
  }))
}

export function getSectorStats(incidents) {
  const counts = {}
  for (const inc of incidents) {
    const s = inc.sector ?? 'Sin sector'
    counts[s] = (counts[s] || 0) + 1
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([sector, value]) => ({ sector: String(sector), value }))
}

// ── NEW: Day × Time Slot matrix (7×4) ────────────────────────────────────────
export function getDaySlotMatrix(incidents) {
  const matrix    = Array.from({ length: 7 }, () => Array(4).fill(0))
  const colTotals = Array(4).fill(0)
  const rowTotals = Array(7).fill(0)
  for (const inc of incidents) {
    const d = inc.day_of_week
    const s = TIME_SLOTS.indexOf(inc.time_slot)
    if (d != null && d >= 0 && d < 7 && s >= 0) {
      matrix[d][s]++
      colTotals[s]++
      rowTotals[d]++
    }
  }
  return { matrix, colTotals, rowTotals }
}

// ── NEW: Sparkline (12 monthly counts for a given year) ───────────────────────
export function getSparklineData(incidents, year) {
  return Array.from({ length: 12 }, (_, m) =>
    incidents.filter(i => i.year === year && i.month === m + 1).length
  )
}

// ── NEW: Slope chart data (top N modalidades from→to year) ───────────────────
export function getSlopeData(incidents, fromYear, toYear, n = 10) {
  const pool = getTopModalidades(incidents, n * 3).map(m => m.full)
  return pool.map(mod => {
    const from = incidents.filter(i => i.year === fromYear && i.modalidad === mod).length
    const to   = incidents.filter(i => i.year === toYear   && i.modalidad === mod).length
    if (!from && !to) return null
    return { name: truncate(mod, 26), full: mod, from, to, delta: to - from }
  })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, n)
}

// ── NEW: Sector with YoY trend ────────────────────────────────────────────────
export function getSectorTrend(incidents) {
  const map = {}
  for (const inc of incidents) {
    const key = `${inc.year}::${inc.sector ?? 'Sin sector'}`
    map[key] = (map[key] || 0) + 1
  }
  const sectors = [...new Set(incidents.map(i => String(i.sector ?? 'Sin sector')))]
  return sectors.map(s => {
    const cur  = map[`2026::${s}`] || 0
    const prev = map[`2025::${s}`] || 0
    const delta = prev > 0 ? (cur - prev) / prev * 100 : null
    return { sector: s, current: cur, prev, delta,
      trend: delta == null ? 'flat' : delta > 5 ? 'up' : delta < -5 ? 'down' : 'flat' }
  })
    .filter(s => s.current > 0 || s.prev > 0)
    .sort((a, b) => b.current - a.current)
}

// ── NEW: Peak story lead insight ──────────────────────────────────────────────
export function getStoryLead(incidents, ytdMaxMonth) {
  if (!incidents.length) return null

  // Peak day×slot
  const { matrix, rowTotals, colTotals } = getDaySlotMatrix(incidents)
  let maxVal = 0, peakD = 0, peakS = 0
  for (let d = 0; d < 7; d++) {
    for (let s = 0; s < 4; s++) {
      if (matrix[d][s] > maxVal) { maxVal = matrix[d][s]; peakD = d; peakS = s }
    }
  }

  // YoY change 2025→2026 (YTD — same months so the comparison is fair)
  const ytdMax = ytdMaxMonth || 5
  const n2025 = incidents.filter(i => i.year === 2025 && i.month != null && i.month <= ytdMax).length
  const n2026 = incidents.filter(i => i.year === 2026).length
  const yoyPct = n2025 > 0 ? ((n2026 - n2025) / n2025 * 100) : null

  // Top modalidad
  const top = getTopModalidades(incidents, 1)[0]

  // Peak slot total
  const slotTotal  = colTotals[peakS]
  const grandTotal = incidents.length
  const pct = grandTotal > 0 ? Math.round(slotTotal / grandTotal * 100) : 0

  return {
    peakDay:  DAYS_FULL[peakD],
    peakSlot: TIME_SLOT_LABELS[TIME_SLOTS[peakS]],
    peakVal:  maxVal,
    slotPct:  pct,
    topMod:   top?.full || '',
    topModPct: top ? Math.round(top.value / grandTotal * 100) : 0,
    yoyPct,
    n2025, n2026,
    ytdMaxMonth,
  }
}

// ── Pivot table ───────────────────────────────────────────────────────────────
export function computePivot(incidents, rowDim, colDim) {
  const getVal = (inc, dim) => {
    if (dim === 'month')       return inc.month != null ? MONTHS_ES[inc.month - 1] : null
    if (dim === 'day_of_week') return inc.day_of_week != null ? DAYS_ES[inc.day_of_week] : null
    if (dim === 'time_slot')   return inc.time_slot ? TIME_SLOT_LABELS[inc.time_slot] : null
    if (dim === 'sector')      return inc.sector != null ? `Sector ${inc.sector}` : 'Sin sector'
    return inc[dim] != null ? String(inc[dim]) : null
  }

  const rowOrder = getDimOrder(rowDim)
  const colOrder = getDimOrder(colDim)
  const rowSet = new Set()
  const colSet = new Set()
  const matrix = {}

  for (const inc of incidents) {
    const r = getVal(inc, rowDim)
    const c = getVal(inc, colDim)
    if (r == null || c == null) continue
    rowSet.add(r); colSet.add(c)
    if (!matrix[r]) matrix[r] = {}
    matrix[r][c] = (matrix[r][c] || 0) + 1
  }

  const rows = rowOrder ? rowOrder.filter(r => rowSet.has(r)) : [...rowSet].sort()
  const cols = colOrder ? colOrder.filter(c => colSet.has(c)) : [...colSet].sort()

  return { rows, cols, matrix }
}

function getDimOrder(dim) {
  if (dim === 'month')       return MONTHS_ES
  if (dim === 'day_of_week') return DAYS_ES
  if (dim === 'time_slot')   return Object.values(TIME_SLOT_LABELS)
  return null
}

export function getMonthWeekdayMatrix(incidents) {
  const matrix    = Array.from({ length: 7 }, () => Array(12).fill(0))
  const colTotals = Array(12).fill(0)
  const rowTotals = Array(7).fill(0)
  for (const inc of incidents) {
    if (inc.day_of_week != null && inc.month != null) {
      const d = inc.day_of_week
      const m = inc.month - 1
      if (d >= 0 && d < 7 && m >= 0 && m < 12) {
        matrix[d][m]++; colTotals[m]++; rowTotals[d]++
      }
    }
  }
  return { matrix, colTotals, rowTotals }
}

// ── Key insights ──────────────────────────────────────────────────────────────
export function getKeyInsights(incidents, ytdMaxMonth) {
  if (!incidents.length) return []
  const insights = []
  const byYear = {}
  for (const inc of incidents) byYear[inc.year] = (byYear[inc.year] || 0) + 1

  // YTD YoY 2025→2026: compare the same months so it's apples-to-apples
  const ytd2025 = ytdMaxMonth
    ? incidents.filter(i => i.year === 2025 && i.month != null && i.month <= ytdMaxMonth).length
    : 0
  const ytd2026 = byYear[2026] || 0
  if (ytd2026 > 0 && ytd2025 > 0) {
    const pct = (ytd2026 - ytd2025) / ytd2025 * 100
    insights.push({
      id: 'yoy', type: pct > 5 ? 'sev-4' : pct < -5 ? 'sev-1' : 'sev-0',
      label: 'Variación 2025→2026',
      value: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`,
      detail: `Ene–${MONTHS_ES[(ytdMaxMonth || 5) - 1]}: ${ytd2025.toLocaleString()} → ${ytd2026.toLocaleString()}`,
    })
  } else {
    // Fallback when 2026 has no data yet: compare last two full years
    const fullYears = [2023, 2024, 2025].filter(y => byYear[y] > 0)
    if (fullYears.length >= 2) {
      const yA = fullYears[fullYears.length - 2]
      const yB = fullYears[fullYears.length - 1]
      const pct = (byYear[yB] - byYear[yA]) / byYear[yA] * 100
      insights.push({
        id: 'yoy', type: pct > 5 ? 'sev-4' : pct < -5 ? 'sev-1' : 'sev-0',
        label: `Variación ${yA}→${yB}`,
        value: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`,
        detail: `${byYear[yA].toLocaleString()} → ${byYear[yB].toLocaleString()} incidencias`,
      })
    }
  }

  const y2026 = byYear[2026] || 0
  const y2025 = byYear[2025] || 0
  if (y2026 > 0 && ytdMaxMonth) {
    const proj = Math.round(y2026 / (ytdMaxMonth / 12))
    const pct = y2025 > 0 ? (proj - y2025) / y2025 * 100 : null
    insights.push({
      id: 'proj',
      type: pct == null ? 'sev-0' : pct > 10 ? 'sev-4' : pct < -5 ? 'sev-1' : 'sev-0',
      label: 'Proyección 2026',
      value: `~${proj.toLocaleString()}`,
      detail: pct != null ? `${pct > 0 ? '+' : ''}${pct.toFixed(1)}% vs 2025` : `Base ${ytdMaxMonth} meses`,
    })
  }

  const modalCounts = {}
  for (const inc of incidents) modalCounts[inc.modalidad] = (modalCounts[inc.modalidad] || 0) + 1
  const topModal = Object.entries(modalCounts).sort((a, b) => b[1] - a[1])[0]
  if (topModal) {
    const pct = topModal[1] / incidents.length * 100
    insights.push({
      id: 'topModal', type: 'sev-3',
      label: 'Delito más frecuente',
      value: topModal[0].length > 16 ? topModal[0].slice(0, 16) + '…' : topModal[0],
      detail: `${topModal[1].toLocaleString()} casos · ${pct.toFixed(0)}% del total`,
    })
  }

  const dayCounts = Array(7).fill(0); let dayTotal = 0
  for (const inc of incidents) { if (inc.day_of_week != null) { dayCounts[inc.day_of_week]++; dayTotal++ } }
  if (dayTotal > 0) {
    const maxIdx = dayCounts.indexOf(Math.max(...dayCounts))
    insights.push({
      id: 'peakDay', type: 'sev-2',
      label: 'Día de mayor riesgo',
      value: DAYS_FULL[maxIdx],
      detail: `${dayCounts[maxIdx].toLocaleString()} incidencias · ${(dayCounts[maxIdx]/dayTotal*100).toFixed(1)}% del total`,
    })
  }

  const slotCounts = Object.fromEntries(TIME_SLOTS.map(k => [k, 0])); let slotTotal = 0
  for (const inc of incidents) { if (inc.time_slot && slotCounts[inc.time_slot] !== undefined) { slotCounts[inc.time_slot]++; slotTotal++ } }
  if (slotTotal > 0) {
    const [peakSlot, peakCount] = Object.entries(slotCounts).sort((a, b) => b[1] - a[1])[0]
    insights.push({
      id: 'peakSlot', type: 'sev-2',
      label: 'Franja horaria crítica',
      value: TIME_SLOT_LABELS[peakSlot],
      detail: `${peakCount.toLocaleString()} casos · ${(peakCount/slotTotal*100).toFixed(1)}% del total`,
    })
  }

  return insights
}

function truncate(s, n) { return s.length > n ? s.slice(0, n) + '…' : s }
