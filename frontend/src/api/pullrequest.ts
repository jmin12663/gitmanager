import client from './client'
import type { CreatePrCommentBody, PullFile, PullRequest } from '@/types/pullrequest'

export const getCardPullsApi = (projectId: number, cardId: number) =>
  client.get<{ success: boolean; data: PullRequest[] }>(
    `/projects/${projectId}/cards/${cardId}/pulls`
  )

export const getProjectPullsApi = (projectId: number, state = 'open') =>
  client.get<{ success: boolean; data: PullRequest[] }>(
    `/projects/${projectId}/pulls?state=${state}`
  )

export const getPullFilesApi = (projectId: number, prNumber: number) =>
  client.get<{ success: boolean; data: PullFile[] }>(
    `/projects/${projectId}/pulls/${prNumber}/files`
  )

export const createPrCommentApi = (projectId: number, prNumber: number, body: CreatePrCommentBody) =>
  client.post<{ success: boolean }>(
    `/projects/${projectId}/pulls/${prNumber}/comments`,
    body
  )
