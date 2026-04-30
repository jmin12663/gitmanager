export type CardStatus = 'BACKLOG' | 'IN_PROGRESS' | 'DONE'

export interface Assignee {
  userId: number
  name: string
}

export interface Branch {
  branchName: string
  repoName: string
}

export interface CommitLog {
  commitSha: string
  message: string
  author: string
  committedAt: string | null
}

export interface CardSummary {
  id: number
  title: string
  status: CardStatus
  dueDate: string | null
  assignees: Assignee[]
}

export interface CardDetail {
  id: number
  title: string
  status: CardStatus
  dueDate: string | null
  memo: string | null
  createdBy: number
  mergedAt: string | null
  assignees: Assignee[]
  branches: Branch[]
  commitLogs: CommitLog[]
}

export interface BoardData {
  backlog: CardSummary[]
  inProgress: CardSummary[]
  done: CardSummary[]
}

export interface Comment {
  id: number
  userId: number
  userName: string
  content: string
  createdAt: string
}