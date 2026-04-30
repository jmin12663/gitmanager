import client from './client'

export const getMyProjectsApi = () =>
  client.get('/projects')

export const createProjectApi = (data: {
  name: string
  description?: string
  startDate?: string
  endDate?: string
}) => client.post('/projects', data)

export const joinProjectApi = (inviteCode: string) =>
  client.post('/projects/join', { inviteCode })