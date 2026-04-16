import { createContext, useContext, useEffect, useState } from "react"
import { auth, type UserProfile } from "../api/auth"

type AuthContextType = {
  user: UserProfile | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      const token = auth.getToken()

      if (!token) {
        setLoading(false)
        return
      }

      try {
        setUser(await auth.me())
      } catch {
        auth.logout()
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  async function login(email: string, password: string) {
    const data = await auth.login(email, password)

    auth.setToken(data.access_token)
    setUser(await auth.me())
  }

  async function register(email: string, password: string) {
    await auth.register(email, password)
    await login(email, password)
  }

  function logout() {
    auth.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider")
  }

  return context
}
