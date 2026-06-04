import { NavLink } from 'react-router-dom'

const IconDashboard = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
)
const IconMap = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
    <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
  </svg>
)
const IconTable = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="3" y1="9" x2="21" y2="9"/>
    <line x1="3" y1="15" x2="21" y2="15"/>
    <line x1="9" y1="9" x2="9" y2="21"/>
  </svg>
)
const IconShield = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const IconSun = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)
const IconMoon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)

export default function Sidebar({ isOpen, onClose, theme, onToggleTheme }) {
  const isDark = theme === 'dark'
  return (
    <aside className={`sidebar${isOpen ? ' sidebar--open' : ''}`}>
      <button className="sidebar-close" onClick={onClose} aria-label="Cerrar">✕</button>

      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">
          <span className="sidebar-brand-name">La Molina<br />Datos de Seguridad</span>
        </div>
        <div className="sidebar-brand-sub">
          Incidencias 2022–2026<br />Comisaría La Molina · SIDPOL
        </div>
        <span className="sidebar-badge">📍 Lima, Perú</span>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Vistas</div>

        <NavLink to="/dashboard" onClick={onClose}
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <IconDashboard /> Resumen
        </NavLink>

        <NavLink to="/mapa" onClick={onClose}
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <IconMap /> Mapa de zonas
        </NavLink>

        <NavLink to="/pivot" onClick={onClose}
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <IconTable /> Tabla interactiva
        </NavLink>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '16px 16px 0' }}>
        <img src="/dashboard-crimenes-lamolina/logo-pnp.png" alt="PNP" className="sidebar-footer-logo" style={{ height: 52 }} />
        <img src="/dashboard-crimenes-lamolina/logo-idd.png" alt="IDD" className="sidebar-footer-logo" style={{ height: 52 }} />
      </div>

      <div className="theme-toggle">
        <button className={`theme-toggle-btn${!isDark ? ' active' : ''}`} onClick={() => !isDark || onToggleTheme()}>
          <IconSun /> Claro
        </button>
        <button className={`theme-toggle-btn${isDark ? ' active' : ''}`} onClick={() => isDark || onToggleTheme()}>
          <IconMoon /> Oscuro
        </button>
      </div>

      <div className="sidebar-footer">
        📋 Fuente: Comisaría La Molina<br />
        Datos oficiales SIDPOL · 2022–2026
      </div>
    </aside>
  )
}
