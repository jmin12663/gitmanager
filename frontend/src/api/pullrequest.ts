import client from './client'
import type { CreatePrBody, CreatePrCommentBody, MergePrBody, PrLineComment, PullFile, PullRequest } from '@/types/pullrequest'

export const getRepoBranchesApi = (projectId: number) =>
  client.get<{ success: boolean; data: string[] }>(
    `/projects/${projectId}/branches`
  )

export const createPrApi = (projectId: number, body: CreatePrBody) =>
  client.post<{ success: boolean; data: PullRequest }>(
    `/projects/${projectId}/pulls`,
    body
  )

export const mergePrApi = (projectId: number, prNumber: number, body: MergePrBody) =>
  client.put<{ success: boolean; data: null }>(
    `/projects/${projectId}/pulls/${prNumber}/merge`,
    body
  )

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
