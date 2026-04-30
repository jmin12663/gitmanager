import client from './client'

export interface LoginPayload {
  identifier: string
  password: string
}

export interface RegisterPayload {
  name: string
  loginId: string
  email: string
  password: string
}

export interface VerifyEmailPayload {
  email: string
  code: string
}

export const loginApi = (data: LoginPayload) =>
  client.post('/auth/login', data)

export const registerApi = (data: RegisterPayload) =>
  client.post('/auth/register', data)

export const verifyEmailApi = (data: VerifyEmailPayload) =>
  client.post('/auth/verify-email', data)

export const getMeApi = () =>
  client.get('/auth/me')