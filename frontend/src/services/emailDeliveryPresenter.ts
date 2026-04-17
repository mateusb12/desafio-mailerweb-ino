import type { EmailDelivery, EmailDeliveryStatus } from "../types/domain"

export type EmailDeliveryDetailField = {
  label: string
  value: string
}

export type EmailDeliveryViewModel = {
  id: string
  recipientEmail: string
  title: string
  subtitle: string
  summary: string
  body: string
  typeLabel: string
  statusLabel: string
  status: EmailDeliveryStatus
  sourceLabel: string
  formattedCreatedAt: string
  detailFields: EmailDeliveryDetailField[]
  hasStructuredDetails: boolean
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

const eventTypeLabels: Record<string, string> = {
  booking_created: "Reserva criada",
  booking_updated: "Reserva alterada",
  booking_canceled: "Reserva cancelada",
  system_welcome: "Mensagem do sistema",
}

const statusLabels: Record<EmailDeliveryStatus, string> = {
  processed: "Enviado",
  delivered: "Entregue",
}

const bodyFieldLabels: Record<string, string> = {
  evento: "Tipo do evento",
  titulo: "Titulo da reuniao",
  sala: "Sala",
  inicio: "Inicio",
  fim: "Fim",
  status: "Status da reserva",
  participantes: "Participantes",
}

function normalizeToken(value: string) {
  return value.trim().toLowerCase()
}

function formatTechnicalValue(value: string) {
  const normalized = normalizeToken(value)
  const knownLabel = eventTypeLabels[normalized]
  if (knownLabel) return knownLabel

  if (normalized === "active") return "Ativa"
  if (normalized === "cancelled" || normalized === "canceled") return "Cancelada"
  if (normalized === "processed") return "Enviado"
  if (normalized === "delivered") return "Entregue"

  return value
    .split("_")
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
}

function formatDateTime(value: string) {
  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) return value

  return dateFormatter.format(parsedDate).replace(",", "")
}

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function previewText(value: string, limit = 132) {
  const compacted = compactText(value)
  return compacted.length > limit ? `${compacted.slice(0, limit)}...` : compacted
}

function parseBodyFields(body: string) {
  return body
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((fields, line) => {
      const separatorIndex = line.indexOf(":")
      if (separatorIndex <= 0) return fields

      const key = normalizeToken(line.slice(0, separatorIndex))
      const value = line.slice(separatorIndex + 1).trim()
      if (key && value) fields[key] = value

      return fields
    }, {})
}

function buildDetailFields(body: string): EmailDeliveryDetailField[] {
  const parsedFields = parseBodyFields(body)

  return Object.entries(bodyFieldLabels)
    .map(([key, label]) => {
      const rawValue = parsedFields[key]
      if (!rawValue) return null

      const value =
        key === "evento" || key === "status" ? formatTechnicalValue(rawValue) : rawValue

      return { label, value }
    })
    .filter((field): field is EmailDeliveryDetailField => field !== null)
}

function getTypeLabel(email: EmailDelivery, detailFields: EmailDeliveryDetailField[]) {
  const eventField = detailFields.find(field => field.label === "Tipo do evento")
  if (eventField) return eventField.value

  return formatTechnicalValue(email.emailType)
}

function getTitle(email: EmailDelivery, typeLabel: string, detailFields: EmailDeliveryDetailField[]) {
  const meetingTitle = detailFields.find(field => field.label === "Titulo da reuniao")?.value

  if (meetingTitle) return `${typeLabel}: ${meetingTitle}`
  if (email.emailType === "system_welcome") return "Boas-vindas as notificacoes"
  if (email.subject.toLowerCase().startsWith("booking ")) return typeLabel

  return email.subject
}

function getSummary(email: EmailDelivery, detailFields: EmailDeliveryDetailField[]) {
  const room = detailFields.find(field => field.label === "Sala")?.value
  const start = detailFields.find(field => field.label === "Inicio")?.value
  const participants = detailFields.find(field => field.label === "Participantes")?.value

  if (room && start) {
    const suffix = participants ? ` Participantes: ${participants}.` : ""
    return `Reserva na sala ${room}, com inicio em ${start}.${suffix}`
  }

  return previewText(email.body)
}

export function toEmailDeliveryViewModel(email: EmailDelivery): EmailDeliveryViewModel {
  const detailFields = buildDetailFields(email.body)
  const typeLabel = getTypeLabel(email, detailFields)

  return {
    id: email.id,
    recipientEmail: email.recipientEmail,
    title: getTitle(email, typeLabel, detailFields),
    subtitle: `Para ${email.recipientEmail}`,
    summary: getSummary(email, detailFields),
    body: email.body,
    typeLabel,
    statusLabel: statusLabels[email.status],
    status: email.status,
    sourceLabel: email.sourceEventId ? "Notificacao automatica" : "Mensagem de demonstracao",
    formattedCreatedAt: formatDateTime(email.createdAt),
    detailFields,
    hasStructuredDetails: detailFields.length > 0,
  }
}
