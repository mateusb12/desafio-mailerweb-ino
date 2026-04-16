export type UserRole = "admin" | "user"

export type BookingStatus = "active" | "cancelled"

export type UserProfile = {
  id: string
  email: string
  role: UserRole
  is_active: boolean
}

export type Room = {
  id: string
  name: string
  capacity: number
}

export type Booking = {
  id: string
  title: string
  roomId: string
  start_at: string
  end_at: string
  status: BookingStatus
  participants: string[]
}

export type BookingInput = {
  title: string
  roomId: string
  start_at: string
  end_at: string
  participants: string[]
}
