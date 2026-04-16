export type ServiceErrorCode =
  | "AUTH_INVALID"
  | "VALIDATION_ERROR"
  | "BOOKING_CONFLICT"
  | "NOT_FOUND"
  | "API_ERROR"

export class ServiceError extends Error {
  code: ServiceErrorCode

  constructor(code: ServiceErrorCode, message: string) {
    super(message)
    this.name = "ServiceError"
    this.code = code
  }
}
