import client from './client'

export const getDashboardApi = (projectId: number) =>
  client.get(`/projects/${projectId}/dashboard`)