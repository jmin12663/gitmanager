import client from './client'

export const getInviteCodeApi = (projectId: number) =>
  client.get(`/projects/${projectId}/invite-code`)

export const regenerateInviteCodeApi = (projectId: number) =>
  client.post(`/projects/${projectId}/invite-code/regenerate`)

export const getMembersApi = (projectId: number) =>
  client.get(`/projects/${projectId}/members`)

export const kickMemberApi = (projectId: number, targetUserId: number) =>
  client.delete(`/projects/${projectId}/members/${targetUserId}`)

export const leaveProjectApi = (projectId: number, newOwnerId?: number) =>
  client.post(`/projects/${projectId}/leave`, newOwnerId ? { newOwnerId } : {})

export const deleteProjectApi = (projectId: number) =>
  client.delete(`/projects/${projectId}`)

export const getGithubConfigApi = (projectId: number) =>
  client.get(`/projects/${projectId}/github`)

export const getOAuthRedirectUrlApi = (projectId: number, repoUrl: string) =>
  client.get('/github/oauth/redirect', { params: { projectId, repoUrl } })

export const syncGithubApi = (projectId: number) =>
  client.post(`/projects/${projectId}/github/sync`)
