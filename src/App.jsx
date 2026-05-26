import { useState, useCallback } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import MapView from './pages/MapView'
import PivotTable from './pages/PivotTable'
import { DataProvider } from './hooks/useData.jsx'
import { ThemeProvider, useTheme } from './hooks/useTheme.jsx'

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, toggle } = useTheme()
  const openSidebar  = useCallback(() => setSidebarOpen(true),  [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  return (
    <div className="layout">

      {/* ── Mobile top bar ──── */}
      <div className="mobile-topbar">
        <button className="hamburger" onClick={openSidebar} aria-label="Abrir menú">
          <span /><span /><span />
        </button>
        <span className="mobile-title">La Molina · Datos de Seguridad</span>
      </div>

      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} aria-hidden />}

      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} theme={theme} onToggleTheme={toggle} />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/mapa"      element={<MapView />} />
          <Route path="/pivot"     element={<PivotTable />} />
        </Routes>
      </main>

    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <DataProvider>
        <AppShell />
      </DataProvider>
    </ThemeProvider>
  )
}
