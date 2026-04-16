import ThemeToggle from "./ThemeToggle"
import { useAuth } from "../hooks/authContext"

export default function AppTopbar() {
  const { logout } = useAuth()

  return (
    <header className="sticky top-0 z-10 flex min-h-[72px] items-center justify-end border-b border-slate-200/80 bg-white/72 px-8 backdrop-blur-xl max-[760px]:px-4 dark:border-slate-800 dark:bg-slate-950/64">
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <button
          type="button"
          className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-extrabold text-[#172033] shadow-[0_10px_22px_rgba(23,32,51,0.06)] transition-[background,border-color,color,box-shadow] duration-150 hover:border-blue-600 hover:text-blue-700 hover:shadow-[0_14px_28px_rgba(23,32,51,0.1)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:hover:border-blue-400 dark:hover:text-blue-300 dark:hover:shadow-[0_16px_30px_rgba(0,0,0,0.24)]"
          onClick={logout}
        >
          <svg
            className="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10 17l5-5-5-5" />
            <path d="M15 12H3" />
            <path d="M21 3v18" />
          </svg>
          Logout
        </button>
      </div>
    </header>
  )
}
