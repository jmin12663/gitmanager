export type ProjectRole = 'OWNER' | 'MEMBER'

export interface Project {
  id: number
  name: string
  description: string | null
  startDate: string | null
  endDate: string | null
  createdBy: number
  createdAt: string
  myRole: ProjectRole
}