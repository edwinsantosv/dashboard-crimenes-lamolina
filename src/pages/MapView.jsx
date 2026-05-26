import { useState, useMemo, useCallback, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import { useData } from '../hooks/useData.jsx'
import { useTheme } from '../hooks/useTheme.jsx'
import { filterIncidents, YEAR_HEX } from '../utils/dataUtils'
import ModalidadSelect from '../components/ModalidadSelect.jsx'

const ALL_YEARS        = [2022, 2023, 2024, 2025, 2026]
const LA_MOLINA_CENTER = [-12.0850, -76.9392]
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const TILE_DARK  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTR  = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
const CLUSTER_RADIUS_PX = 40  // pixels at current zoom

function normalizeAddress(addr) {
  return addr.replace(/[^\w\s.,áéíóúüñÁÉÍÓÚÜÑ]/gi, ' ')
    .replace(/\s+/g, ' ').trim().toUpperCase().slice(0, 120)
}

function sevHex(count, max) {
  const t = count / max
  if (t < 0.15) return '#8FA3AB'
  if (t < 0.40) return '#E8A33F'
  if (t < 0.70) return '#E0651D'
  return '#C5263A'
}

// Merge two frequency objects (e.g. byYear, byMod)
function mergeFreq(a, b) {
  const out = { ...a }
  for (const [k, v] of Object.entries(b)) out[k] = (out[k] || 0) + v
  return out
}

// Greedy pixel-radius clustering
function buildClusters(markers, map, radiusPx) {
  if (!markers.length) return []

  // Convert to pixel coords (stable per-zoom snapshot)
  const pts = markers.map(m => ({
    ...m,
    px: map.latLngToContainerPoint([m.lat, m.lng]),
  }))

  // Sort descending by count so high-traffic locations act as seeds
  pts.sort((a, b) => b.count - a.count)

  const used = new Set()
  const result = []

  for (let i = 0; i < pts.length; i++) {
    if (used.has(i)) continue
    const seed = pts[i]
    used.add(i)

    const members = [seed]
    let sumLat = seed.lat * seed.count
    let sumLng = seed.lng * seed.count
    let totalCount = seed.count
    let byYear = { ...seed.byYear }
    let bySector = { ...seed.bySector }
    let modalidades = { ...seed.modalidades }

    for (let j = i + 1; j < pts.length; j++) {
      if (used.has(j)) continue
      const dx = seed.px.x - pts[j].px.x
      const dy = seed.px.y - pts[j].px.y
      if (dx * dx + dy * dy <= radiusPx * radiusPx) {
        const m = pts[j]
        used.add(j)
        members.push(m)
        sumLat += m.lat * m.count
        sumLng += m.lng * m.count
        totalCount += m.count
        byYear = mergeFreq(byYear, m.byYear)
        bySector = mergeFreq(bySector, m.bySector)
        modalidades = mergeFreq(modalidades, m.modalidades)
      }
    }

    const topYear   = Number(Object.entries(byYear).sort((a, b) => b[1] - a[1])[0]?.[0])
    const topSector = Object.entries(bySector).sort((a, b) => b[1] - a[1])[0]?.[0]
    const sortedMods = Object.entries(modalidades).sort((a, b) => b[1] - a[1])

    result.push({
      id: seed.key,
      lat: sumLat / totalCount,
      lng: sumLng / totalCount,
      count: totalCount,
      locationCount: members.length,
      byYear,
      bySector,
      topYear,
      topSector,
      topMods: sortedMods.slice(0, 3),
      topAddresses: members.slice(0, 3).map(m => m.direccion),
    })
  }

  return result
}

function Loading() {
  return <div className="loading-wrap"><div className="spinner" /><span>Cargando datos…</span></div>
}

function CenterButton() {
  const map = useMap()
  return (
    <button onClick={() => map.setView(LA_MOLINA_CENTER, 13)} style={{
      position: 'absolute', top: 16, right: 16, zIndex: 1000,
      background: 'var(--bg-panel)', border: '1px solid var(--border)',
      color: 'var(--fg)', borderRadius: 8, padding: '6px 12px',
      fontSize: 12, cursor: 'pointer', boxShadow: 'var(--shadow-sm)',
    }}>🎯 Centrar</button>
  )
}

// Lives inside MapContainer — rebuilds clusters on every zoom/pan
function ClusterLayer({ markers, colorMode, maxRaw }) {
  const map = useMap()
  const [clusters, setClusters] = useState([])

  const rebuild = useCallback(() => {
    setClusters(buildClusters(markers, map, CLUSTER_RADIUS_PX))
  }, [markers, map])

  useEffect(() => {
    rebuild()
    map.on('moveend zoomend', rebuild)
    return () => { map.off('moveend zoomend', rebuild) }
  }, [map, rebuild])

  const maxCount = Math.max(...clusters.map(c => c.count), 1)
  const markerRadius = (count) => 8 + (count / maxCount) * 28

  function getColor(cl) {
    return sevHex(cl.count, maxCount)
  }

  return clusters.map(cl => {
    const color = getColor(cl)
    const isMerged = cl.locationCount > 1
    return (
      <CircleMarker
        key={cl.id}
        center={[cl.lat, cl.lng]}
        radius={markerRadius(cl.count)}
        pathOptions={{ fillColor: color, fillOpacity: 0.55, color, weight: isMerged ? 2 : 1.5, opacity: 0.9 }}
      >
        <Popup>
          <div style={{ minWidth: 210, fontFamily: 'var(--font-body)', fontSize: 12 }}>
            {/* Header */}
            <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13, color }}>
              🚨 {cl.count.toLocaleString()} incidencia{cl.count !== 1 ? 's' : ''}
            </div>

            {isMerged ? (
              <>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 8 }}>
                  📍 {cl.locationCount} ubicaciones agrupadas
                </div>
                {cl.topAddresses.map((addr, i) => (
                  <div key={i} style={{ fontSize: 10, color: 'var(--fg-dim)', marginBottom: 2, lineHeight: 1.3 }}>
                    · {addr.length > 50 ? addr.slice(0, 50) + '…' : addr}
                  </div>
                ))}
                {cl.locationCount > 3 && (
                  <div style={{ fontSize: 10, color: 'var(--fg-dim)', marginBottom: 6 }}>
                    … y {cl.locationCount - 3} más
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: 'var(--fg-muted)', marginBottom: 8, lineHeight: 1.4 }}>
                📍 {cl.topAddresses[0]}
              </div>
            )}

            {/* Top modalidades */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 6 }}>
              {cl.topMods.map(([mod, cnt]) => (
                <div key={mod} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
                  <span style={{ color: 'var(--fg-muted)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {mod.length > 28 ? mod.slice(0, 28) + '…' : mod}
                  </span>
                  <strong style={{ color: 'var(--fg)', fontSize: 11, flexShrink: 0 }}>{cnt}</strong>
                </div>
              ))}
            </div>

            {/* Year pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
              {Object.entries(cl.byYear).sort().map(([y, c]) => (
                <span key={y} style={{
                  background: (YEAR_HEX[Number(y)] || '#6B7A82') + '22',
                  border: `1px solid ${YEAR_HEX[Number(y)] || '#6B7A82'}`,
                  borderRadius: 4, padding: '1px 6px', fontSize: 10,
                  color: YEAR_HEX[Number(y)] || '#6B7A82',
                }}>{y}: {c}</span>
              ))}
            </div>

            {isMerged && (
              <div style={{ marginTop: 8, fontSize: 10, color: 'var(--fg-dim)' }}>
                💡 Acerca el zoom para separar las ubicaciones
              </div>
            )}
          </div>
        </Popup>
      </CircleMarker>
    )
  })
}

function MapLegend() {
  return (
    <div className="map-legend">
      <h4>Densidad</h4>
      {[['#8FA3AB','Baja'],['#E8A33F','Media'],['#E0651D','Alta'],['#C5263A','Crítica']].map(([c,l]) => (
        <div key={l} className="legend-item">
          <div className="legend-dot" style={{ background: c + 'aa', border: `2px solid ${c}` }} />
          <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{l}</span>
        </div>
      ))}
      <h4 style={{ marginTop: 10 }}>Radio</h4>
      {[[5,8],[20,14],[50,20]].map(([n,size]) => (
        <div key={n} className="legend-item">
          <div className="legend-dot" style={{ width: size, height: size, background: 'var(--border)', border: '1px solid var(--border-strong)' }} />
          <span style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{n}+ casos</span>
        </div>
      ))}
    </div>
  )
}

export default function MapView() {
  const { data, loading, error } = useData()
  const { isDark } = useTheme()
  const [activeYears, setActiveYears] = useState([2023, 2024, 2025, 2026])
  const [modalidad,   setModalidad]   = useState('TODAS')
  const colorMode = 'heat'

  const tileUrl = isDark ? TILE_DARK : TILE_LIGHT

  const geocodedLocations = useMemo(() => data?.geocoded_locations || {}, [data])

  const topModalidades = useMemo(() => {
    if (!data) return []
    const counts = {}
    for (const inc of data.incidents) counts[inc.modalidad] = (counts[inc.modalidad] || 0) + 1
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([m]) => m)
  }, [data])

  const filtered = useMemo(() => {
    if (!data) return []
    return filterIncidents(data.incidents, { years: activeYears, modalidad })
  }, [data, activeYears, modalidad])

  // Group incidents by address
  const addressGroups = useMemo(() => {
    const groups = {}
    for (const inc of filtered) {
      if (!inc.direccion) continue
      const key = normalizeAddress(inc.direccion)
      if (!groups[key]) groups[key] = { direccion: inc.direccion, key, count: 0, byYear: {}, bySector: {}, modalidades: {} }
      groups[key].count++
      groups[key].byYear[inc.year] = (groups[key].byYear[inc.year] || 0) + 1
      const s = inc.sector ?? 'Sin sector'
      groups[key].bySector[s] = (groups[key].bySector[s] || 0) + 1
      groups[key].modalidades[inc.modalidad] = (groups[key].modalidades[inc.modalidad] || 0) + 1
    }
    return Object.values(groups)
  }, [filtered])

  // Resolve geocoords for each address group
  const markers = useMemo(() => {
    return addressGroups.map(cl => {
      const coords = geocodedLocations[cl.key]
      if (!coords) return null
      const topYear   = Number(Object.entries(cl.byYear).sort((a, b) => b[1] - a[1])[0]?.[0])
      const topSector = Object.entries(cl.bySector).sort((a, b) => b[1] - a[1])[0]?.[0]
      return { ...cl, lat: coords.lat, lng: coords.lng, topYear, topSector }
    }).filter(Boolean)
  }, [addressGroups, geocodedLocations])

  const totalIncidents = markers.reduce((s, m) => s + m.count, 0)
  const coverage = addressGroups.length > 0 ? Math.round(markers.length / addressGroups.length * 100) : 0

  function toggleYear(y) {
    setActiveYears(prev => prev.includes(y) ? prev.filter(x => x !== y) : [...prev, y])
  }

  if (loading) return <Loading />
  if (error)   return <div className="loading-wrap"><span style={{ color: 'var(--up)' }}>Error: {error}</span></div>

  return (
    <>
      <div className="page-header">
        <h1>¿Dónde están los puntos críticos?</h1>
        <p>
          {markers.length} ubicaciones · {totalIncidents.toLocaleString()} de {filtered.length.toLocaleString()} incidencias
          · Cobertura {coverage}%
          {data?.meta?.geocoded_count && <span style={{ color: 'var(--accent)' }}> · {data.meta.geocoded_count} geocodificadas</span>}
        </p>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <span className="filter-label">Año</span>
        {ALL_YEARS.map(y => (
          <button key={y}
            className={`filter-chip y${y}${activeYears.includes(y) ? ' yactive' : ''}`}
            onClick={() => toggleYear(y)}>{y}
          </button>
        ))}
        <span className="filter-label" style={{ marginLeft: 8 }}>Modalidad</span>
        <ModalidadSelect
          value={modalidad}
          onChange={e => setModalidad(e.target.value)}
          availableModalidades={topModalidades}
        />
      </div>

      <div style={{ position: 'relative', isolation: 'isolate' }}>
        <MapContainer
          center={LA_MOLINA_CENTER} zoom={13}
          style={{ height: 'calc(100vh - 200px)', minHeight: 360, borderRadius: 14, border: '1px solid var(--border)' }}
        >
          <TileLayer url={tileUrl} attribution={TILE_ATTR} subdomains="abcd" maxZoom={19} />
          <CenterButton />
          <ClusterLayer markers={markers} colorMode={colorMode} />
        </MapContainer>

        <MapLegend />
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--fg-dim)' }}>
        Mapa: CARTO · Geocoding: OpenStreetMap Nominatim · Agrupación: radio {CLUSTER_RADIUS_PX}px (se actualiza con el zoom)
      </div>
    </>
  )
}
