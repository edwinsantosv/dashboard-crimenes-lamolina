import { useState, useEffect, useRef, useCallback } from 'react'

const CACHE_KEY = 'lamolina_geocache_v2'
const RATE_LIMIT_MS = 1200
const LA_MOLINA_BBOX = [-12.15, -77.05, -11.95, -76.85]

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch { /* quota exceeded */ }
}

function normalizeAddress(addr) {
  return addr
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s.,áéíóúüñÁÉÍÓÚÜÑ]/gi, ' ')
    .trim()
    .toUpperCase()
    .slice(0, 120)
}

async function geocodeOne(address) {
  const query = `${address}, La Molina, Lima, Peru`
  const url = `https://nominatim.openstreetmap.org/search?` +
    `format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=pe` +
    `&viewbox=${LA_MOLINA_BBOX[3]},${LA_MOLINA_BBOX[2]},${LA_MOLINA_BBOX[1]},${LA_MOLINA_BBOX[0]}&bounded=0`

  const res = await fetch(url, {
    headers: { 'Accept-Language': 'es', 'User-Agent': 'LaMolinaDashboard/1.0' }
  })
  if (!res.ok) return null
  const data = await res.json()
  if (!data.length) return null
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
}

export function useGeocoding(topAddresses = []) {
  const [cache, setCache] = useState(loadCache)
  const [progress, setProgress] = useState({ done: 0, total: 0, running: false })
  const queueRef = useRef([])
  const timerRef = useRef(null)
  const cacheRef = useRef(cache)
  cacheRef.current = cache

  const processNext = useCallback(async () => {
    const addr = queueRef.current.shift()
    if (!addr) {
      setProgress(p => ({ ...p, running: false }))
      return
    }
    const key = normalizeAddress(addr)
    if (cacheRef.current[key] !== undefined) {
      setProgress(p => ({ ...p, done: p.done + 1 }))
      timerRef.current = setTimeout(processNext, 50)
      return
    }
    try {
      const coords = await geocodeOne(addr)
      const next = { ...cacheRef.current, [key]: coords }
      cacheRef.current = next
      setCache(next)
      saveCache(next)
    } catch { /* network error */ }
    setProgress(p => ({ ...p, done: p.done + 1 }))
    timerRef.current = setTimeout(processNext, RATE_LIMIT_MS)
  }, [])

  useEffect(() => {
    if (!topAddresses.length) return
    const cached = loadCache()
    const toGeocode = topAddresses.filter(a => {
      const key = normalizeAddress(a)
      return cached[key] === undefined
    })
    if (!toGeocode.length) return

    queueRef.current = toGeocode
    setProgress({ done: 0, total: toGeocode.length, running: true })
    processNext()

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [topAddresses.join('|')]) // eslint-disable-line

  const getCoords = useCallback((addr) => {
    const key = normalizeAddress(addr)
    return cacheRef.current[key] || null
  }, [])

  return { cache, progress, getCoords }
}
