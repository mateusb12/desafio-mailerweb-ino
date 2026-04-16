import { mockUser } from "./mockData"
import { ServiceError } from "./serviceError"
import { clone, wait } from "./mockUtils"
import type { UserProfile } from "../types/domain"

const TOKEN_KEY = "mock_token"

export type LoginResponse = {
  access_token: string
  user: UserProfile
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  await wait(null, 520)

  if (!email || !password) {
    throw new ServiceError("AUTH_INVALID", "Informe email e senha para entrar.")
  }

  const user = { ...mockUser, email }
  const access_token = "mock-access-token"
  localStorage.setItem(TOKEN_KEY, access_token)

  return { access_token, user }
}

export async function me(): Promise<UserProfile> {
  await wait(null, 260)

  if (!getToken()) {
    throw new ServiceError("AUTH_INVALID", "Sessão expirada. Faça login novamente.")
  }

  return clone(mockUser)
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export const authService = {
  login,
  me,
  logout,
  getToken,
}
