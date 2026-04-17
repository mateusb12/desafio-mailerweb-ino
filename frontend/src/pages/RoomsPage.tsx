import { useEffect, useState, type FormEvent } from "react"
import { roomService } from "../services/roomService"
import { ServiceError } from "../services/serviceError"
import type { Room } from "../types/domain"

const badgeClass =
  "inline-flex min-h-[30px] items-center rounded-full border border-blue-600/20 bg-white/75 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.04em] text-blue-700 dark:border-blue-300/30 dark:bg-[#172033]/70 dark:text-blue-300"

const fieldClass =
  "h-[44px] w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.14)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"

const labelClass =
  "grid min-w-0 gap-2 text-sm font-bold text-[#172033] dark:text-slate-50"

const cardClass =
  "min-w-0 rounded-xl border border-slate-200/90 bg-white/90 p-5 shadow-[0_16px_38px_rgba(23,32,51,0.08)] dark:border-slate-700/90 dark:bg-[#172033]/90"

function getErrorMessage(error: unknown) {
  if (error instanceof ServiceError) return error.message
  if (error instanceof Error) return error.message

  return "Nao foi possivel concluir a acao."
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: "", capacity: "4" })
  const [error, setError] = useState("")
  const [feedback, setFeedback] = useState("")

  async function loadRooms() {
    setLoading(true)
    setError("")

    try {
      const data = await roomService.listRooms()
      setRooms(data)
    } catch {
      setError("Nao foi possivel carregar as salas.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    async function loadInitialRooms() {
      setLoading(true)
      setError("")

      try {
        const data = await roomService.listRooms()
        if (mounted) setRooms(data)
      } catch {
        if (mounted) setError("Nao foi possivel carregar as salas.")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadInitialRooms()

    return () => {
      mounted = false
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    setSaving(true)
    setError("")
    setFeedback("")

    try {
      const room = await roomService.createRoom({
        name: form.name,
        capacity: Number(form.capacity),
      })

      setForm({ name: "", capacity: "4" })
      setFeedback(`Sala "${room.name}" criada com sucesso.`)
      await loadRooms()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-[1080px]">
      <header className="mb-7">
        <span className={badgeClass}>Salas</span>
        <h1 className="mb-0 mt-3.5 text-[clamp(2rem,4vw,3.25rem)] leading-[1] tracking-normal text-[#172033] dark:text-slate-50">
          Salas disponíveis
        </h1>
        <p className="mb-0 mt-2.5 max-w-[42rem] leading-relaxed text-slate-500 dark:text-slate-300">
          Consulte os espaços que podem receber reservas e confira a capacidade
          de cada sala.
        </p>
      </header>

      <div className="mb-6">
        <form className={`${cardClass} max-w-md`} onSubmit={handleSubmit}>
          <div className="mb-5">
            <h2 className="m-0 text-xl tracking-normal text-[#172033] dark:text-slate-50">
              Nova sala
            </h2>
          </div>

          <div className="grid gap-4">
            <label className={labelClass}>
              Nome
              <input
                className={fieldClass}
                value={form.name}
                onChange={event =>
                  setForm(current => ({ ...current, name: event.target.value }))
                }
                placeholder="Sala Reuniao 1"
                required
              />
            </label>

            <label className={labelClass}>
              Capacidade
              <input
                className={fieldClass}
                min={1}
                type="number"
                value={form.capacity}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    capacity: event.target.value,
                  }))
                }
                required
              />
            </label>
          </div>

          {(error || feedback) && (
            <div className="mt-4 grid gap-3">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-relaxed text-red-800 dark:border-red-400/35 dark:bg-red-950/35 dark:text-red-200">
                  {error}
                </div>
              )}

              {feedback && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold leading-relaxed text-green-800 dark:border-green-400/35 dark:bg-green-950/35 dark:text-green-200">
                  {feedback}
                </div>
              )}
            </div>
          )}

          <button
            className="mt-4 inline-flex min-h-[46px] items-center justify-center rounded-lg bg-blue-600 px-4 font-extrabold text-white shadow-[0_12px_22px_rgba(37,99,235,0.22)] hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-400 dark:text-slate-950 dark:hover:bg-blue-200"
            disabled={saving || loading}
            type="submit"
          >
            {saving ? "Criando..." : "Criar sala"}
          </button>
        </form>
      </div>

      {loading && (
        <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-500 dark:border-slate-700 dark:bg-[#172033]/80 dark:text-slate-300">
          <span className="mr-3 size-5 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-400" />
          Carregando salas...
        </div>
      )}

      {!loading && rooms.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-[#172033]/70 dark:text-slate-300">
          Nenhuma sala cadastrada.
        </div>
      )}

      {!loading && rooms.length > 0 && (
        <div className="grid grid-cols-2 gap-4 max-[820px]:grid-cols-1">
          {rooms.map(room => (
            <article className={cardClass} key={room.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="m-0 text-xl tracking-normal text-[#172033] dark:text-slate-50">
                    {room.name}
                  </h2>
                  <p className="mb-0 mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-300">
                    Sala disponível para reuniões e alinhamentos presenciais.
                  </p>
                </div>

                <span className="inline-flex min-h-8 flex-none items-center rounded-full border border-teal-600/20 bg-teal-50 px-3 text-sm font-extrabold text-teal-800 dark:border-teal-300/30 dark:bg-teal-950/35 dark:text-teal-200">
                  {room.capacity} pessoas
                </span>
              </div>

              <div className="mt-5 grid gap-3 rounded-lg border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-700/80 dark:bg-slate-900/40">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                    Nome
                  </span>
                  <span className="text-sm font-semibold text-[#172033] dark:text-slate-100">
                    {room.name}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                    Capacidade
                  </span>
                  <span className="text-sm font-semibold text-[#172033] dark:text-slate-100">
                    {room.capacity} pessoas
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}