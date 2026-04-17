import { ApiError, apiFetch } from "../api/client"
import type { Room, RoomInput } from "../types/domain"
import { ServiceError } from "./serviceError"

type RoomResponse = {
  id: string
  name: string
  capacity: number
}

type RoomRequest = {
  name: string
  capacity: number
}

function validateRoom(input: RoomInput) {
  if (!input.name.trim()) {
    throw new ServiceError("VALIDATION_ERROR", "Informe o nome da sala.")
  }

  if (!Number.isInteger(input.capacity) || input.capacity <= 0) {
    throw new ServiceError(
      "VALIDATION_ERROR",
      "Informe uma capacidade maior que zero.",
    )
  }
}

function normalizeRoom(input: RoomInput): RoomInput {
  return {
    name: input.name.trim(),
    capacity: input.capacity,
  }
}

function toRoomRequest(input: RoomInput): RoomRequest {
  return {
    name: input.name,
    capacity: input.capacity,
  }
}

function toServiceError(error: unknown): Error {
  if (error instanceof ApiError) {
    const code =
      error.status === 409
        ? "VALIDATION_ERROR"
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

export async function listRooms(): Promise<Room[]> {
  try {
    return await apiFetch<RoomResponse[]>("/rooms")
  } catch (error) {
    throw toServiceError(error)
  }
}

export async function getRoom(id: string): Promise<Room> {
  try {
    return await apiFetch<RoomResponse>(`/rooms/${id}`)
  } catch (error) {
    throw toServiceError(error)
  }
}

export async function createRoom(input: RoomInput): Promise<Room> {
  const normalized = normalizeRoom(input)
  validateRoom(normalized)

  try {
    return await apiFetch<RoomResponse>("/rooms", {
      method: "POST",
      body: JSON.stringify(toRoomRequest(normalized)),
    })
  } catch (error) {
    throw toServiceError(error)
  }
}

export const roomService = {
  listRooms,
  getRoom,
  createRoom,
}
