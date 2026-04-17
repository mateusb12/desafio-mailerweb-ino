import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import { AuthContext, type AuthContextType } from "../../hooks/authContext"
import { AuthProvider } from "../../hooks/useAuth"
import BookingsPage from "../BookingsPage"
import LoginPage from "../LoginPage"

const currentUser = {
  id: "user-1",
  email: "ana@example.com",
  role: "user",
  is_active: true,
} as const

const room = {
  id: "room-1",
  name: "Sala Azul",
  capacity: 8,
}

const createdBooking = {
  id: "booking-1",
  title: "Reuniao de produto",
  room_id: room.id,
  created_by: currentUser,
  start_at: "2026-05-20T09:00:00Z",
  end_at: "2026-05-20T10:00:00Z",
  status: "active",
  participants: ["maria@example.com"],
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function requestPath(input: RequestInfo | URL) {
  const url = input instanceof Request ? input.url : String(input)

  return new URL(url).pathname
}

function renderWithAuth(children: React.ReactNode, auth?: Partial<AuthContextType>) {
  const value: AuthContextType = {
    user: currentUser,
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    ...auth,
  }

  return render(<AuthContext.Provider value={value}>{children}</AuthContext.Provider>)
}

function renderBookingsPage() {
  renderWithAuth(<BookingsPage />)
}

function mockBookingBackend(options: { conflict?: boolean } = {}) {
  let bookings: typeof createdBooking[] = []

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = requestPath(input)
    const method = init?.method ?? "GET"

    if (path === "/rooms" && method === "GET") {
      return jsonResponse([room])
    }

    if (path === "/bookings" && method === "GET") {
      return jsonResponse(bookings)
    }

    if (path === "/bookings" && method === "POST") {
      if (options.conflict) {
        return jsonResponse({ detail: "Sala ocupada neste horario." }, 409)
      }

      bookings = [createdBooking]
      return jsonResponse(createdBooking, 201)
    }

    return jsonResponse({ detail: "Rota nao mockada" }, 500)
  })

  vi.stubGlobal("fetch", fetchMock)

  return fetchMock
}

async function fillBookingForm() {
  const user = userEvent.setup()

  await screen.findByRole("button", { name: /criar reserva/i })

  await user.type(screen.getByRole("textbox", { name: /titulo/i }), createdBooking.title)
  await user.selectOptions(screen.getByLabelText("Sala"), room.id)
  await user.type(
    screen.getByRole("textbox", { name: /data da reserva/i }),
    "20/05/2026",
  )
  await user.tab()
  await user.type(
    screen.getByRole("textbox", { name: "Horario de inicio" }),
    "09:00",
  )
  await user.tab()
  await user.type(screen.getByRole("textbox", { name: "Horario de fim" }), "10:00")
  await user.tab()
  await user.type(
    screen.getByRole("textbox", { name: /participantes/i }),
    "maria@example.com",
  )
  await user.click(screen.getByRole("button", { name: /criar reserva/i }))
}

describe("fluxos frontend minimos", () => {
  it("faz login e redireciona para a area autenticada", async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestPath(input)
      const method = init?.method ?? "GET"

      if (path === "/health") {
        return jsonResponse({ status: "ok" })
      }

      if (path === "/auth/login" && method === "POST") {
        return jsonResponse({ access_token: "test-token", token_type: "bearer" })
      }

      if (path === "/auth/me" && method === "GET") {
        return jsonResponse(currentUser)
      }

      return jsonResponse({ detail: "Rota nao mockada" }, 500)
    })

    vi.stubGlobal("fetch", fetchMock)

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/app" element={<div>Area autenticada</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    )

    await screen.findByText("API online")
    await user.type(screen.getByLabelText(/email/i), currentUser.email)
    await user.type(screen.getByLabelText(/senha/i), "secret123")
    await user.click(screen.getByRole("button", { name: "Entrar" }))

    await waitFor(() => {
      expect(localStorage.getItem("token")).toBe("test-token")
    })
    expect(await screen.findByText("Area autenticada")).toBeInTheDocument()

    const loginCall = fetchMock.mock.calls.find(([input, init]) => {
      return requestPath(input) === "/auth/login" && init?.method === "POST"
    })

    expect(loginCall).toBeDefined()
    expect(JSON.parse(String(loginCall?.[1]?.body))).toMatchObject({
      email: currentUser.email,
      password: "secret123",
    })
  })

  it("cria uma reserva usando a UI integrada aos services com backend mockado", async () => {
    const fetchMock = mockBookingBackend()

    renderBookingsPage()
    await fillBookingForm()

    await screen.findByText(
      "Reserva criada. Participantes seriam notificados por email.",
    )
    expect(await screen.findByText(createdBooking.title)).toBeInTheDocument()

    const createCall = fetchMock.mock.calls.find(([input, init]) => {
      return requestPath(input) === "/bookings" && init?.method === "POST"
    })

    expect(createCall).toBeDefined()
    expect(JSON.parse(String(createCall?.[1]?.body))).toMatchObject({
      title: createdBooking.title,
      room_id: room.id,
      start_at: "2026-05-20T09:00:00Z",
      end_at: "2026-05-20T10:00:00Z",
      participants: ["maria@example.com"],
    })
  })

  it("exibe erro de conflito quando o backend retorna 409 ao criar reserva", async () => {
    mockBookingBackend({ conflict: true })

    renderBookingsPage()
    await fillBookingForm()

    expect(
      await screen.findByText("Sala ocupada neste horario."),
    ).toBeInTheDocument()
  })
})
