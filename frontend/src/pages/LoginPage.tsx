import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { API_URL } from "../api/client"
import ThemeToggle from "../components/ThemeToggle"
import { useAuth } from "../hooks/useAuth"
import heroImage from "../assets/hero.png"

type ApiStatus = "checking" | "online" | "offline"

const pageBackground =
  "min-h-svh bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.14),transparent_34rem),linear-gradient(135deg,#f6f7fb_0%,#eef3f8_100%)] text-[#172033] dark:bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.16),transparent_34rem),linear-gradient(135deg,#0f172a_0%,#111827_100%)] dark:text-slate-50"

const badgeClass =
  "inline-flex min-h-[30px] items-center rounded-full border border-blue-600/20 bg-white/75 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.04em] text-blue-700 dark:border-blue-300/30 dark:bg-[#172033]/70 dark:text-blue-300"

const apiStatusClasses: Record<ApiStatus, string> = {
  checking:
    "border-orange-200 bg-orange-50 text-amber-600 dark:border-amber-300/35 dark:bg-amber-950/35 dark:text-amber-300",
  online:
    "border-green-200 bg-green-50 text-green-600 dark:border-green-400/35 dark:bg-green-950/35 dark:text-green-300",
  offline:
    "border-red-200 bg-red-50 text-red-600 dark:border-red-400/35 dark:bg-red-950/35 dark:text-red-300",
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking")

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 4500)

    async function checkApiHealth() {
      setApiStatus("checking")

      try {
        const response = await fetch(`${API_URL}/health`, {
          cache: "no-store",
          signal: controller.signal,
        })

        setApiStatus(response.ok ? "online" : "offline")
      } catch {
        setApiStatus("offline")
      } finally {
        window.clearTimeout(timeout)
      }
    }

    checkApiHealth()

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [])

  const isApiAvailable = apiStatus === "online"
  const apiStatusLabel = {
    checking: "Verificando API...",
    online: "API online",
    offline: "API offline",
  }[apiStatus]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (loading || !isApiAvailable) return

    setError("")
    setLoading(true)

    try {
      await login(email, password)
      const from = (location.state as { from?: { pathname?: string } } | null)?.from
      navigate(from?.pathname ?? "/app", { replace: true })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível fazer login."
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={`${pageBackground} grid place-items-center px-5 py-10 max-[820px]:px-4 max-[820px]:py-6 max-[480px]:items-start max-[480px]:justify-items-center`}
    >
      <div className="fixed right-[18px] top-[18px] z-10">
        <ThemeToggle />
      </div>

      <div className="grid w-full max-w-[980px] grid-cols-[minmax(0,1fr)_minmax(360px,440px)] items-center gap-14 max-[820px]:grid-cols-1 max-[820px]:gap-7">
        <div className="flex flex-col items-start gap-4 max-[820px]:items-center max-[820px]:text-center">
          <div
            className="inline-grid size-14 place-items-center rounded-lg bg-[linear-gradient(135deg,#2563eb,#0f766e)] font-extrabold text-white shadow-[0_12px_28px_rgba(37,99,235,0.28)] max-[480px]:size-[50px]"
            aria-hidden="true"
          >
            <span>MW</span>
          </div>
          <span className={badgeClass}>Meeting Room Booking</span>
          <h1 className="m-0 max-w-[12ch] text-[clamp(2.3rem,5vw,4rem)] leading-[0.98] tracking-normal text-[#172033] dark:text-slate-50">
            Reservas MailerWeb
          </h1>
          <p className="m-0 max-w-[34rem] text-[1.04rem] leading-relaxed text-slate-500 max-[820px]:max-w-[28rem] dark:text-slate-300">
            Faça login para acessar o sistema de reservas e acompanhar suas
            reuniões.
          </p>
          <div
            className="mt-2.5 w-[min(320px,72vw)] rounded-xl border border-white/70 bg-white/55 p-[18px] shadow-[0_12px_28px_rgba(23,32,51,0.08)] max-[820px]:hidden dark:border-slate-600/80 dark:bg-[#172033]/55 dark:shadow-[0_16px_36px_rgba(0,0,0,0.24)]"
            aria-hidden="true"
          >
            <img className="block h-auto w-full" src={heroImage} alt="" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white/90 p-[30px] shadow-[0_22px_50px_rgba(23,32,51,0.12),0_8px_18px_rgba(23,32,51,0.06)] backdrop-blur-md max-[480px]:p-[22px] dark:border-slate-600/80 dark:bg-[#172033]/90 dark:shadow-[0_24px_58px_rgba(0,0,0,0.38),0_10px_24px_rgba(0,0,0,0.24)]">
          <div className="mb-5 flex justify-center max-[480px]:justify-start">
            <div
              className={`inline-flex min-h-[30px] items-center gap-2 rounded-full border px-[11px] py-1.5 text-[0.82rem] font-extrabold ${apiStatusClasses[apiStatus]}`}
              title={`Backend: ${API_URL}`}
              aria-live="polite"
            >
              <span
                className={`size-[9px] rounded-full ${
                  apiStatus === "checking"
                    ? "animate-pulse bg-amber-600 dark:bg-amber-300"
                    : apiStatus === "online"
                      ? "bg-green-600 dark:bg-green-300"
                      : "bg-red-600 dark:bg-red-300"
                }`}
                aria-hidden="true"
              />
              <span>{apiStatusLabel}</span>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="mb-1.5 mt-0 text-[1.35rem] leading-tight tracking-normal text-[#172033] dark:text-slate-50">
              Entrar
            </h2>
            <p className="m-0 leading-relaxed text-slate-500 dark:text-slate-300">
              Digite suas credenciais para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-[18px]">
            <div className="grid gap-2 text-left">
              <label
                className="text-[0.92rem] font-bold text-[#172033] dark:text-slate-50"
                htmlFor="email"
              >
                Email
              </label>
              <input
                className="h-[46px] w-full rounded-lg border border-slate-200 bg-white px-3.5 text-[#172033] outline-none transition-[border-color,box-shadow,background] duration-150 placeholder:text-slate-400 focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.14)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-[#172033] dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:shadow-[0_0_0_4px_rgba(96,165,250,0.18)] dark:disabled:bg-slate-900"
                id="email"
                type="email"
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="grid gap-2 text-left">
              <label
                className="text-[0.92rem] font-bold text-[#172033] dark:text-slate-50"
                htmlFor="password"
              >
                Senha
              </label>
              <input
                className="h-[46px] w-full rounded-lg border border-slate-200 bg-white px-3.5 text-[#172033] outline-none transition-[border-color,box-shadow,background] duration-150 placeholder:text-slate-400 focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.14)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-[#172033] dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:shadow-[0_0_0_4px_rgba(96,165,250,0.18)] dark:disabled:bg-slate-900"
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
              <div
                className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-left text-sm leading-[1.45] text-red-800 dark:border-red-400/35 dark:bg-red-950/35 dark:text-red-200"
                role="alert"
                aria-live="polite"
              >
                <span
                  className="inline-grid size-5 flex-none place-items-center rounded-full bg-red-600 text-xs font-extrabold text-white dark:bg-red-400"
                  aria-hidden="true"
                >
                  !
                </span>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="mt-1 inline-flex min-h-[46px] w-full cursor-pointer items-center justify-center rounded-lg bg-blue-600 font-extrabold text-white shadow-[0_12px_22px_rgba(37,99,235,0.22)] transition-[transform,box-shadow,background] duration-150 hover:-translate-y-px hover:bg-blue-700 hover:shadow-[0_16px_26px_rgba(37,99,235,0.26)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:translate-y-0 dark:bg-blue-400 dark:text-slate-950 dark:shadow-[0_12px_24px_rgba(96,165,250,0.18)] dark:hover:bg-blue-200"
              disabled={loading || !email || !password || !isApiAvailable}
            >
              {loading
                ? "Entrando..."
                : isApiAvailable
                  ? "Entrar"
                  : "Aguardando API"}
            </button>

            <p className="m-0 text-center text-sm text-slate-500 dark:text-slate-300">
              Não tem conta?{" "}
              <Link
                className="font-extrabold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
                to="/register"
              >
                Criar conta
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
