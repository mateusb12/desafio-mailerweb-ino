import type { Booking, Room, UserProfile } from "../types/domain"

export const mockUser: UserProfile = {
  id: "usr-001",
  email: "ana.silva@mailerweb.com",
  role: "admin",
  is_active: true,
}

export const mockRooms: Room[] = [
  { id: "room-aurora", name: "Sala Aurora", capacity: 6 },
  { id: "room-atlas", name: "Sala Atlas", capacity: 10 },
  { id: "room-rio", name: "Sala Rio", capacity: 4 },
  { id: "room-nexus", name: "Sala Nexus", capacity: 16 },
]

export const mockBookings: Booking[] = [
  {
    id: "booking-001",
    title: "Daily Produto",
    roomId: "room-aurora",
    start_at: "2026-04-16T09:00",
    end_at: "2026-04-16T09:30",
    status: "active",
    participants: ["ana.silva@mailerweb.com", "bruno.lima@mailerweb.com"],
  },
  {
    id: "booking-002",
    title: "Planejamento Sprint",
    roomId: "room-atlas",
    start_at: "2026-04-16T10:00",
    end_at: "2026-04-16T11:30",
    status: "active",
    participants: [
      "ana.silva@mailerweb.com",
      "carla.rocha@mailerweb.com",
      "diego.moura@mailerweb.com",
    ],
  },
  {
    id: "booking-003",
    title: "Entrevista Engenharia",
    roomId: "room-rio",
    start_at: "2026-04-16T14:00",
    end_at: "2026-04-16T15:00",
    status: "cancelled",
    participants: ["people@mailerweb.com", "candidato@example.com"],
  },
]
