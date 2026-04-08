import { createContext, useContext } from 'react'

export type Theme = 'light' | 'dark'

export type ThemeProviderState = {
  theme: Theme
  toggleTheme: () => void
}

export const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined,
)

export function useTheme() {
  const ctx = useContext(ThemeProviderContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
