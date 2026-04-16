import { apiFetch } from "../api/client"
import type { Room } from "../types/domain"

type RoomResponse = {
  id: string
  name: string
  capacity: number
}

export async function listRooms(): Promise<Room[]> {
  return apiFetch<RoomResponse[]>("/rooms")
}

export const roomService = {
  listRooms,
}
