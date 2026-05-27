import client from './client'

export const getGithubLoginUrlApi = () =>
  client.get('/auth/github/login')

export const getMeApi = () =>
  client.get('/auth/me')

export const logoutApi = () =>
  client.post('/auth/logout')

export const updateProfileApi = (name: string) =>
  client.patch('/auth/me', { name })