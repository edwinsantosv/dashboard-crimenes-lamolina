import { createContext, useContext, useState, useEffect } from 'react'

const ThemeCtx = createContext({ theme: 'light', toggle: () => {}, isDark: false })

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('la-molina:theme') || 'light'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('la-molina:theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  return (
    <ThemeCtx.Provider value={{ theme, toggle, isDark: theme === 'dark' }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeCtx)
}
