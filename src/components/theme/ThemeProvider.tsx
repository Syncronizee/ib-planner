'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_THEME, THEME_STORAGE_KEY, ThemeId, themeOptions, themeVars } from './themes'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: ThemeId
  storageKey?: string
}

type ThemeContextValue = {
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
  themes: typeof themeOptions
  mounted: boolean
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function applyTheme(theme: ThemeId) {
  const root = document.documentElement
  const vars = themeVars[theme]

  root.dataset.theme = theme
  for (const [token, value] of Object.entries(vars)) {
    root.style.setProperty(token, value)
  }
}

export function ThemeProvider({
  children,
  defaultTheme = DEFAULT_THEME,
  storageKey = THEME_STORAGE_KEY,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeId>(defaultTheme)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    let nextTheme = defaultTheme
    const storedTheme = localStorage.getItem(storageKey) as ThemeId | null

    if (storedTheme && storedTheme in themeVars) {
      nextTheme = storedTheme
    }

    setThemeState(nextTheme)
    applyTheme(nextTheme)
    setMounted(true)
  }, [defaultTheme, storageKey])

  const setTheme = (nextTheme: ThemeId) => {
    setThemeState(nextTheme)
    applyTheme(nextTheme)
    localStorage.setItem(storageKey, nextTheme)
  }

  const value = useMemo(
    () => ({ theme, setTheme, themes: themeOptions, mounted }),
    [theme, mounted]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}
