import { useMemo } from "react"
import DateInput from "./DateInput"
import {
  buildCalendarLayout,
  formatCalendarTime,
  hourHeight,
} from "./bookingsCalendarUtils"
import type { Booking, BookingFormInput, Room } from "../types/domain"

type BookingsCalendarViewProps = {
  bookings: Booking[]
  editingId: string | null
  form: BookingFormInput
  onDateChange: (value: string) => void
  onRoomChange: (value: string) => void
  rooms: Room[]
  roomById: Map<string, Room>
  selectedDate: string
  selectedRoomId: string
}

function getTodayDateKey() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")

  return `${now.getFullYear()}-${month}-${day}`
}

function statusLabel(booking: Booking) {
  return booking.status === "cancelled" ? "Cancelada" : "Ativa"
}

function formatSelectedDate(value: string) {
  if (!value) return ""

  const [year, month, day] = value.split("-")
  return `${day}/${month}/${year}`
}

export default function BookingsCalendarView({
  bookings,
  editingId,
  form,
  onDateChange,
  onRoomChange,
  rooms,
  roomById,
  selectedDate,
  selectedRoomId,
}: BookingsCalendarViewProps) {
  const activeBookings = useMemo(
    () => bookings.filter(booking => booking.status !== "cancelled"),
    [bookings],
  )

  const layout = useMemo(
    () =>
      buildCalendarLayout({
        bookings,
        editingId,
        form,
        selectedDate,
        selectedRoomId,
      }),
    [bookings, editingId, form, selectedDate, selectedRoomId],
  )

  const hours = useMemo(() => {
    const firstHour = Math.floor(layout.dayStartMinutes / 60)
    const lastHour = Math.ceil(layout.dayEndMinutes / 60)

    return Array.from({ length: lastHour - firstHour + 1 }, (_, index) => {
      return (firstHour + index) * 60
    })
  }, [layout.dayEndMinutes, layout.dayStartMinutes])

  const selectedRoom = form.roomId ? roomById.get(form.roomId) : null
  const visibleActiveCount = layout.items.filter(
    item => item.booking.status !== "cancelled",
  ).length

  const hasSelectedDate = Boolean(selectedDate)

  return (
    <div className="grid min-w-0 gap-4">
      <div className="rounded-xl border border-slate-200/90 bg-white/90 p-4 shadow-[0_14px_30px_rgba(23,32,51,0.07)] dark:border-slate-700/90 dark:bg-[#172033]/90">
        <div className="grid min-w-0 gap-4">
          <div className="rounded-lg border border-blue-200/70 bg-blue-50/80 px-4 py-3 dark:border-blue-400/20 dark:bg-blue-950/30">
            <span className="block text-[0.72rem] font-extrabold uppercase tracking-[0.04em] text-blue-700 dark:text-blue-300">
              Data escolhida
            </span>
            <strong className="mt-1 block text-base text-[#172033] dark:text-slate-50">
              {hasSelectedDate ? formatSelectedDate(selectedDate) : "Nenhuma data selecionada"}
            </strong>
          </div>

          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(180px,220px)] gap-3 max-[720px]:grid-cols-1">
            <label className="grid min-w-0 gap-2 text-sm font-bold text-[#172033] dark:text-slate-50">
              Dia do calendário
              <DateInput value={selectedDate} onChange={onDateChange} />
            </label>

            <label className="grid min-w-0 gap-2 text-sm font-bold text-[#172033] dark:text-slate-50">
              Sala
              <select
                className="h-[44px] w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.14)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                value={selectedRoomId}
                onChange={event => onRoomChange(event.target.value)}
              >
                <option value="">Todas as salas</option>
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-1 grid grid-cols-3 gap-3 max-[720px]:grid-cols-1">
            <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 dark:border-slate-700/80 dark:bg-slate-950/30">
              <span className="block text-[0.72rem] font-extrabold uppercase tracking-[0.04em] text-slate-400 dark:text-slate-500">
                Exibindo
              </span>
              <strong className="mt-1 block text-sm text-[#172033] dark:text-slate-50">
                {hasSelectedDate
                  ? `${visibleActiveCount} de ${activeBookings.length} ativas`
                  : "Selecione uma data"}
              </strong>
            </div>

            <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 dark:border-slate-700/80 dark:bg-slate-950/30">
              <span className="block text-[0.72rem] font-extrabold uppercase tracking-[0.04em] text-slate-400 dark:text-slate-500">
                Grade
              </span>
              <strong className="mt-1 block text-sm text-[#172033] dark:text-slate-50">
                {hasSelectedDate
                  ? `${formatCalendarTime(layout.dayStartMinutes)} - ${formatCalendarTime(layout.dayEndMinutes)}`
                  : "--:-- - --:--"}
              </strong>
            </div>

            <div
              className={`rounded-lg border px-3 py-2.5 ${
                layout.selection?.conflicts
                  ? "border-red-300 bg-red-50 dark:border-red-400/35 dark:bg-red-950/35"
                  : layout.selection
                    ? "border-teal-300 bg-teal-50 dark:border-teal-400/35 dark:bg-teal-950/35"
                    : "border-slate-200/80 bg-slate-50/80 dark:border-slate-700/80 dark:bg-slate-950/30"
              }`}
            >
              <span
                className={`block text-[0.72rem] font-extrabold uppercase tracking-[0.04em] ${
                  layout.selection?.conflicts
                    ? "text-red-600 dark:text-red-200"
                    : layout.selection
                      ? "text-teal-700 dark:text-teal-200"
                      : "text-slate-400 dark:text-slate-500"
                }`}
              >
                Horário escolhido
              </span>
              <strong className="mt-1 block text-sm text-[#172033] dark:text-slate-50">
                {layout.selection
                  ? layout.selection.conflicts
                    ? "Conflito detectado"
                    : "Sem conflito aparente"
                  : "Preencha data e horários"}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {!hasSelectedDate ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-[#172033]/70 dark:text-slate-300">
          Selecione uma data para visualizar o calendário de reservas.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/90 bg-white/90 shadow-[0_14px_30px_rgba(23,32,51,0.07)] dark:border-slate-700/90 dark:bg-[#172033]/90">
          <div className="min-w-[640px]">
            <div className="sticky top-0 z-20 grid grid-cols-[76px_minmax(0,1fr)] border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-[#172033]/95">
              <div className="border-r border-slate-200 p-3 text-xs font-extrabold uppercase tracking-[0.04em] text-slate-400 dark:border-slate-700 dark:text-slate-500">
                Hora
              </div>
              <div className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <strong className="block truncate text-sm text-[#172033] dark:text-slate-50">
                    {selectedRoomId
                      ? roomById.get(selectedRoomId)?.name ?? "Sala selecionada"
                      : "Todas as salas"}
                  </strong>
                  <span className="block truncate text-xs font-semibold text-slate-500 dark:text-slate-300">
                    {formatSelectedDate(selectedDate)}
                  </span>
                </div>

                {selectedRoom && layout.selection && (
                  <span
                    className={`inline-flex min-h-8 flex-none items-center rounded-lg border px-2.5 text-xs font-extrabold ${
                      layout.selection.conflicts
                        ? "border-red-300 bg-red-50 text-red-700 dark:border-red-400/35 dark:bg-red-950/35 dark:text-red-200"
                        : "border-teal-300 bg-teal-50 text-teal-800 dark:border-teal-400/35 dark:bg-teal-950/35 dark:text-teal-200"
                    }`}
                  >
                    {selectedRoom.name}
                  </span>
                )}
              </div>
            </div>

            <div
              className="relative grid grid-cols-[76px_minmax(0,1fr)]"
              style={{ minHeight: `${layout.dayHeight}px` }}
            >
              <div className="relative border-r border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-950/20">
                {hours.map(hour => (
                  <div
                    className="absolute left-0 right-0 px-3 text-xs font-extrabold text-slate-400 dark:text-slate-500"
                    key={hour}
                    style={{
                      top: `${Math.max(
                        0,
                        ((hour - layout.dayStartMinutes) / 60) * hourHeight,
                      )}px`,
                    }}
                  >
                    {formatCalendarTime(hour)}
                  </div>
                ))}
              </div>

              <div className="relative bg-white dark:bg-[#172033]">
                {hours.map(hour => (
                  <div
                    className="absolute left-0 right-0 border-t border-slate-200/80 dark:border-slate-700/75"
                    key={hour}
                    style={{
                      top: `${Math.max(
                        0,
                        ((hour - layout.dayStartMinutes) / 60) * hourHeight,
                      )}px`,
                    }}
                  />
                ))}

                {layout.items.length === 0 && !layout.selection && (
                  <div className="absolute inset-x-4 top-8 rounded-lg border border-dashed border-slate-300 bg-slate-50/80 p-5 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900/45 dark:text-slate-300">
                    Nenhuma reserva para os filtros selecionados.
                  </div>
                )}

                {layout.selection && (
                  <div
                    className={`absolute z-10 overflow-hidden rounded-lg border-2 border-dashed px-3 py-2 shadow-[0_12px_26px_rgba(23,32,51,0.12)] ${
                      layout.selection.conflicts
                        ? "border-red-500 bg-red-100/90 text-red-900 dark:border-red-300 dark:bg-red-950/80 dark:text-red-100"
                        : "border-teal-500 bg-teal-100/90 text-teal-950 dark:border-teal-300 dark:bg-teal-950/80 dark:text-teal-100"
                    }`}
                    style={{
                      height: `${layout.selection.height}px`,
                      left: `calc(${(layout.selection.column / layout.selection.columnCount) * 100}% + 8px)`,
                      top: `${layout.selection.top}px`,
                      width: `calc(${100 / layout.selection.columnCount}% - 12px)`,
                    }}
                  >
                    <strong className="block truncate text-sm">
                      Horário escolhido
                    </strong>
                    <span className="block truncate text-xs font-bold">
                      {formatCalendarTime(layout.selection.startMinutes)} -{" "}
                      {formatCalendarTime(layout.selection.endMinutes)}
                    </span>
                  </div>
                )}

                {layout.items.map(item => {
                  const room = roomById.get(item.booking.roomId)
                  const isCancelled = item.booking.status === "cancelled"

                  return (
                    <article
                      className={`absolute overflow-hidden rounded-lg border px-3 py-2 shadow-[0_10px_22px_rgba(23,32,51,0.11)] ${
                        isCancelled
                          ? "border-slate-300 bg-slate-100/95 text-slate-500 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-400"
                          : item.booking.id === editingId
                            ? "border-blue-300 bg-blue-50/95 text-blue-950 dark:border-blue-300/50 dark:bg-blue-950/70 dark:text-blue-100"
                            : "border-slate-200 bg-white/95 text-[#172033] dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-50"
                      }`}
                      key={item.booking.id}
                      style={{
                        height: `${item.height}px`,
                        left: `calc(${(item.column / item.columnCount) * 100}% + 8px)`,
                        top: `${item.top}px`,
                        width: `calc(${100 / item.columnCount}% - 12px)`,
                      }}
                    >
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <strong className="min-w-0 truncate text-sm">
                          {item.booking.title}
                        </strong>
                        <span
                          className={`inline-flex min-h-5 flex-none items-center rounded border px-1.5 text-[0.68rem] font-extrabold ${
                            isCancelled
                              ? "border-slate-300 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400"
                              : "border-green-600/25 bg-green-50 text-green-800 dark:border-green-400/35 dark:bg-green-950/35 dark:text-green-200"
                          }`}
                        >
                          {statusLabel(item.booking)}
                        </span>
                      </div>
                      <span className="mt-1 block truncate text-xs font-bold opacity-80">
                        {formatCalendarTime(item.startMinutes)} -{" "}
                        {formatCalendarTime(item.endMinutes)}
                      </span>
                      <span className="mt-1 block truncate text-xs font-semibold opacity-75">
                        {room?.name ?? "Sala não encontrada"}
                      </span>
                    </article>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        className="justify-self-start rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-extrabold text-slate-600 hover:border-blue-600 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:text-blue-300"
        type="button"
        onClick={() => onDateChange(form.date || getTodayDateKey())}
      >
        Ir para a data do formulário
      </button>
    </div>
  )
}