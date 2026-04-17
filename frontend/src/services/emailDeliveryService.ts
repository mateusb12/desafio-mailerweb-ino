import { ApiError, apiFetch } from "../api/client"
import { ServiceError } from "./serviceError"
import type { EmailDelivery, EmailDeliveryStatus } from "../types/domain"

type EmailDeliveryResponse = {
  id: string
  recipient_user_id: string | null
  recipient_email: string
  subject: string
  body: string
  email_type: string
  status: EmailDeliveryStatus
  source_event_id: string | null
  delivered_at: string | null
  created_at: string
}

function toEmailDelivery(response: EmailDeliveryResponse): EmailDelivery {
  return {
    id: response.id,
    recipientUserId: response.recipient_user_id,
    recipientEmail: response.recipient_email,
    subject: response.subject,
    body: response.body,
    emailType: response.email_type,
    status: response.status,
    sourceEventId: response.source_event_id,
    deliveredAt: response.delivered_at,
    createdAt: response.created_at,
  }
}

function toServiceError(error: unknown): Error {
  if (error instanceof ApiError) {
    return new ServiceError("API_ERROR", error.message)
  }

  if (error instanceof Error) return error

  return new ServiceError("API_ERROR", "Nao foi possivel carregar os emails.")
}

export async function listEmailDeliveries(): Promise<EmailDelivery[]> {
  try {
    const deliveries = await apiFetch<EmailDeliveryResponse[]>("/email-deliveries")

    return deliveries.map(toEmailDelivery)
  } catch (error) {
    throw toServiceError(error)
  }
}

export const emailDeliveryService = {
  listEmailDeliveries,
}
