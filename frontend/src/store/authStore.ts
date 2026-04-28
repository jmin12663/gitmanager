import { createContext, useContext } from 'react'

export interface AuthUser {
  userId: number
  loginId: string
  name: string
  email: string
}

export interface AuthContextType {
  user: AuthUser | null
  setUser: (user: AuthUser | null) => void
  isLoading: boolean
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  isLoading: true,
})

export const useAuth = () => useContext(AuthContext)
