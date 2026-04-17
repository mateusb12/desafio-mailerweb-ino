import { NavLink } from "react-router-dom"
import { useAuth } from "../hooks/authContext"

const navItemClass =
  "flex min-h-11 items-center gap-3 rounded-lg px-3.5 text-sm font-extrabold text-slate-600 transition-[background,color,box-shadow] duration-150 hover:bg-slate-100 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300"

const activeNavItemClass =
  "bg-blue-50 text-blue-700 shadow-[inset_3px_0_0_#2563eb] hover:bg-blue-50 dark:bg-blue-950/45 dark:text-blue-200 dark:shadow-[inset_3px_0_0_#60a5fa] dark:hover:bg-blue-950/45"

export default function AppSidebar() {
  const { user } = useAuth()

  return (
    <aside className="flex min-h-svh w-[252px] flex-none flex-col border-r border-slate-200/90 bg-white/82 px-4 py-5 shadow-[10px_0_30px_rgba(23,32,51,0.04)] backdrop-blur-xl max-[760px]:min-h-0 max-[760px]:w-full max-[760px]:border-b max-[760px]:border-r-0 max-[760px]:py-4 dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-none">
      <div className="flex items-center gap-3 px-1">
        <div
          className="inline-grid size-10 flex-none place-items-center rounded-lg bg-[linear-gradient(135deg,#2563eb,#0f766e)] text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(37,99,235,0.24)]"
          aria-hidden="true"
        >
          MW
        </div>
        <div className="min-w-0">
          <p className="m-0 text-[0.95rem] font-extrabold leading-tight text-[#172033] dark:text-slate-50">
            MailerWeb
          </p>
          <p className="m-0 mt-0.5 truncate text-xs font-bold text-slate-500 dark:text-slate-400">
            Reservas
          </p>
        </div>
      </div>

      <nav
        className="mt-8 grid gap-1.5 max-[760px]:mt-5"
        aria-label="Navegação principal"
      >
        <NavLink
          className={({ isActive }) =>
            `${navItemClass} ${isActive ? activeNavItemClass : ""}`
          }
          to="/app"
          end
        >
          <svg
            className="size-5 flex-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 13h8V3H3v10Z" />
            <path d="M13 21h8V11h-8v10Z" />
            <path d="M13 3h8v6h-8V3Z" />
            <path d="M3 21h8v-6H3v6Z" />
          </svg>
          Dashboard
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            `${navItemClass} ${isActive ? activeNavItemClass : ""}`
          }
          to="/app/salas"
        >
          <svg
            className="size-5 flex-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 21h18" />
            <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
            <path d="M9 9h1" />
            <path d="M14 9h1" />
            <path d="M9 13h1" />
            <path d="M14 13h1" />
          </svg>
          Salas
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            `${navItemClass} ${isActive ? activeNavItemClass : ""}`
          }
          to="/app/reservas"
        >
          <svg
            className="size-5 flex-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M8 2v4" />
            <path d="M16 2v4" />
            <path d="M3 10h18" />
            <path d="M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
            <path d="M8 14h.01" />
            <path d="M12 14h.01" />
            <path d="M16 14h.01" />
          </svg>
          Reservas
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            `${navItemClass} ${isActive ? activeNavItemClass : ""}`
          }
          to="/app/emails"
        >
          <svg
            className="size-5 flex-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
            <path d="m22 7-8.97 5.7a2 2 0 0 1-2.06 0L2 7" />
          </svg>
          Emails
        </NavLink>
      </nav>

      <div className="mt-auto border-t border-slate-200 pt-4 max-[760px]:mt-5 dark:border-slate-800">
        <p className="m-0 text-xs font-extrabold uppercase tracking-[0.04em] text-slate-400 dark:text-slate-500">
          Sessão
        </p>
        <p className="m-0 mt-1 truncate text-sm font-bold text-slate-600 dark:text-slate-300">
          {user?.email}
        </p>
      </div>
    </aside>
  )
}
