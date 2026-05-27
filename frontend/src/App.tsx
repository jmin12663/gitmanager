import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/store/AuthProvider'
import AppLayout from '@/components/AppLayout'
import LoginPage from '@/pages/LoginPage'
import BoardPage from '@/pages/BoardPage'
import CalendarPage from '@/pages/CalendarPage'
import DashboardPage from '@/pages/DashboardPage'
import SettingsPage from '@/pages/SettingsPage'
import TodoPage from '@/pages/TodoPage'
import ProfilePage from '@/pages/ProfilePage'
import PullRequestsPage from '@/pages/PullRequestsPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<AppLayout />}>
            <Route path="/todo" element={<TodoPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/projects/:projectId/board" element={<BoardPage />} />
            <Route path="/projects/:projectId/calendar" element={<CalendarPage />} />
            <Route path="/projects/:projectId/dashboard" element={<DashboardPage />} />
            <Route path="/projects/:projectId/settings" element={<SettingsPage />} />
            <Route path="/projects/:projectId/pulls" element={<PullRequestsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}