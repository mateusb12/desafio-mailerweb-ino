export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

type ApiErrorDetail =
  | string
  | Array<{
      loc?: Array<string | number>
      msg: string
      type?: string
    }>

export class ApiError extends Error {
  status: number
  detail: ApiErrorDetail | null

  constructor(message: string, status: number, detail: ApiErrorDetail | null) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.detail = detail
  }
}

function getErrorMessage(detail: ApiErrorDetail | null, fallback: string) {
  if (typeof detail === "string") return detail

  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map(item => {
        const field = item.loc?.[item.loc.length - 1]

        return field ? `${String(field)}: ${item.msg}` : item.msg
      })
      .join(", ")
  }

  return fallback
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem("token")
  const headers = new Headers(options.headers)

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json")
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    const detail = (data?.detail ?? null) as ApiErrorDetail | null
    const message = getErrorMessage(detail, `Request failed with ${response.status}`)

    throw new ApiError(message, response.status, detail)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
