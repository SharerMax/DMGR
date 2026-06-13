import { create } from 'zustand'

export type ThemeMode = 'system' | 'light' | 'dark'

interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  initTheme: () => void
}

const THEME_KEY = 'domain-manager-theme'

export const useThemeStore = create<ThemeState>(set => ({
  mode: 'system',

  setMode: (mode) => {
    set({ mode })
    localStorage.setItem(THEME_KEY, mode)
    applyTheme(mode)
  },

  initTheme: () => {
    const saved = localStorage.getItem(THEME_KEY) as ThemeMode | null
    const mode = saved || 'system'
    set({ mode })
    applyTheme(mode)
  },
}))

function applyTheme(mode: ThemeMode) {
  const html = document.documentElement

  // 移除所有主题类
  html.classList.remove('dark')

  if (mode === 'dark') {
    html.classList.add('dark')
  }
  else if (mode === 'system') {
    // 跟随系统
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      html.classList.add('dark')
    }
  }
  // light 模式使用默认样式，不添加任何类
}

// 监听系统主题变化
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const mode = localStorage.getItem(THEME_KEY) as ThemeMode
    if (mode === 'system') {
      const html = document.documentElement
      if (e.matches) {
        html.classList.add('dark')
      }
      else {
        html.classList.remove('dark')
      }
    }
  })
}
