import { clone, wait } from "./mockUtils"
import { mockRooms } from "./mockData"
import type { Room } from "../types/domain"

export async function listRooms(): Promise<Room[]> {
  return wait(clone(mockRooms))
}

export const roomService = {
  listRooms,
}
