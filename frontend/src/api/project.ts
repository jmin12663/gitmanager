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

export const getProjectMembersApi = (projectId: number) =>
  client.get(`/projects/${projectId}/members`)

export const getProjectApi = (projectId: number) =>
  client.get(`/projects/${projectId}`)

export const updateProjectApi = (projectId: number, body: { name: string; description?: string; startDate?: string; endDate?: string }) =>
  client.patch(`/projects/${projectId}`, body)