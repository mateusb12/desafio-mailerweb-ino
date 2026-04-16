import { useEffect, useState } from "react"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
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

  if (loading) {
    return <p>Carregando...</p>
  }

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>

      <h1>Dashboard</h1>

      <p><b>Email:</b> {user.email}</p>
      <p><b>Role:</b> {user.role}</p>
      <p><b>Ativo:</b> {user.is_active ? "Sim" : "Não"}</p>

      <button onClick={logout}>
        Logout
      </button>

    </div>
  )
}