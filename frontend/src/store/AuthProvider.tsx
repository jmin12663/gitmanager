import { useState, useEffect, type ReactNode } from 'react'
import { AuthContext, type AuthUser } from './authStore'
import client, { setAccessToken } from '@/api/client'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    client.post('/auth/refresh', {})
      .then(({ data }) => {
        setAccessToken(data.data.accessToken)
        return client.get('/auth/me')
      })
      .then(({ data }) => setUser(data.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <AuthContext.Provider value={{ user, setUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}
