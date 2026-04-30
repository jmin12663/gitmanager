const STORAGE_KEY = 'gm-theme'

export type Theme = 'dark' | 'light'

export function getTheme(): Theme {
  return (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'dark'
}

export function applyTheme(theme: Theme) {
  if (theme === 'light') {
    document.documentElement.classList.add('light')
  } else {
    document.documentElement.classList.remove('light')
  }
  localStorage.setItem(STORAGE_KEY, theme)
}

export function toggleTheme(): Theme {
  const next = document.documentElement.classList.contains('light') ? 'dark' : 'light'
  applyTheme(next)
  return next
}