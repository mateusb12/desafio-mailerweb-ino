import { apiFetch } from "./client"
import type { components } from "./schema"

export type LoginRequest = components["schemas"]["LoginRequest"]
export type RegisterRequest = LoginRequest
export type TokenResponse = components["schemas"]["TokenResponse"]

export type UserProfile = {
  id: string
  email: string
  role: string
  is_active: boolean
}

export function login(email: string, password: string) {
  return apiFetch<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password } satisfies LoginRequest),
  })
}

export function register(email: string, password: string) {
  return apiFetch<UserProfile>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password } satisfies RegisterRequest),
  })
}

export function me() {
  return apiFetch<UserProfile>("/auth/me")
}

export function logout() {
  localStorage.removeItem("token")
}

export function setToken(token: string) {
  localStorage.setItem("token", token)
}

export function getToken() {
  return localStorage.getItem("token")
}

export const auth = {
  login,
  register,
  me,
  logout,
  setToken,
  getToken,
}
