export interface PullFile {
  filename: string
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | string
  additions: number
  deletions: number
  patch: string | null
}

export interface ReviewerInfo {
  login: string
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'PENDING'
}

export interface PullRequest {
  number: number
  title: string
  state: 'OPEN' | 'DRAFT' | 'MERGED' | 'CLOSED'
  htmlUrl: string
  author: string
  reviewers: ReviewerInfo[]
  createdAt: string
  branchName: string
  baseBranch: string
  headSha: string
}

export interface CreatePrBody {
  title: string
  body?: string
  head: string
  base: string
}

export interface MergePrBody {
  mergeMethod: 'merge' | 'squash' | 'rebase'
}

export interface CreatePrCommentBody {
  body: string
  commitId: string
  path: string
  line: number
  side: 'RIGHT' | 'LEFT'
}

export interface PrLineComment {
  id: number
  path: string
  line: number | null
  side: string
  body: string
  author: string
  createdAt: string
  inReplyToId?: number | null
}
