import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [isTeal, setIsTeal] = useState(() => localStorage.getItem('tc-theme') === 'teal')

  useEffect(() => {
    if (isTeal) {
      document.documentElement.classList.add('teal-theme')
      localStorage.setItem('tc-theme', 'teal')
    } else {
      document.documentElement.classList.remove('teal-theme')
      localStorage.setItem('tc-theme', 'dark')
    }
  }, [isTeal])

  return (
    <ThemeContext.Provider value={{ isTeal, toggleTheme: () => setIsTeal((v) => !v) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
