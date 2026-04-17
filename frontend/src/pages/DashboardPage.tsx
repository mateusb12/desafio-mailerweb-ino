import { useCallback, useEffect, useState } from "react"
import { useAuth } from "../hooks/authContext"
import { dashboardService } from "../services/dashboardService"
import type { DashboardMetrics } from "../types/domain"

const badgeClass =
  "inline-flex min-h-[30px] items-center rounded-full border border-blue-600/20 bg-white/75 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.04em] text-blue-700 dark:border-blue-300/30 dark:bg-[#172033]/70 dark:text-blue-300"

export default function DashboardPage() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loadingMetrics, setLoadingMetrics] = useState(true)
  const [metricsError, setMetricsError] = useState<string | null>(null)
  const [dashboardAction, setDashboardAction] = useState<
    "populate" | "clear" | null
  >(null)
  const [dashboardMessage, setDashboardMessage] = useState<string | null>(null)

  const loadMetrics = useCallback(
    async (options: { ignore?: () => boolean } = {}) => {
      setLoadingMetrics(true)
      setMetricsError(null)

      try {
        const nextMetrics = await dashboardService.getDashboardMetrics()
        if (!options.ignore?.()) setMetrics(nextMetrics)
      } catch (error) {
        if (!options.ignore?.()) {
          setMetricsError(
            error instanceof Error
              ? error.message
              : "Nao foi possivel carregar o dashboard.",
          )
        }
      } finally {
        if (!options.ignore?.()) setLoadingMetrics(false)
      }
    },
    [],
  )

  useEffect(() => {
    let ignore = false

    loadMetrics({ ignore: () => ignore })

    return () => {
      ignore = true
    }
  }, [loadMetrics])

  if (!user) return null

  const nextBookingDate = metrics?.nextBooking
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(metrics.nextBooking.startAt))
    : null

  const dashboardIsEmpty =
    !!metrics &&
    metrics.roomsCount === 0 &&
    metrics.bookingsCount === 0 &&
    metrics.emailDeliveriesCount === 0 &&
    metrics.outboxEventsCount === 0

  const actionInProgress = dashboardAction !== null

  async function runDashboardAction(
    action: "populate" | "clear",
    execute: () => Promise<void>,
    successMessage: string,
  ) {
    setDashboardAction(action)
    setMetricsError(null)
    setDashboardMessage(null)

    try {
      await execute()
      await loadMetrics()
      setDashboardMessage(successMessage)
    } catch (error) {
      setMetricsError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel executar a acao de desenvolvimento.",
      )
    } finally {
      setDashboardAction(null)
    }
  }

  function handlePopulateDatabase() {
    void runDashboardAction(
      "populate",
      dashboardService.populateMockData,
      "Banco populado com dados de demonstracao.",
    )
  }

  function handleClearDatabase() {
    const confirmed = window.confirm(
      "Apagar salas, reservas, eventos e emails de teste? Usuarios cadastrados serao preservados.",
    )

    if (!confirmed) return

    void runDashboardAction(
      "clear",
      dashboardService.clearMockData,
      "Dados de teste apagados.",
    )
  }

  return (
    <section className="mx-auto w-full max-w-[1080px]">
      <header className="mb-7 flex items-start justify-between gap-4 max-[720px]:flex-col">
        <div>
          <span className={badgeClass}>Área autenticada</span>
          <h1 className="mb-0 mt-3.5 text-[clamp(2rem,4vw,3.25rem)] leading-[1] tracking-normal text-[#172033] dark:text-slate-50">
            Dashboard
          </h1>
          <p className="mb-0 mt-2.5 max-w-[42rem] leading-relaxed text-slate-500 dark:text-slate-300">
            Resumo do usuário conectado ao sistema de reservas.
          </p>
        </div>

        {metrics && !dashboardIsEmpty ? (
          <button
            type="button"
            onClick={handleClearDatabase}
            disabled={actionInProgress || loadingMetrics}
            className="mt-1 inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-extrabold text-red-800 transition hover:border-red-400 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-400/40 dark:bg-red-950/35 dark:text-red-100 dark:hover:bg-red-950/55"
          >
            {dashboardAction === "clear" ? "Apagando..." : "Apagar tudo"}
          </button>
        ) : null}
      </header>

      {metricsError ? (
        <p className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 dark:border-red-400/40 dark:bg-red-950/40 dark:text-red-100">
          {metricsError}
        </p>
      ) : null}

      {dashboardMessage ? (
        <p className="mb-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800 dark:border-green-400/40 dark:bg-green-950/35 dark:text-green-100">
          {dashboardMessage}
        </p>
      ) : null}

      {!loadingMetrics && dashboardIsEmpty ? (
        <div className="rounded-xl border border-dashed border-blue-300 bg-white/90 p-7 shadow-[0_18px_42px_rgba(23,32,51,0.08),0_8px_18px_rgba(23,32,51,0.04)] backdrop-blur-md max-[480px]:p-[22px] dark:border-blue-300/35 dark:bg-[#172033]/90 dark:shadow-[0_24px_58px_rgba(0,0,0,0.3),0_10px_24px_rgba(0,0,0,0.18)]">
          <p className="mb-2 mt-0 text-xs font-extrabold uppercase tracking-[0.04em] text-blue-700 dark:text-blue-300">
            Ambiente de teste vazio
          </p>
          <h2 className="mb-2 mt-0 text-[1.65rem] leading-tight tracking-normal text-[#172033] dark:text-slate-50">
            Popule o banco para validar o fluxo completo
          </h2>
          <p className="mb-5 mt-0 max-w-[44rem] leading-relaxed text-slate-500 dark:text-slate-300">
            Este ambiente usa o endpoint de desenvolvimento{" "}
            <code className="rounded bg-slate-100 px-1.5 py-1 text-sm font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
              POST /dev/populate-mock-data
            </code>{" "}
            para criar salas, reservas, participantes e emails de demonstracao.
          </p>
          <button
            type="button"
            onClick={handlePopulateDatabase}
            disabled={actionInProgress}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-blue-600 bg-blue-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(37,99,235,0.24)] transition hover:border-blue-700 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-400 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {dashboardAction === "populate" ? "Populando..." : "Popular banco"}
          </button>
        </div>
      ) : null}

      {loadingMetrics || (!!metrics && !dashboardIsEmpty) ? (
        <>
          <div className="mb-4 grid grid-cols-4 gap-3.5 max-[920px]:grid-cols-2 max-[560px]:grid-cols-1">
            {[
              ["Salas", metrics?.roomsCount],
              ["Reservas ativas", metrics?.activeBookingsCount],
              ["Reservas hoje", metrics?.todayActiveBookingsCount],
              ["Meus próximos horários", metrics?.myUpcomingBookingsCount],
            ].map(([label, value]) => (
              <div
                key={label}
                className="min-w-0 rounded-lg border border-slate-200 bg-white/90 p-4 dark:border-slate-700 dark:bg-[#172033]/90"
              >
                <p className="mb-2 mt-0 text-xs font-extrabold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-300">
                  {label}
                </p>
                <p className="m-0 text-2xl font-extrabold text-[#172033] dark:text-slate-50">
                  {loadingMetrics ? "..." : (value ?? 0)}
                </p>
              </div>
            ))}
          </div>

          {metrics?.nextBooking ? (
            <div className="mb-4 rounded-lg border border-slate-200 bg-white/90 p-4 dark:border-slate-700 dark:bg-[#172033]/90">
              <p className="mb-2 mt-0 text-xs font-extrabold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-300">
                Próxima reunião
              </p>
              <p className="m-0 font-bold text-[#172033] dark:text-slate-50">
                {metrics.nextBooking.title}
              </p>
              <p className="mb-0 mt-1 text-sm text-slate-500 dark:text-slate-300">
                {metrics.nextBooking.roomName} · {nextBookingDate}
              </p>
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-200/90 bg-white/90 p-7 shadow-[0_18px_42px_rgba(23,32,51,0.1),0_8px_18px_rgba(23,32,51,0.05)] backdrop-blur-md max-[480px]:p-[22px] dark:border-slate-700/90 dark:bg-[#172033]/90 dark:shadow-[0_24px_58px_rgba(0,0,0,0.34),0_10px_24px_rgba(0,0,0,0.22)]">
            <div className="flex items-center gap-3.5 border-b border-slate-200 pb-[22px] dark:border-slate-700">
              <div
                className="inline-grid size-11 flex-none place-items-center rounded-lg bg-[linear-gradient(135deg,#2563eb,#0f766e)] text-[0.85rem] font-extrabold text-white shadow-[0_12px_28px_rgba(37,99,235,0.28)]"
                aria-hidden="true"
              >
                <span>MW</span>
              </div>
              <div>
                <h2 className="mb-1.5 mt-0 text-[1.35rem] leading-tight tracking-normal text-[#172033] dark:text-slate-50">
                  Perfil
                </h2>
                <p className="m-0 leading-relaxed text-slate-500 dark:text-slate-300">
                  Dados retornados pela API para a sessão atual.
                </p>
              </div>
            </div>

            <dl className="mt-[22px] grid grid-cols-3 gap-3.5 max-[920px]:grid-cols-1">
              <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                <dt className="mb-2 text-xs font-extrabold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-300">
                  Email
                </dt>
                <dd className="m-0 font-bold [overflow-wrap:anywhere] text-[#172033] dark:text-slate-50">
                  {user.email}
                </dd>
              </div>
              <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                <dt className="mb-2 text-xs font-extrabold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-300">
                  Role
                </dt>
                <dd className="m-0 font-bold [overflow-wrap:anywhere] text-[#172033] dark:text-slate-50">
                  {user.role}
                </dd>
              </div>
              <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                <dt className="mb-2 text-xs font-extrabold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-300">
                  Status
                </dt>
                <dd className="m-0 font-bold [overflow-wrap:anywhere] text-[#172033] dark:text-slate-50">
                  <span
                    className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-[0.86rem] ${
                      user.is_active
                        ? "border-green-600/25 bg-green-50 text-green-800 dark:border-green-400/35 dark:bg-green-950/35 dark:text-green-200"
                        : "border-slate-300 bg-white text-slate-500 dark:border-slate-600 dark:bg-[#172033] dark:text-slate-300"
                    }`}
                  >
                    {user.is_active ? "Ativo" : "Inativo"}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </>
      ) : null}
    </section>
  )
}
