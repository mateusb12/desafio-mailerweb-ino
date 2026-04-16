import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import ThemeToggle from "../components/ThemeToggle"
import { useAuth } from "../hooks/useAuth"

const pageBackground =
  "min-h-svh bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.14),transparent_34rem),linear-gradient(135deg,#f6f7fb_0%,#eef3f8_100%)] text-[#172033] dark:bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.16),transparent_34rem),linear-gradient(135deg,#0f172a_0%,#111827_100%)] dark:text-slate-50"

function getApiErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    try {
      const parsed = JSON.parse(error.message) as {
        detail?: string | Array<{ msg?: string }>
      }

      if (typeof parsed.detail === "string") {
        return parsed.detail
      }

      if (Array.isArray(parsed.detail) && parsed.detail.length > 0) {
        return parsed.detail[0]?.msg || "Não foi possível criar a conta."
      }
    } catch {
      return error.message
    }

    return error.message
  }

  return "Não foi possível criar a conta."
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (loading) return

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.")
      return
    }

    setError("")
    setLoading(true)

    try {
      await register(name, email, password)
      navigate("/app", { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`${pageBackground} grid place-items-center px-5 py-10`}>
      <div className="fixed right-[18px] top-[18px] z-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[440px] rounded-xl border border-slate-200/90 bg-white/90 p-[30px] shadow-[0_22px_50px_rgba(23,32,51,0.12),0_8px_18px_rgba(23,32,51,0.06)] backdrop-blur-md max-[480px]:p-[22px] dark:border-slate-600/80 dark:bg-[#172033]/90 dark:shadow-[0_24px_58px_rgba(0,0,0,0.38),0_10px_24px_rgba(0,0,0,0.24)]">
        <div className="mb-6">
          <h1 className="mb-1.5 mt-0 text-[1.55rem] leading-tight tracking-normal text-[#172033] dark:text-slate-50">
            Criar conta
          </h1>

          <p className="m-0 leading-relaxed text-slate-500 dark:text-slate-300">
            Informe seus dados para acessar o sistema.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid gap-[18px]"
          autoComplete="off"
        >
          <input
            type="text"
            name="fake_username"
            autoComplete="username"
            className="hidden"
            tabIndex={-1}
          />

          <input
            type="password"
            name="fake_password"
            autoComplete="current-password"
            className="hidden"
            tabIndex={-1}
          />

          <div className="grid gap-2 text-left">
            <label
              className="text-[0.92rem] font-bold text-[#172033] dark:text-slate-50"
              htmlFor="register-name"
            >
              Nome
            </label>

            <input
              className="h-[46px] w-full rounded-lg border border-slate-200 bg-white px-3.5 text-[#172033] outline-none transition-[border-color,box-shadow,background] duration-150 placeholder:text-slate-400 focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.14)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-[#172033] dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:shadow-[0_0_0_4px_rgba(96,165,250,0.18)] dark:disabled:bg-slate-900"
              id="register-name"
              name="register_name"
              type="text"
              autoComplete="name"
              placeholder="Seu nome"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="grid gap-2 text-left">
            <label
              className="text-[0.92rem] font-bold text-[#172033] dark:text-slate-50"
              htmlFor="register-email"
            >
              Email
            </label>

            <input
              className="h-[46px] w-full rounded-lg border border-slate-200 bg-white px-3.5 text-[#172033] outline-none transition-[border-color,box-shadow,background] duration-150 placeholder:text-slate-400 focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.14)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-[#172033] dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:shadow-[0_0_0_4px_rgba(96,165,250,0.18)] dark:disabled:bg-slate-900"
              id="register-email"
              name="register_email"
              type="email"
              autoComplete="off"
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
              htmlFor="register-password"
            >
              Senha
            </label>

            <input
              className="h-[46px] w-full rounded-lg border border-slate-200 bg-white px-3.5 text-[#172033] outline-none transition-[border-color,box-shadow,background] duration-150 placeholder:text-slate-400 focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.14)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-[#172033] dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:shadow-[0_0_0_4px_rgba(96,165,250,0.18)] dark:disabled:bg-slate-900"
              id="register-password"
              name="register_password"
              type="password"
              autoComplete="new-password"
              placeholder="Digite sua senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="grid gap-2 text-left">
            <label
              className="text-[0.92rem] font-bold text-[#172033] dark:text-slate-50"
              htmlFor="register-confirm-password"
            >
              Confirmar senha
            </label>

            <input
              className="h-[46px] w-full rounded-lg border border-slate-200 bg-white px-3.5 text-[#172033] outline-none transition-[border-color,box-shadow,background] duration-150 placeholder:text-slate-400 focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.14)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-[#172033] dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:shadow-[0_0_0_4px_rgba(96,165,250,0.18)] dark:disabled:bg-slate-900"
              id="register-confirm-password"
              name="register_confirm_password"
              type="password"
              autoComplete="new-password"
              placeholder="Digite novamente"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
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
            disabled={loading || !name || !email || !password || !confirmPassword}
          >
            {loading ? "Criando..." : "Criar conta"}
          </button>

          <p className="m-0 text-center text-sm text-slate-500 dark:text-slate-300">
            Já tem conta?{" "}
            <Link
              className="font-extrabold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
              to="/login"
            >
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}