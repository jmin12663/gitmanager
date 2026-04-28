import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/store/AuthProvider'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import VerifyPage from '@/pages/VerifyPage'
import BoardPage from '@/pages/BoardPage'
import CalendarPage from '@/pages/CalendarPage'
import DashboardPage from '@/pages/DashboardPage'
import TodoPage from '@/pages/TodoPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/todo" element={<TodoPage />} />
          <Route path="/projects/:projectId/board" element={<BoardPage />} />
          <Route path="/projects/:projectId/calendar" element={<CalendarPage />} />
          <Route path="/projects/:projectId/dashboard" element={<DashboardPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
