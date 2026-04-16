import { useThemeMode } from "../hooks/useThemeMode"

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useThemeMode()

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      title={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <span className="theme-toggle-thumb">
          {isDark ? (
            <svg viewBox="0 0 24 24" className="theme-toggle-icon">
              <path d="M20.5 15.2A7.6 7.6 0 0 1 8.8 3.5a8.7 8.7 0 1 0 11.7 11.7Z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="theme-toggle-icon">
              <path d="M12 5.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm0-4a1 1 0 0 1 1 1v1.1a1 1 0 1 1-2 0V2.5a1 1 0 0 1 1-1Zm0 18.9a1 1 0 0 1 1 1v1.1a1 1 0 1 1-2 0v-1.1a1 1 0 0 1 1-1ZM4.2 4.2a1 1 0 0 1 1.4 0l.8.8A1 1 0 1 1 5 6.4l-.8-.8a1 1 0 0 1 0-1.4Zm13.4 13.4a1 1 0 0 1 1.4 0l.8.8a1 1 0 0 1-1.4 1.4l-.8-.8a1 1 0 0 1 0-1.4ZM1.5 12a1 1 0 0 1 1-1h1.1a1 1 0 1 1 0 2H2.5a1 1 0 0 1-1-1Zm18.9 0a1 1 0 0 1 1-1h1.1a1 1 0 1 1 0 2h-1.1a1 1 0 0 1-1-1ZM5 17.6A1 1 0 1 1 6.4 19l-.8.8a1 1 0 0 1-1.4-1.4l.8-.8ZM18.4 4.2a1 1 0 0 1 1.4 1.4l-.8.8A1 1 0 1 1 17.6 5l.8-.8Z" />
            </svg>
          )}
        </span>
      </span>
    </button>
  )
}
