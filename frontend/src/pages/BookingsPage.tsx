import { useEffect, useMemo, useState } from "react"
import DateInput from "../components/DateInput"
import TimeInput from "../components/TimeInput"
import { bookingService } from "../services/bookingService"
import { mockUser } from "../services/mockData"
import { roomService } from "../services/roomService"
import { ServiceError } from "../services/serviceError"
import type { Booking, BookingFormInput, BookingInput, Room } from "../types/domain"

const badgeClass =
  "inline-flex min-h-[30px] items-center rounded-full border border-blue-600/20 bg-white/75 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.04em] text-blue-700 dark:border-blue-300/30 dark:bg-[#172033]/70 dark:text-blue-300"

const fieldClass =
  "h-[44px] w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.14)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"

const labelClass =
  "grid min-w-0 gap-2 text-sm font-bold text-[#172033] dark:text-slate-50"

const cardClass =
  "min-w-0 rounded-xl border border-slate-200/90 bg-white/90 p-5 shadow-[0_16px_38px_rgba(23,32,51,0.08)] dark:border-slate-700/90 dark:bg-[#172033]/90"

const emptyForm: BookingFormInput = {
  title: "",
  roomId: "",
  date: "",
  startTime: "",
  endTime: "",
  participants: [],
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
})

function formatDateShort(value: string) {
  const parts = dateFormatter.formatToParts(new Date(value))
  const day = parts.find(part => part.type === "day")?.value ?? ""
  const month =
    parts.find(part => part.type === "month")?.value.replace(".", "") ?? ""
  const year = parts.find(part => part.type === "year")?.value ?? ""

  return `${day}-${month}-${year}`
}

function formatTime(value: string) {
  return timeFormatter.format(new Date(value))
}

function formatTimeRange(startAt: string, endAt: string) {
  return `${formatTime(startAt)} às ${formatTime(endAt)}`
}

function splitDateTime(value: string) {
  const [date = "", time = ""] = value.split("T")

  return {
    date,
    time: time.slice(0, 5),
  }
}

function normalizeQuarterHour(value: string | null) {
  if (!value) return ""

  const [hourPart, minutePart = "0"] = value.split(":")
  const hour = Number(hourPart)
  const minute = Number(minutePart)

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return ""

  const normalizedMinute = Math.min(45, Math.round(minute / 15) * 15)

  return `${String(hour).padStart(2, "0")}:${String(normalizedMinute).padStart(
    2,
    "0",
  )}`
}

function composeBookingInput(form: BookingFormInput): BookingInput {
  return {
    title: form.title,
    roomId: form.roomId,
    start_at: `${form.date}T${form.startTime}`,
    end_at: `${form.date}T${form.endTime}`,
    participants: form.participants,
  }
}

function parseParticipants(value: string) {
  return value
    .split(",")
    .map(participant => participant.trim())
    .filter(Boolean)
}

function getErrorMessage(error: unknown) {
  if (error instanceof ServiceError) return error.message
  if (error instanceof Error) return error.message

  return "Nao foi possivel concluir a acao."
}

function timeToMinutes(value: string) {
  const [hourPart, minutePart = "0"] = value.split(":")
  const hour = Number(hourPart)
  const minute = Number(minutePart)

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null

  return hour * 60 + minute
}

function validateBookingForm(form: BookingFormInput) {
  if (!form.date) return "Informe a data da reserva."
  if (!form.startTime) return "Informe o horario de inicio."
  if (!form.endTime) return "Informe o horario de fim."

  const startMinutes = timeToMinutes(form.startTime)
  const endMinutes = timeToMinutes(form.endTime)

  if (startMinutes === null || endMinutes === null) {
    return "Informe horarios validos no formato 24h."
  }

  if (endMinutes <= startMinutes) {
    return "O horario de fim precisa ser maior que o horario de inicio."
  }

  return ""
}

export default function BookingsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [form, setForm] = useState<BookingFormInput>(emptyForm)
  const [participantsText, setParticipantsText] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [feedback, setFeedback] = useState("")

  const roomById = useMemo(
    () => new Map(rooms.map(room => [room.id, room])),
    [rooms],
  )
  const currentUser = mockUser

  async function loadData() {
    setLoading(true)
    setError("")

    try {
      const [roomsData, bookingsData] = await Promise.all([
        roomService.listRooms(),
        bookingService.listBookings(),
      ])

      setRooms(roomsData)
      setBookings(bookingsData)
      setForm(current => ({
        ...current,
        roomId: current.roomId || roomsData[0]?.id || "",
      }))
    } catch {
      setError("Nao foi possivel carregar salas e reservas.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function resetForm() {
    setEditingId(null)
    setForm({ ...emptyForm, roomId: rooms[0]?.id || "" })
    setParticipantsText("")
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    setError("")
    setFeedback("")

    const validationError = validateBookingForm(form)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)

    const payload = composeBookingInput({
      ...form,
      participants: parseParticipants(participantsText),
    })

    try {
      if (editingId) {
        await bookingService.updateBooking(editingId, payload)
        setFeedback("Reserva atualizada. Participantes seriam notificados por email.")
      } else {
        await bookingService.createBooking(payload)
        setFeedback("Reserva criada. Participantes seriam notificados por email.")
      }

      resetForm()
      setBookings(await bookingService.listBookings())
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  function startEditing(booking: Booking) {
    const start = splitDateTime(booking.start_at)
    const end = splitDateTime(booking.end_at)

    setEditingId(booking.id)
    setForm({
      title: booking.title,
      roomId: booking.roomId,
      date: start.date,
      startTime: start.time,
      endTime: end.time,
      participants: booking.participants,
    })
    setParticipantsText(booking.participants.join(", "))
    setError("")
    setFeedback("")
  }

  async function handleCancelBooking(id: string) {
    if (cancellingId) return

    setCancellingId(id)
    setError("")
    setFeedback("")

    try {
      await bookingService.cancelBooking(id)
      setFeedback("Reserva cancelada. Participantes seriam notificados por email.")
      setBookings(await bookingService.listBookings())
      if (editingId === id) resetForm()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-[1280px] min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(360px,440px)_minmax(0,1fr)]">
      <div className="min-w-0">
        <header className="mb-7">
          <span className={badgeClass}>Reservas</span>
          <h1 className="mb-0 mt-3.5 text-[clamp(2rem,4vw,3.25rem)] leading-[1] tracking-normal text-[#172033] dark:text-slate-50">
            Agenda de salas
          </h1>
          <p className="mb-0 mt-2.5 max-w-[42rem] leading-relaxed text-slate-500 dark:text-slate-300">
            Crie, edite e cancele reservas usando as regras do desafio em um
            service mockado.
          </p>
        </header>

        <form className={cardClass} onSubmit={handleSubmit}>
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="m-0 text-xl tracking-normal text-[#172033] dark:text-slate-50">
              {editingId ? "Editar reserva" : "Nova reserva"}
            </h2>

            {editingId && (
              <button
                className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-extrabold text-slate-600 hover:border-blue-600 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:text-blue-300"
                type="button"
                onClick={resetForm}
              >
                Limpar
              </button>
            )}
          </div>

          <div className="grid min-w-0 gap-4">
            <label className={labelClass}>
              Titulo
              <input
                className={fieldClass}
                value={form.title}
                onChange={event =>
                  setForm(current => ({ ...current, title: event.target.value }))
                }
                required
              />
            </label>

            <label className={labelClass}>
              Sala
              <select
                className={fieldClass}
                value={form.roomId}
                onChange={event =>
                  setForm(current => ({ ...current, roomId: event.target.value }))
                }
                required
              >
                <option value="" disabled>
                  Selecione uma sala
                </option>

                {rooms.map(room => (
                  <option key={room.id} value={room.id}>
                    {room.name} - {room.capacity} pessoas
                  </option>
                ))}
              </select>
            </label>

            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
              <div className={labelClass}>
                <label htmlFor="booking-date">Data</label>
                <DateInput
                  id="booking-date"
                  value={form.date}
                  onChange={value =>
                    setForm(current => ({
                      ...current,
                      date: value,
                    }))
                  }
                  required
                />
              </div>

              <div className={labelClass}>
                <label htmlFor="booking-start-time">Inicio</label>
                <TimeInput
                  ariaLabel="Horario de inicio"
                  id="booking-start-time"
                  value={form.startTime}
                  onChange={value =>
                    setForm(current => ({
                      ...current,
                      startTime: normalizeQuarterHour(value),
                    }))
                  }
                  required
                />
              </div>

              <div className={labelClass}>
                <label htmlFor="booking-end-time">Fim</label>
                <TimeInput
                  ariaLabel="Horario de fim"
                  id="booking-end-time"
                  value={form.endTime}
                  onChange={value =>
                    setForm(current => ({
                      ...current,
                      endTime: normalizeQuarterHour(value),
                    }))
                  }
                  required
                />
              </div>
            </div>

            <label className={labelClass}>
              Participantes
              <textarea
                className="min-h-[96px] w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.14)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                placeholder="email1@empresa.com, email2@empresa.com"
                value={participantsText}
                onChange={event => setParticipantsText(event.target.value)}
              />
            </label>

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

            <button
              className="inline-flex min-h-[46px] items-center justify-center rounded-lg bg-blue-600 px-4 font-extrabold text-white shadow-[0_12px_22px_rgba(37,99,235,0.22)] hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-400 dark:text-slate-950 dark:hover:bg-blue-200"
              disabled={saving || loading}
              type="submit"
            >
              {saving
                ? "Salvando..."
                : editingId
                  ? "Salvar alteracoes"
                  : "Criar reserva"}
            </button>
          </div>
        </form>
      </div>

      <div className="min-w-0">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="m-0 text-xl tracking-normal text-[#172033] dark:text-slate-50">
            Reservas existentes
          </h2>
          <span className="text-sm font-bold text-slate-500 dark:text-slate-300">
            {bookings.length} registros
          </span>
        </div>

        {loading && (
          <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-500 dark:border-slate-700 dark:bg-[#172033]/80 dark:text-slate-300">
            <span className="mr-3 size-5 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-400" />
            Carregando reservas...
          </div>
        )}

        {!loading && bookings.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-[#172033]/70 dark:text-slate-300">
            Nenhuma reserva cadastrada.
          </div>
        )}

        {!loading && bookings.length > 0 && (
          <div className="grid gap-3">
            {bookings.map(booking => {
              const room = roomById.get(booking.roomId)
              const isCancelled = booking.status === "cancelled"
              const creatorName = booking.createdBy.name ?? booking.createdBy.email
              const createdByMe =
                booking.createdBy.id === currentUser.id ||
                booking.createdBy.email.toLowerCase() ===
                  currentUser.email.toLowerCase()
              const participates = booking.participants.some(
                participant =>
                  participant.toLowerCase() === currentUser.email.toLowerCase(),
              )
              const isParticipantOnly = participates && !createdByMe
              const canManage = createdByMe && !isCancelled

              return (
                <article
                  className={`min-w-0 rounded-xl border p-5 shadow-[0_14px_30px_rgba(23,32,51,0.07)] ${
                    isCancelled
                      ? "border-slate-200 bg-slate-100/80 text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400"
                      : createdByMe
                        ? "border-blue-200/90 bg-white/95 text-[#172033] dark:border-blue-400/30 dark:bg-[#172033]/95 dark:text-slate-50"
                        : "border-slate-200/90 bg-white/90 text-[#172033] dark:border-slate-700/90 dark:bg-[#172033]/90 dark:text-slate-50"
                  }`}
                  key={booking.id}
                >
                  <div className="grid min-w-0 gap-4">
                    <div className="flex items-start justify-between gap-4 max-[680px]:flex-col">
                      <div className="min-w-0">
                        <h3 className="m-0 text-lg tracking-normal">
                          {booking.title}
                        </h3>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-extrabold ${
                              isCancelled
                                ? "border-slate-300 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400"
                                : "border-green-600/25 bg-green-50 text-green-800 dark:border-green-400/35 dark:bg-green-950/35 dark:text-green-200"
                            }`}
                          >
                            {isCancelled ? "Cancelada" : "Ativa"}
                          </span>

                          {createdByMe && (
                            <span className="inline-flex min-h-7 items-center rounded-full border border-blue-600/25 bg-blue-50 px-2.5 text-xs font-extrabold text-blue-800 dark:border-blue-400/35 dark:bg-blue-950/35 dark:text-blue-200">
                              Criada por mim
                            </span>
                          )}

                          {isParticipantOnly && (
                            <span className="inline-flex min-h-7 items-center rounded-full border border-teal-600/25 bg-teal-50 px-2.5 text-xs font-extrabold text-teal-800 dark:border-teal-400/35 dark:bg-teal-950/35 dark:text-teal-200">
                              Voce participa
                            </span>
                          )}
                        </div>
                      </div>

                      {canManage && (
                        <div className="flex flex-none flex-wrap justify-end gap-2 max-[680px]:w-full max-[680px]:justify-start">
                          <button
                            className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-extrabold text-slate-600 hover:border-blue-600 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:text-blue-300"
                            type="button"
                            onClick={() => startEditing(booking)}
                          >
                            Editar
                          </button>

                          <button
                            className="inline-flex min-h-9 items-center rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-extrabold text-red-700 hover:border-red-400 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-400/35 dark:bg-red-950/35 dark:text-red-200 dark:hover:border-red-300"
                            type="button"
                            disabled={cancellingId === booking.id}
                            onClick={() => handleCancelBooking(booking.id)}
                          >
                            {cancellingId === booking.id
                              ? "Cancelando..."
                              : "Cancelar"}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="min-w-0 rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 dark:border-slate-700/80 dark:bg-slate-950/30">
                        <span className="block text-[0.72rem] font-extrabold uppercase tracking-[0.04em] text-slate-400 dark:text-slate-500">
                          Sala
                        </span>
                        <strong className="mt-1 block break-words text-sm text-[#172033] dark:text-slate-50">
                          {room?.name ?? "Sala nao encontrada"}
                        </strong>
                      </div>

                      <div className="min-w-0 rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 dark:border-slate-700/80 dark:bg-slate-950/30">
                        <span className="block text-[0.72rem] font-extrabold uppercase tracking-[0.04em] text-slate-400 dark:text-slate-500">
                          Data
                        </span>
                        <strong className="mt-1 block text-sm text-[#172033] dark:text-slate-50">
                          {formatDateShort(booking.start_at)}
                        </strong>
                      </div>

                      <div className="min-w-0 rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 dark:border-slate-700/80 dark:bg-slate-950/30">
                        <span className="block text-[0.72rem] font-extrabold uppercase tracking-[0.04em] text-slate-400 dark:text-slate-500">
                          Horario
                        </span>
                        <strong className="mt-1 block text-sm text-[#172033] dark:text-slate-50">
                          {formatTimeRange(booking.start_at, booking.end_at)}
                        </strong>
                      </div>
                    </div>

                    <div className="grid min-w-0 gap-3 border-t border-slate-200/80 pt-4 dark:border-slate-700/80">
                      {!createdByMe && (
                        <p className="m-0 break-words text-sm leading-relaxed text-slate-500 dark:text-slate-300">
                          <span className="font-extrabold text-slate-600 dark:text-slate-200">
                            Criador:
                          </span>{" "}
                          {creatorName} ({booking.createdBy.email})
                        </p>
                      )}

                      <div className="min-w-0">
                        <span className="block text-sm font-extrabold text-slate-600 dark:text-slate-200">
                          Participantes
                        </span>

                        {booking.participants.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {booking.participants.map(participant => (
                              <span
                                className="inline-flex min-h-8 max-w-full items-center rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                                key={participant}
                              >
                                <span className="truncate">{participant}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="m-0 mt-1 text-sm text-slate-500 dark:text-slate-300">
                            Sem participantes informados
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
