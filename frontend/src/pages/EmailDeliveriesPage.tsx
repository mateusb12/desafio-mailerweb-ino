import { useEffect, useMemo, useState } from "react"
import { emailDeliveryService } from "../services/emailDeliveryService"
import { toEmailDeliveryViewModel } from "../services/emailDeliveryPresenter"
import type { EmailDelivery, EmailDeliveryStatus } from "../types/domain"

const badgeClass =
  "inline-flex min-h-[30px] items-center rounded-full border border-blue-600/20 bg-white/75 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.04em] text-blue-700 dark:border-blue-300/30 dark:bg-[#172033]/70 dark:text-blue-300"

const statusClasses: Record<EmailDeliveryStatus, string> = {
  processed:
    "border-amber-500/30 bg-amber-50 text-amber-800 dark:border-amber-300/35 dark:bg-amber-950/35 dark:text-amber-200",
  delivered:
    "border-teal-600/25 bg-teal-50 text-teal-800 dark:border-teal-300/35 dark:bg-teal-950/35 dark:text-teal-200",
}

export default function EmailDeliveriesPage() {
  const [emails, setEmails] = useState<EmailDelivery[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let mounted = true

    async function loadEmails() {
      setLoading(true)
      setError("")

      try {
        const data = await emailDeliveryService.listEmailDeliveries()
        if (!mounted) return

        setEmails(data)
        setSelectedId(current => current ?? data[0]?.id ?? null)
      } catch {
        if (mounted) setError("Não foi possível carregar os emails processados.")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadEmails()

    return () => {
      mounted = false
    }
  }, [])

  const displayedEmails = useMemo(() => emails.map(toEmailDeliveryViewModel), [emails])

  const selectedEmail = useMemo(
    () => displayedEmails.find(email => email.id === selectedId) ?? displayedEmails[0] ?? null,
    [displayedEmails, selectedId],
  )

  const selectedRawEmail = useMemo(
    () => emails.find(email => email.id === selectedEmail?.id) ?? null,
    [emails, selectedEmail?.id],
  )

  return (
    <section className="mx-auto w-full max-w-[1280px]">
      <header className="mb-7">
        <span className={badgeClass}>Emails</span>
        <h1 className="mb-0 mt-3.5 text-[clamp(2rem,4vw,3.25rem)] leading-[1] tracking-normal text-[#172033] dark:text-slate-50">
          Inbox de entregas
        </h1>
        <p className="mb-0 mt-2.5 max-w-[46rem] leading-relaxed text-slate-500 dark:text-slate-300">
          Mensagens registradas pelo sistema, com leitura simplificada para acompanhar as notificações enviadas.
        </p>
      </header>

      {loading && (
        <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-500 dark:border-slate-700 dark:bg-[#172033]/80 dark:text-slate-300">
          <span className="mr-3 size-5 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-400" />
          Carregando emails...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800 dark:border-red-400/35 dark:bg-red-950/35 dark:text-red-200">
          {error}
        </div>
      )}

      {!loading && !error && emails.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-[#172033]/70 dark:text-slate-300">
          Nenhum email processado ainda.
        </div>
      )}

      {!loading && !error && emails.length > 0 && (
        <div className="grid min-h-[560px] grid-cols-[minmax(300px,430px)_minmax(0,1fr)] overflow-hidden rounded-xl border border-slate-200/90 bg-white/90 shadow-[0_18px_42px_rgba(23,32,51,0.1)] dark:border-slate-700/90 dark:bg-[#172033]/90 max-[980px]:grid-cols-1">
          <div className="min-w-0 border-r border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/45 max-[980px]:border-b max-[980px]:border-r-0">
            <div className="flex min-h-[64px] items-center justify-between gap-3 border-b border-slate-200 px-4 dark:border-slate-700">
              <div>
                <p className="m-0 text-sm font-extrabold text-[#172033] dark:text-slate-50">
                  Mensagens
                </p>
                <p className="m-0 mt-0.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                  {emails.length} registro{emails.length === 1 ? "" : "s"}
                </p>
              </div>
              <span className="inline-flex min-h-8 items-center rounded-full border border-teal-600/20 bg-teal-50 px-3 text-xs font-extrabold uppercase tracking-[0.04em] text-teal-800 dark:border-teal-300/30 dark:bg-teal-950/35 dark:text-teal-200">
                leitura
              </span>
            </div>

            <div className="max-h-[620px] overflow-y-auto">
              {displayedEmails.map(email => {
                const active = selectedEmail?.id === email.id

                return (
                  <button
                    className={`grid w-full min-w-0 gap-2 border-b border-slate-200 px-4 py-4 text-left transition-colors dark:border-slate-700 ${
                      active
                        ? "bg-white text-[#172033] shadow-[inset_4px_0_0_#2563eb] dark:bg-slate-950/35 dark:text-slate-50"
                        : "bg-transparent text-slate-600 hover:bg-white/75 dark:text-slate-300 dark:hover:bg-slate-950/25"
                    }`}
                    key={email.id}
                    type="button"
                    onClick={() => setSelectedId(email.id)}
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <p className="m-0 min-w-0 truncate text-sm font-extrabold">
                        {email.title}
                      </p>
                      <time className="flex-none text-xs font-bold text-slate-400 dark:text-slate-500">
                        {email.formattedCreatedAt}
                      </time>
                    </div>
                    <p className="m-0 truncate text-xs font-bold text-slate-500 dark:text-slate-400">
                      {email.subtitle}
                    </p>
                    <p className="m-0 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-300">
                      {email.summary}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex min-h-7 items-center rounded-full border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                        {email.typeLabel}
                      </span>
                      <span
                        className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-extrabold ${statusClasses[email.status]}`}
                      >
                        {email.statusLabel}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {selectedEmail && (
            <article className="min-w-0 bg-white p-7 dark:bg-[#172033] max-[640px]:p-5">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-700">
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex min-h-7 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      {selectedEmail.typeLabel}
                    </span>
                    <span
                      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-extrabold ${statusClasses[selectedEmail.status]}`}
                    >
                      {selectedEmail.statusLabel}
                    </span>
                  </div>
                  <h2 className="m-0 text-[clamp(1.45rem,3vw,2.25rem)] leading-tight tracking-normal text-[#172033] dark:text-slate-50">
                    {selectedEmail.title}
                  </h2>
                </div>
                <time className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {selectedEmail.formattedCreatedAt}
                </time>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-3 max-[720px]:grid-cols-1">
                <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                  <dt className="mb-1.5 text-xs font-extrabold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">
                    Destinatário
                  </dt>
                  <dd className="m-0 font-bold [overflow-wrap:anywhere] text-[#172033] dark:text-slate-50">
                    {selectedEmail.recipientEmail}
                  </dd>
                </div>
                <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                  <dt className="mb-1.5 text-xs font-extrabold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">
                    Origem
                  </dt>
                  <dd className="m-0 font-bold [overflow-wrap:anywhere] text-[#172033] dark:text-slate-50">
                    {selectedEmail.sourceLabel}
                  </dd>
                </div>
              </dl>

              {selectedEmail.hasStructuredDetails && (
                <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
                  <h3 className="m-0 text-sm font-extrabold text-[#172033] dark:text-slate-50">
                    Dados da notificação
                  </h3>
                  <dl className="mt-4 grid grid-cols-2 gap-3 max-[720px]:grid-cols-1">
                    {selectedEmail.detailFields.map(field => (
                      <div
                        className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-[#172033]"
                        key={field.label}
                      >
                        <dt className="mb-1 text-xs font-extrabold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">
                          {field.label}
                        </dt>
                        <dd className="m-0 text-sm font-bold leading-relaxed [overflow-wrap:anywhere] text-[#172033] dark:text-slate-50">
                          {field.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              <details className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
                <summary className="cursor-pointer text-sm font-extrabold text-[#172033] dark:text-slate-50">
                  Ver conteúdo original
                </summary>
                <p className="m-0 mt-4 whitespace-pre-wrap text-[1rem] leading-8 text-slate-700 dark:text-slate-200">
                  {selectedRawEmail?.body ?? selectedEmail.body}
                </p>
              </details>
            </article>
          )}
        </div>
      )}
    </section>
  )
}