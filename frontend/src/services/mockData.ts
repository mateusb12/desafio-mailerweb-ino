import type { Booking, Room, UserProfile } from "../types/domain"

export const mockUsers: UserProfile[] = [
  {
    id: "usr-001",
    name: "Ana Silva",
    email: "ana.silva@mailerweb.com",
    role: "admin",
    is_active: true,
  },
  {
    id: "usr-002",
    name: "Bruno Lima",
    email: "bruno.lima@mailerweb.com",
    role: "user",
    is_active: true,
  },
  {
    id: "usr-003",
    name: "Carla Rocha",
    email: "carla.rocha@mailerweb.com",
    role: "user",
    is_active: true,
  },
  {
    id: "usr-004",
    name: "Diego Moura",
    email: "diego.moura@mailerweb.com",
    role: "user",
    is_active: true,
  },
  {
    id: "usr-005",
    name: "Marina Costa",
    email: "marina.costa@mailerweb.com",
    role: "user",
    is_active: true,
  },
]

export const mockUser = mockUsers[0]

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
    createdBy: {
      id: "usr-001",
      name: "Ana Silva",
      email: "ana.silva@mailerweb.com",
    },
    start_at: "2026-04-16T09:00",
    end_at: "2026-04-16T09:30",
    status: "active",
    participants: ["ana.silva@mailerweb.com", "bruno.lima@mailerweb.com"],
  },
  {
    id: "booking-002",
    title: "Planejamento Sprint",
    roomId: "room-atlas",
    createdBy: {
      id: "usr-003",
      name: "Carla Rocha",
      email: "carla.rocha@mailerweb.com",
    },
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
    createdBy: {
      id: "usr-002",
      name: "Bruno Lima",
      email: "bruno.lima@mailerweb.com",
    },
    start_at: "2026-04-16T14:00",
    end_at: "2026-04-16T15:00",
    status: "cancelled",
    participants: ["people@mailerweb.com", "candidato@example.com"],
  },
  {
    id: "booking-004",
    title: "Revisao de Campanha",
    roomId: "room-nexus",
    createdBy: {
      id: "usr-005",
      name: "Marina Costa",
      email: "marina.costa@mailerweb.com",
    },
    start_at: "2026-04-16T15:30",
    end_at: "2026-04-16T16:30",
    status: "active",
    participants: [
      "marina.costa@mailerweb.com",
      "ana.silva@mailerweb.com",
      "bruno.lima@mailerweb.com",
    ],
  },
  {
    id: "booking-005",
    title: "1:1 Lideranca",
    roomId: "room-rio",
    createdBy: {
      id: "usr-001",
      name: "Ana Silva",
      email: "ana.silva@mailerweb.com",
    },
    start_at: "2026-04-17T11:00",
    end_at: "2026-04-17T11:45",
    status: "active",
    participants: ["ana.silva@mailerweb.com", "diego.moura@mailerweb.com"],
  },
  {
    id: "booking-006",
    title: "Alinhamento Financeiro",
    roomId: "room-atlas",
    createdBy: {
      id: "usr-004",
      name: "Diego Moura",
      email: "diego.moura@mailerweb.com",
    },
    start_at: "2026-04-17T13:30",
    end_at: "2026-04-17T14:30",
    status: "cancelled",
    participants: [
      "diego.moura@mailerweb.com",
      "carla.rocha@mailerweb.com",
      "financeiro@mailerweb.com",
    ],
  },
]
