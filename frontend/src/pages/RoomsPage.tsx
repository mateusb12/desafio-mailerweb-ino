import { useEffect, useState } from "react"
import { roomService } from "../services/roomService"
import type { Room } from "../types/domain"

const badgeClass =
  "inline-flex min-h-[30px] items-center rounded-full border border-blue-600/20 bg-white/75 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.04em] text-blue-700 dark:border-blue-300/30 dark:bg-[#172033]/70 dark:text-blue-300"

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let mounted = true

    async function loadRooms() {
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

    loadRooms()

    return () => {
      mounted = false
    }
  }, [])

  return (
    <section className="mx-auto w-full max-w-[1080px]">
      <header className="mb-7">
        <span className={badgeClass}>Salas</span>
        <h1 className="mb-0 mt-3.5 text-[clamp(2rem,4vw,3.25rem)] leading-[1] tracking-normal text-[#172033] dark:text-slate-50">
          Salas disponiveis
        </h1>
        <p className="mb-0 mt-2.5 max-w-[42rem] leading-relaxed text-slate-500 dark:text-slate-300">
          Consulte os espacos que podem receber reservas e confira a capacidade
          de cada sala.
        </p>
      </header>

      {loading && (
        <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-500 dark:border-slate-700 dark:bg-[#172033]/80 dark:text-slate-300">
          <span className="mr-3 size-5 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-400" />
          Carregando salas...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800 dark:border-red-400/35 dark:bg-red-950/35 dark:text-red-200">
          {error}
        </div>
      )}

      {!loading && !error && rooms.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-[#172033]/70 dark:text-slate-300">
          Nenhuma sala cadastrada.
        </div>
      )}

      {!loading && !error && rooms.length > 0 && (
        <div className="grid grid-cols-2 gap-4 max-[820px]:grid-cols-1">
          {rooms.map(room => (
            <article
              className="rounded-xl border border-slate-200/90 bg-white/90 p-5 shadow-[0_16px_38px_rgba(23,32,51,0.08)] dark:border-slate-700/90 dark:bg-[#172033]/90"
              key={room.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="m-0 text-xl tracking-normal text-[#172033] dark:text-slate-50">
                    {room.name}
                  </h2>
                  <p className="mb-0 mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-300">
                    Espaco para reunioes e alinhamentos presenciais.
                  </p>
                </div>
                <span className="inline-flex min-h-8 flex-none items-center rounded-full border border-teal-600/20 bg-teal-50 px-3 text-sm font-extrabold text-teal-800 dark:border-teal-300/30 dark:bg-teal-950/35 dark:text-teal-200">
                  {room.capacity} pessoas
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
