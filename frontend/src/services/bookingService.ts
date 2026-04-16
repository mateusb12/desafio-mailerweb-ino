import { clone, wait } from "./mockUtils"
import { mockBookings, mockUser } from "./mockData"
import { ServiceError } from "./serviceError"
import type { Booking, BookingInput } from "../types/domain"

let bookings = clone(mockBookings)

const minute = 60 * 1000
const minDuration = 15 * minute
const maxDuration = 8 * 60 * minute

function toDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new ServiceError("VALIDATION_ERROR", "Informe data e horário válidos.")
  }

  return date
}

function validateBooking(input: BookingInput, ignoredBookingId?: string) {
  if (!input.title.trim()) {
    throw new ServiceError("VALIDATION_ERROR", "Informe um título para a reserva.")
  }

  if (!input.roomId) {
    throw new ServiceError("VALIDATION_ERROR", "Selecione uma sala.")
  }

  const start = toDate(input.start_at)
  const end = toDate(input.end_at)
  const duration = end.getTime() - start.getTime()

  if (start >= end) {
    throw new ServiceError(
      "VALIDATION_ERROR",
      "O horário de início deve ser anterior ao horário de fim.",
    )
  }

  if (start.toDateString() !== end.toDateString()) {
    throw new ServiceError(
      "VALIDATION_ERROR",
      "A reserva deve começar e terminar no mesmo dia.",
    )
  }

  if (duration < minDuration) {
    throw new ServiceError(
      "VALIDATION_ERROR",
      "A reserva deve ter duração mínima de 15 minutos.",
    )
  }

  if (duration > maxDuration) {
    throw new ServiceError(
      "VALIDATION_ERROR",
      "A reserva deve ter duração máxima de 8 horas.",
    )
  }

  const conflict = bookings.find(booking => {
    if (booking.id === ignoredBookingId) return false
    if (booking.status === "cancelled") return false
    if (booking.roomId !== input.roomId) return false

    const existingStart = toDate(booking.start_at)
    const existingEnd = toDate(booking.end_at)

    return start < existingEnd && end > existingStart
  })

  if (conflict) {
    throw new ServiceError(
      "BOOKING_CONFLICT",
      "Já existe uma reserva ativa para esta sala nesse intervalo. Ajuste o horário ou escolha outra sala.",
    )
  }
}

function normalizeInput(input: BookingInput): BookingInput {
  return {
    ...input,
    title: input.title.trim(),
    participants: input.participants
      .map(participant => participant.trim())
      .filter(Boolean),
  }
}

export async function listBookings(): Promise<Booking[]> {
  const sorted = [...bookings].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
  )

  return wait(clone(sorted))
}

export async function createBooking(input: BookingInput): Promise<Booking> {
  await wait(null)

  const normalized = normalizeInput(input)
  validateBooking(normalized)

  const booking: Booking = {
    id: `booking-${crypto.randomUUID()}`,
    ...normalized,
    createdBy: {
      id: mockUser.id,
      name: mockUser.name,
      email: mockUser.email,
    },
    status: "active",
  }

  bookings = [...bookings, booking]

  return clone(booking)
}

export async function updateBooking(
  id: string,
  input: BookingInput,
): Promise<Booking> {
  await wait(null)

  const existing = bookings.find(booking => booking.id === id)

  if (!existing) {
    throw new ServiceError("NOT_FOUND", "Reserva não encontrada.")
  }

  if (existing.status === "cancelled") {
    throw new ServiceError(
      "VALIDATION_ERROR",
      "Reservas canceladas não podem ser editadas.",
    )
  }

  const normalized = normalizeInput(input)
  validateBooking(normalized, id)

  const updated: Booking = {
    ...existing,
    ...normalized,
  }

  bookings = bookings.map(booking => (booking.id === id ? updated : booking))

  return clone(updated)
}

export async function cancelBooking(id: string): Promise<Booking> {
  await wait(null)

  const existing = bookings.find(booking => booking.id === id)

  if (!existing) {
    throw new ServiceError("NOT_FOUND", "Reserva não encontrada.")
  }

  const cancelled: Booking = {
    ...existing,
    status: "cancelled",
  }

  bookings = bookings.map(booking => (booking.id === id ? cancelled : booking))

  return clone(cancelled)
}

export const bookingService = {
  listBookings,
  createBooking,
  updateBooking,
  cancelBooking,
}
