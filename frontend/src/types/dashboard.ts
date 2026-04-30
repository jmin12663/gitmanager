export interface CardStatusSummary {
  backlog: number
  inProgress: number
  done: number
  total: number
  progressRate: number
}

export interface RecentCommit {
  commitSha: string
  message: string
  author: string
  committedAt: string | null
  cardTitle: string
}

export interface MemberSummary {
  userId: number
  name: string
  role: string
  assignedCardCount: number
}

export interface DashboardData {
  cardSummary: CardStatusSummary
  recentCommits: RecentCommit[]
  members: MemberSummary[]
}