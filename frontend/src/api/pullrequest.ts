import client from './client'
import type { CreatePrCommentBody, PrLineComment, PullFile, PullRequest } from '@/types/pullrequest'

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

export const getPrCommentsApi = (projectId: number, prNumber: number) =>
  client.get<{ success: boolean; data: PrLineComment[] }>(
    `/projects/${projectId}/pulls/${prNumber}/comments`
  )

export const createPrCommentApi = (projectId: number, prNumber: number, body: CreatePrCommentBody) =>
  client.post<{ success: boolean; data: PrLineComment }>(
    `/projects/${projectId}/pulls/${prNumber}/comments`,
    body
  )

export const createPrCommentReplyApi = (projectId: number, prNumber: number, commentId: number, body: string) =>
  client.post<{ success: boolean; data: PrLineComment }>(
    `/projects/${projectId}/pulls/${prNumber}/comments/${commentId}/replies`,
    { body }
  )
