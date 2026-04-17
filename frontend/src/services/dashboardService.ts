import { ApiError, apiFetch } from "../api/client"
import type { DashboardBookingSummary, DashboardMetrics } from "../types/domain"
import { ServiceError } from "./serviceError"

type DashboardBookingSummaryResponse = {
  id: string
  title: string
  room_id: string
  room_name: string
  start_at: string
  end_at: string
  participants_count: number
}

type DashboardMetricsResponse = {
  rooms_count: number
  active_bookings_count: number
  today_active_bookings_count: number
  my_upcoming_bookings_count: number
  email_deliveries_count: number
  processed_email_deliveries_count: number
  pending_outbox_events_count: number
  failed_outbox_events_count: number
  next_booking: DashboardBookingSummaryResponse | null
}

function toBookingSummary(
  response: DashboardBookingSummaryResponse,
): DashboardBookingSummary {
  return {
    id: response.id,
    title: response.title,
    roomId: response.room_id,
    roomName: response.room_name,
    startAt: response.start_at,
    endAt: response.end_at,
    participantsCount: response.participants_count,
  }
}

function toDashboardMetrics(response: DashboardMetricsResponse): DashboardMetrics {
  return {
    roomsCount: response.rooms_count,
    activeBookingsCount: response.active_bookings_count,
    todayActiveBookingsCount: response.today_active_bookings_count,
    myUpcomingBookingsCount: response.my_upcoming_bookings_count,
    emailDeliveriesCount: response.email_deliveries_count,
    processedEmailDeliveriesCount: response.processed_email_deliveries_count,
    pendingOutboxEventsCount: response.pending_outbox_events_count,
    failedOutboxEventsCount: response.failed_outbox_events_count,
    nextBooking: response.next_booking
      ? toBookingSummary(response.next_booking)
      : null,
  }
}

function toServiceError(error: unknown): Error {
  if (error instanceof ApiError) {
    return new ServiceError("API_ERROR", error.message)
  }

  if (error instanceof Error) return error

  return new ServiceError("API_ERROR", "Nao foi possivel carregar o dashboard.")
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    const metrics = await apiFetch<DashboardMetricsResponse>("/dashboard/metrics")

    return toDashboardMetrics(metrics)
  } catch (error) {
    throw toServiceError(error)
  }
}

export const dashboardService = {
  getDashboardMetrics,
}
