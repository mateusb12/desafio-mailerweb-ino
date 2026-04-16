import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import "dayjs/locale/pt-br"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import AuthenticatedLayout from "./components/AuthenticatedLayout"
import ProtectedRoute from "./components/ProtectedRoute"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import DashboardPage from "./pages/DashboardPage"
import RoomsPage from "./pages/RoomsPage"
import BookingsPage from "./pages/BookingsPage"

function App() {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <DashboardPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/salas"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <RoomsPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/reservas"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <BookingsPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </LocalizationProvider>
  )
}

export default App
