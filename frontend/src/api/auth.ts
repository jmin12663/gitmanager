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

export const sendEmailCodeApi = (email: string) =>
  client.post('/auth/send-email-code', { email })

export const verifyEmailCodeApi = (data: VerifyEmailPayload) =>
  client.post('/auth/verify-email-code', data)

export const verifyEmailApi = (data: VerifyEmailPayload) =>
  client.post('/auth/verify-email', data)

export const getMeApi = () =>
  client.get('/auth/me')

export const logoutApi = () =>
  client.post('/auth/logout')

export const updateProfileApi = (name: string) =>
  client.patch('/auth/me', { name })

export const checkLoginIdApi = (loginId: string) =>
  client.get('/auth/check-login-id', { params: { loginId } })

export const updateLoginIdApi = (loginId: string) =>
  client.patch('/auth/login-id', { loginId })

export const changePasswordApi = (currentPassword: string, newPassword: string) =>
  client.patch('/auth/password', { currentPassword, newPassword })