import client from './client'

export const getBoardApi = (projectId: number) =>
  client.get(`/projects/${projectId}/board`)

export const createCardApi = (projectId: number, body: { title: string; dueDate?: string; memo?: string; assigneeIds?: number[] }) =>
  client.post(`/projects/${projectId}/cards`, body)

export const getCardApi = (projectId: number, cardId: number) =>
  client.get(`/projects/${projectId}/cards/${cardId}`)

export const updateCardApi = (projectId: number, cardId: number, body: { title: string; dueDate?: string; memo?: string; assigneeIds?: number[] }) =>
  client.patch(`/projects/${projectId}/cards/${cardId}`, body)

export const updateCardStatusApi = (projectId: number, cardId: number, status: string) =>
  client.patch(`/projects/${projectId}/cards/${cardId}/status`, { status })

export const deleteCardApi = (projectId: number, cardId: number) =>
  client.delete(`/projects/${projectId}/cards/${cardId}`)

export const getCommentsApi = (projectId: number, cardId: number) =>
  client.get(`/projects/${projectId}/cards/${cardId}/comments`)

export const createCommentApi = (projectId: number, cardId: number, content: string) =>
  client.post(`/projects/${projectId}/cards/${cardId}/comments`, { content })

export const deleteCommentApi = (projectId: number, cardId: number, commentId: number) =>
  client.delete(`/projects/${projectId}/cards/${cardId}/comments/${commentId}`)

export const addBranchApi = (projectId: number, cardId: number, body: { branchName: string; repoName: string }) =>
  client.post(`/projects/${projectId}/cards/${cardId}/branches`, body)

export const removeBranchApi = (projectId: number, cardId: number, branchName: string) =>
  client.delete(`/projects/${projectId}/cards/${cardId}/branches/${encodeURIComponent(branchName)}`)