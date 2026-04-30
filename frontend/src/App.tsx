import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/store/AuthProvider'
import AppLayout from '@/components/AppLayout'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import VerifyPage from '@/pages/VerifyPage'
import BoardPage from '@/pages/BoardPage'
import CalendarPage from '@/pages/CalendarPage'
import DashboardPage from '@/pages/DashboardPage'
import SettingsPage from '@/pages/SettingsPage'
import TodoPage from '@/pages/TodoPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth pages (no layout) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify" element={<VerifyPage />} />

          {/* App pages (with sidebar layout) */}
          <Route element={<AppLayout />}>
            <Route path="/todo" element={<TodoPage />} />
            <Route path="/projects/:projectId/board" element={<BoardPage />} />
            <Route path="/projects/:projectId/calendar" element={<CalendarPage />} />
            <Route path="/projects/:projectId/dashboard" element={<DashboardPage />} />
            <Route path="/projects/:projectId/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}