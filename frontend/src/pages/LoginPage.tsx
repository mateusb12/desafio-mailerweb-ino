import { useState } from "react"
import heroImage from "../assets/hero.png"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (loading) return

    setError("")
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.detail || "Não foi possível fazer login.")
      }

      const data = await response.json()

      localStorage.setItem("token", data.access_token)
      window.location.href = "/app"
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível fazer login."
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-brand">
          <div className="brand-mark" aria-hidden="true">
            <span>MW</span>
          </div>
          <span className="auth-badge">Meeting Room Booking</span>
          <h1>Reservas MailerWeb</h1>
          <p>
            Faça login para acessar o sistema de reservas e acompanhar suas
            reuniões.
          </p>
          <div className="auth-hero" aria-hidden="true">
            <img src={heroImage} alt="" />
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-card-header">
            <h2>Entrar</h2>
            <p>Digite suas credenciais para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                placeholder="Digite sua senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {error && (
              <div className="auth-error" role="alert" aria-live="polite">
                <span className="auth-error-icon" aria-hidden="true">
                  !
                </span>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading || !email || !password}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
