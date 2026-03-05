import { useTheme } from '../contexts/ThemeContext'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button className="theme-toggle" onClick={toggle} aria-label="テーマ切り替え">
      {theme === 'dark' ? '☾ ダーク' : '☀ ライト'}
    </button>
  )
}
