const THEME_KEY = "theme"
const DEFAULT_THEME = "coolors-soft"

export function getTheme(): string {
  if (typeof window === "undefined") return DEFAULT_THEME
  try {
    const stored = localStorage.getItem(THEME_KEY)
    return stored ?? DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export function setTheme(themeName: string): void {
  try {
    localStorage.setItem(THEME_KEY, themeName)
  } catch {
    // ignore
  }
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", themeName)
  }
}

export function initTheme(): void {
  setTheme(getTheme())
}
