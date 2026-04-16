import { useEffect, useState } from "react"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

type UserProfile = {
  email: string
  role: string
  is_active: boolean
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUser() {

      const token = localStorage.getItem("token")

      if (!token) {
        window.location.href = "/login"
        return
      }

      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        localStorage.removeItem("token")
        window.location.href = "/login"
        return
      }

      const data = await response.json()
      setUser(data)
      setLoading(false)
    }

    fetchUser()

  }, [])

  function logout() {
    localStorage.removeItem("token")
    window.location.href = "/login"
  }

  if (loading || !user) {
    return (
      <main className="app-page">
        <div className="loading-state">
          <span className="spinner" aria-hidden="true" />
          <span>Carregando...</span>
        </div>
      </main>
    )
  }

  return (
    <main className="app-page">
      <section className="dashboard-shell">
        <header className="dashboard-header">
          <div>
            <span className="auth-badge">Área autenticada</span>
            <h1>Dashboard</h1>
            <p>Resumo do usuário conectado ao sistema de reservas.</p>
          </div>

          <button className="secondary-button" onClick={logout}>
            Logout
          </button>
        </header>

        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="brand-mark small" aria-hidden="true">
              <span>MW</span>
            </div>
            <div>
              <h2>Perfil</h2>
              <p>Dados retornados pela API para a sessão atual.</p>
            </div>
          </div>

          <dl className="profile-grid">
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{user.role}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span className={user.is_active ? "status-pill active" : "status-pill"}>
                  {user.is_active ? "Ativo" : "Inativo"}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  )
}
