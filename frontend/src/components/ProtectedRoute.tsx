import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <main className="grid min-h-svh place-items-center bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-300">
        <div className="flex items-center gap-3 font-bold">
          <span
            className="size-[22px] animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-400"
            aria-hidden="true"
          />
          <span>Carregando...</span>
        </div>
      </main>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
