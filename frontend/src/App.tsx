import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import AuthenticatedLayout from "./components/AuthenticatedLayout"
import ProtectedRoute from "./components/ProtectedRoute"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import DashboardPage from "./pages/DashboardPage"
import RoomsPage from "./pages/RoomsPage"
import BookingsPage from "./pages/BookingsPage"

function App() {
  return (
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
  )
}

export default App
