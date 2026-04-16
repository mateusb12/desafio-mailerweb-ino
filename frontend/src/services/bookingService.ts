import { ApiError, apiFetch } from "../api/client"
import { ServiceError } from "./serviceError"
import type { Booking, BookingInput } from "../types/domain"

const minute = 60 * 1000
const minDuration = 15 * minute
const maxDuration = 8 * 60 * minute

type BackendBookingStatus = "active" | "canceled"

type BookingResponse = {
  id: string
  title: string
  room_id: string
  created_by: {
    id: string
    email: string
    role: string
    is_active: boolean
  }
  start_at: string
  end_at: string
  status: BackendBookingStatus
  participants: string[]
}

type BookingRequest = {
  title: string
  room_id: string
  start_at: string
  end_at: string
  participants: string[]
}

function toDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new ServiceError("VALIDATION_ERROR", "Informe data e horário válidos.")
  }

  return date
}

function validateBooking(input: BookingInput) {
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

function toFrontendDateTime(value: string) {
  return value.slice(0, 16)
}

function toBackendDateTime(value: string) {
  if (/[zZ]$|[+-]\d\d:\d\d$/.test(value)) return value
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return `${value}:00Z`
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)) return `${value}Z`

  return value
}

function toBooking(response: BookingResponse): Booking {
  return {
    id: response.id,
    title: response.title,
    roomId: response.room_id,
    createdBy: {
      id: response.created_by.id,
      email: response.created_by.email,
    },
    start_at: toFrontendDateTime(response.start_at),
    end_at: toFrontendDateTime(response.end_at),
    status: response.status === "canceled" ? "cancelled" : "active",
    participants: response.participants,
  }
}

function toBookingRequest(input: BookingInput): BookingRequest {
  return {
    title: input.title,
    room_id: input.roomId,
    start_at: toBackendDateTime(input.start_at),
    end_at: toBackendDateTime(input.end_at),
    participants: input.participants,
  }
}

function toServiceError(error: unknown): Error {
  if (error instanceof ApiError) {
    const code =
      error.status === 409
        ? "BOOKING_CONFLICT"
        : error.status === 404
          ? "NOT_FOUND"
          : error.status === 422
            ? "VALIDATION_ERROR"
            : "API_ERROR"

    return new ServiceError(code, error.message)
  }

  if (error instanceof Error) return error

  return new ServiceError("API_ERROR", "Nao foi possivel concluir a acao.")
}

export async function listBookings(): Promise<Booking[]> {
  try {
    const bookings = await apiFetch<BookingResponse[]>("/bookings")

    return bookings.map(toBooking)
  } catch (error) {
    throw toServiceError(error)
  }
}

export async function createBooking(input: BookingInput): Promise<Booking> {
  const normalized = normalizeInput(input)
  validateBooking(normalized)

  try {
    const booking = await apiFetch<BookingResponse>("/bookings", {
      method: "POST",
      body: JSON.stringify(toBookingRequest(normalized)),
    })

    return toBooking(booking)
  } catch (error) {
    throw toServiceError(error)
  }
}

export async function updateBooking(
  id: string,
  input: BookingInput,
): Promise<Booking> {
  const normalized = normalizeInput(input)
  validateBooking(normalized)

  try {
    const booking = await apiFetch<BookingResponse>(`/bookings/${id}`, {
      method: "PUT",
      body: JSON.stringify(toBookingRequest(normalized)),
    })

    return toBooking(booking)
  } catch (error) {
    throw toServiceError(error)
  }
}

export async function cancelBooking(id: string): Promise<Booking> {
  try {
    const booking = await apiFetch<BookingResponse>(`/bookings/${id}/cancel`, {
      method: "POST",
    })

    return toBooking(booking)
  } catch (error) {
    throw toServiceError(error)
  }
}

export const bookingService = {
  listBookings,
  createBooking,
  updateBooking,
  cancelBooking,
}
