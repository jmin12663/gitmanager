import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBoardSocket, type BoardSocketMessage } from '@/hooks/useBoardSocket'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import type { CardSummary, CardStatus, CardDetail, Comment, BoardData, Assignee } from '@/types/board'
import {
  getBoardApi,
  createCardApi,
  updateCardStatusApi,
  updateCardApi,
  getCardApi,
  getCommentsApi,
  createCommentApi,
  deleteCommentApi,
  deleteCardApi,
  addBranchApi,
  removeBranchApi,
} from '@/api/board'
import { getProjectMembersApi } from '@/api/project'
import { getCardPullsApi } from '@/api/pullrequest'
import type { PullRequest } from '@/types/pullrequest'

const AVATAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6']
const avatarColor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length]

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length < 3) return dateStr
  return `${parts[1]}/${parts[2]}`
}

function formatDateTime(dt: string | null): string {
  if (!dt) return ''
  const d = new Date(dt)
  const m = d.getMonth() + 1
  const day = d.getDate()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${m}/${day} ${hh}:${mm}`
}

function statusKey(status: CardStatus): keyof BoardData {
  if (status === 'BACKLOG') return 'backlog'
  if (status === 'IN_PROGRESS') return 'inProgress'
  return 'done'
}

const BranchIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" className="branch-icon-svg">
    <path d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 019 8.5H7a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 017 7h2a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5z" />
  </svg>
)

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
  </svg>
)

interface DraggableCardProps {
  card: CardSummary
  onClick: () => void
}

function DraggableCard({ card, onClick }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `card-${card.id}`,
    data: { cardId: card.id, status: card.status },
  })

  const style: React.CSSProperties = isDragging
    ? { opacity: 0.3 }
    : transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : {}

  const handleClick = () => {
    if (isDragging) return
    onClick()
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`kanban-card${card.status === 'DONE' ? ' done-card' : ''}`}
      onClick={handleClick}
      {...listeners}
      {...attributes}
    >
      <div className="card-header">
        <div className="card-title-text">{card.title}</div>
      </div>
      {card.dueDate && (
        <div className="card-date">마감일: {formatDate(card.dueDate)}</div>
      )}
      <div className="card-footer">
        <div className="card-assignees">
          {card.assignees.slice(0, 3).map(a => (
            <div
              key={a.userId}
              className="mini-avatar"
              style={{ background: avatarColor(a.userId) }}
              title={a.name}
            >
              {a.name[0]}
            </div>
          ))}
        </div>
        <div className="card-footer-meta">
          {card.commentCount > 0 && (
            <span className="card-comment-count">
              <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0113.25 12H9.06l-2.573 2.573A1.458 1.458 0 014 13.543V12H2.75A1.75 1.75 0 011 10.25v-7.5z" />
              </svg>
              {card.commentCount}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

interface DroppableColumnProps {
  status: CardStatus
  title: string
  badgeClass: string
  cards: CardSummary[]
  onAddCard: () => void
  onCardClick: (card: CardSummary) => void
}

function DroppableColumn({ status, title, badgeClass, cards, onAddCard, onCardClick }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="board-col" style={isOver ? { borderColor: 'var(--gm-accent)' } : {}}>
      <div className="col-head">
        <span className="col-title-text">{title}</span>
        <span className={`col-count-badge ${badgeClass}`}>{cards.length}</span>
        <div className="col-add-btn" onClick={onAddCard}>+</div>
      </div>
      <div ref={setNodeRef} className="col-cards">
        {cards.map(card => (
          <DraggableCard
            key={card.id}
            card={card}
            onClick={() => onCardClick(card)}
          />
        ))}
        {cards.length === 0 && <div className="col-empty-spacer" />}
      </div>
    </div>
  )
}

interface CreateCardModalProps {
  projectId: number
  onClose: () => void
  onCreate: (
    title: string,
    dueDate: string,
    memo: string,
    assigneeIds: number[],
    branches: { branchName: string; repoName: string }[]
  ) => Promise<void>
}

function CreateCardModal({ projectId, onClose, onCreate }: CreateCardModalProps) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [memo, setMemo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [members, setMembers] = useState<{ userId: number; name: string }[]>([])
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>([])

  const [branchInput, setBranchInput] = useState('')
  const [repoInput, setRepoInput] = useState('')
  const [branches, setBranches] = useState<{ branchName: string; repoName: string }[]>([])

  useEffect(() => {
    getProjectMembersApi(projectId)
      .then(res => setMembers(res.data.data.map((m: { userId: number; name: string }) => ({ userId: m.userId, name: m.name }))))
      .catch(() => {})
  }, [projectId])

  function toggleAssignee(userId: number) {
    setSelectedAssigneeIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  function handleAddBranch() {
    const name = branchInput.trim()
    const repo = repoInput.trim()
    if (!name || !repo) return
    if (branches.some(b => b.branchName === name)) return
    setBranches(prev => [...prev, { branchName: name, repoName: repo }])
    setBranchInput('')
    setRepoInput('')
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('이름을 입력하세요.'); return }
    setLoading(true)
    try {
      await onCreate(title.trim(), dueDate, memo, selectedAssigneeIds, branches)
      onClose()
    } catch {
      setError('카드 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="gm-modal-overlay" onClick={onClose}>
      <div className="gm-modal" onClick={e => e.stopPropagation()}>
        <button className="gm-modal-close" onClick={onClose}>×</button>
        <div className="gm-modal-title">카드 추가</div>
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>이름 (필수)</label>
            <input
              type="text"
              placeholder="카드 이름을 입력하세요"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="auth-field">
            <label>마감일</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div className="auth-field">
            <label>메모</label>
            <textarea
              placeholder="메모를 작성하세요"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              className="card-memo-textarea"
            />
          </div>

          {members.length > 0 && (
            <div className="auth-field">
              <label>담당자</label>
              <div className="assignee-chips">
                {members.map(m => {
                  const selected = selectedAssigneeIds.includes(m.userId)
                  return (
                    <label key={m.userId} className={`assignee-chip${selected ? ' selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleAssignee(m.userId)}
                      />
                      <div className="mini-avatar" style={{ background: avatarColor(m.userId) }}>
                        {m.name[0]}
                      </div>
                      {m.name}
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          <div className="auth-field">
            <label>레포 / 브랜치 연결</label>
            <div className="branch-input-stack">
              <input
                type="text"
                placeholder="Repositories (예: gitmanager)"
                value={repoInput}
                onChange={e => setRepoInput(e.target.value)}
              />
              <div className="branch-input-row">
                <input
                  type="text"
                  placeholder="Branch (예: feature/login)"
                  value={branchInput}
                  onChange={e => setBranchInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddBranch() } }}
                  className="branch-input-main"
                />
                <button
                  type="button"
                  onClick={handleAddBranch}
                  disabled={!branchInput.trim() || !repoInput.trim()}
                  className="branch-add-btn"
                >
                  추가
                </button>
              </div>
            </div>
            {branches.length > 0 && (
              <div className="branch-tag-list">
                {branches.map(b => (
                  <div key={b.branchName} className="branch-tag">
                    <BranchIcon />
                    {b.branchName}
                    <button
                      type="button"
                      onClick={() => setBranches(prev => prev.filter(x => x.branchName !== b.branchName))}
                      className="branch-tag-remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div className="auth-error">{error}</div>}
          <button className="auth-btn-primary" type="submit" disabled={loading}>
            {loading ? '생성 중...' : '만들기'}
          </button>
        </form>
      </div>
    </div>
  )
}

interface CardDetailModalProps {
  card: CardSummary
  projectId: number
  prRefreshKey: number
  onClose: () => void
  onDeleted: (cardId: number) => void
  onUpdated: (cardId: number, patch: { title?: string; dueDate?: string | null; commentCount?: number; assignees?: Assignee[] }) => void
}

function CardDetailModal({ card, projectId, prRefreshKey, onClose, onDeleted, onUpdated }: CardDetailModalProps) {
  const [detail, setDetail] = useState<CardDetail | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editMemo, setEditMemo] = useState('')
  const [saving, setSaving] = useState(false)
  const [members, setMembers] = useState<{ userId: number; name: string }[]>([])
  const [editAssigneeIds, setEditAssigneeIds] = useState<number[]>([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pulls, setPulls] = useState<PullRequest[]>([])
  const [pullsLoading, setPullsLoading] = useState(false)

  useEffect(() => {
    getProjectMembersApi(projectId)
      .then(res => setMembers(res.data.data.map((m: { userId: number; name: string }) => ({ userId: m.userId, name: m.name }))))
      .catch(() => {})
  }, [projectId])

  useEffect(() => {
    Promise.all([
      getCardApi(projectId, card.id),
      getCommentsApi(projectId, card.id),
    ])
      .then(([cardRes, commentRes]) => {
        setDetail(cardRes.data.data)
        setComments(commentRes.data.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectId, card.id])

  useEffect(() => {
    if (!detail || detail.branches.length === 0) return
    setPullsLoading(true)
    getCardPullsApi(projectId, card.id)
      .then(res => setPulls(res.data.data))
      .catch(() => {})
      .finally(() => setPullsLoading(false))
  }, [projectId, card.id, detail?.branches.length, prRefreshKey])  // prRefreshKey: PR_REVIEW_UPDATED 이벤트 수신 시 증가

  async function handleAddComment(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!newComment.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await createCommentApi(projectId, card.id, newComment.trim())
      const next = [...comments, res.data.data]
      setComments(next)
      setNewComment('')
      onUpdated(card.id, { commentCount: next.length })
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteComment(commentId: number) {
    try {
      await deleteCommentApi(projectId, card.id, commentId)
      const next = comments.filter(c => c.id !== commentId)
      setComments(next)
      onUpdated(card.id, { commentCount: next.length })
    } catch {}
  }

  async function handleDeleteCard() {
    try {
      await deleteCardApi(projectId, card.id)
      onDeleted(card.id)
      onClose()
    } catch {}
  }

  function startEdit() {
    if (!detail) return
    setEditTitle(detail.title)
    setEditDueDate(detail.dueDate ?? '')
    setEditMemo(detail.memo ?? '')
    setEditAssigneeIds(detail.assignees.map(a => a.userId))
    setIsEditing(true)
  }

  async function handleSave() {
    if (!detail || !editTitle.trim()) return
    setSaving(true)
    try {
      const body: { title: string; dueDate?: string; memo?: string; assigneeIds?: number[] } = { title: editTitle.trim() }
      if (editDueDate) body.dueDate = editDueDate
      if (editMemo.trim()) body.memo = editMemo.trim()
      body.assigneeIds = editAssigneeIds
      await updateCardApi(projectId, detail.id, body)
      const newAssignees = members.filter(m => editAssigneeIds.includes(m.userId))
      const updatedDetail = { ...detail, title: editTitle.trim(), dueDate: editDueDate || null, memo: editMemo.trim() || null, assignees: newAssignees }
      setDetail(updatedDetail)
      onUpdated(detail.id, { title: editTitle.trim(), dueDate: editDueDate || null, assignees: newAssignees })
      setIsEditing(false)
    } catch {
    } finally {
      setSaving(false)
    }
  }

  const STATUS_LABELS: Record<string, string> = {
    BACKLOG: 'Backlog',
    IN_PROGRESS: 'In Progress',
    DONE: 'Done',
  }

  return (
    <div className="gm-modal-overlay" onClick={onClose}>
      <div className="gm-modal card-detail-modal" onClick={e => e.stopPropagation()}>
        <button className="gm-modal-close" onClick={onClose}>×</button>

        {loading ? (
          <div className="card-detail-msg">로딩 중...</div>
        ) : detail ? (
          <>
            {isEditing ? (
              <>
                <div className="auth-field card-detail-field-sm">
                  <label>제목</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="auth-field card-detail-field-sm">
                  <label>마감일</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={e => setEditDueDate(e.target.value)}
                  />
                </div>
                <div className="auth-field card-detail-field-md">
                  <label>메모</label>
                  <textarea
                    value={editMemo}
                    onChange={e => setEditMemo(e.target.value)}
                    className="card-memo-textarea"
                    placeholder="카드 내용을 입력하세요"
                  />
                </div>
                {members.length > 0 && (
                  <div className="auth-field card-detail-field-md">
                    <label>담당자</label>
                    <div className="assignee-chips">
                      {members.map(m => {
                        const selected = editAssigneeIds.includes(m.userId)
                        return (
                          <label key={m.userId} className={`assignee-chip${selected ? ' selected' : ''}`}>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => setEditAssigneeIds(prev =>
                                prev.includes(m.userId) ? prev.filter(id => id !== m.userId) : [...prev, m.userId]
                              )}
                            />
                            <div className="mini-avatar" style={{ background: avatarColor(m.userId) }}>
                              {m.name[0]}
                            </div>
                            {m.name}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
                <div className="card-detail-edit-actions">
                  <button onClick={() => setIsEditing(false)} className="card-detail-btn-cancel">
                    취소
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !editTitle.trim()}
                    className="card-detail-btn-save"
                  >
                    {saving ? '저장 중...' : '저장'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="card-detail-title-row">
                  <div className="gm-modal-title">{detail.title}</div>
                  <span className="card-status-badge" data-status={detail.status}>
                    {STATUS_LABELS[detail.status]}
                  </span>
                  <button onClick={startEdit} className="card-detail-edit-btn">
                    수정
                  </button>
                </div>

                {detail.dueDate && (
                  <div className="card-detail-due-date">
                    마감일: {formatDate(detail.dueDate)}
                  </div>
                )}

                {detail.memo && (
                  <div className="card-detail-memo">{detail.memo}</div>
                )}

                {detail.branches.length > 0 && (
                  <div className="card-detail-section">
                    <div className="detail-section-label">브랜치</div>
                    {detail.branches.map(b => (
                      <div key={b.branchName} className="card-detail-branch-row">
                        <div className="card-detail-branch-inner">
                          <BranchIcon />
                          {b.branchName}
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              await removeBranchApi(projectId, detail.id, b.branchName)
                              setDetail(prev => prev ? { ...prev, branches: prev.branches.filter(x => x.branchName !== b.branchName) } : null)
                            } catch {}
                          }}
                          className="card-detail-branch-remove"
                          title="브랜치 연결 해제"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {detail.assignees.length > 0 && (
                  <div className="card-detail-section">
                    <div className="detail-section-label">담당자</div>
                    <div className="card-detail-assignees">
                      {detail.assignees.map(a => (
                        <div key={a.userId} className="card-detail-assignee">
                          <div className="mini-avatar" style={{ background: avatarColor(a.userId) }}>{a.name[0]}</div>
                          {a.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detail.commitLogs.length > 0 && (
                  <div className="card-detail-section">
                    <div className="detail-section-label">커밋 ({detail.commitLogs.length})</div>
                    <div className="card-detail-commit-list">
                      {detail.commitLogs.map(c => (
                        <div key={c.commitSha} className="card-detail-commit-row">
                          <span className="commit-sha">{c.commitSha.slice(0, 7)}</span>
                          <span className="card-detail-commit-msg">{c.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detail.branches.length > 0 && (
                  <div className="card-detail-section">
                    <div className="detail-section-label">Pull Requests</div>
                    {pullsLoading ? (
                      <div className="card-pr-empty">조회 중...</div>
                    ) : pulls.length === 0 ? (
                      <div className="card-pr-empty">연결된 PR이 없습니다.</div>
                    ) : (
                      <div className="card-pr-list">
                        {pulls.map(pr => (
                          <div key={pr.number} className="card-pr-item">
                            <div className="card-pr-header">
                              <span className={`card-pr-badge card-pr-badge--${pr.state.toLowerCase()}`}>
                                {pr.state}
                              </span>
                              <button
                                className="card-pr-title"
                                onClick={() => navigate(`/projects/${pid}/pulls?pr=${pr.number}`)}
                              >
                                #{pr.number} {pr.title}
                              </button>
                            </div>
                            <div className="card-pr-meta">
                              <span className="card-pr-branch">{pr.branchName}</span>
                              <span className="card-pr-author">by {pr.author}</span>
                            </div>
                            {pr.reviewers.length > 0 && (
                              <div className="card-pr-reviewers">
                                {pr.reviewers.map(r => (
                                  <span
                                    key={r.login}
                                    className={`card-pr-reviewer card-pr-reviewer--${r.state.toLowerCase()}`}
                                    title={r.state}
                                  >
                                    {r.login}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="card-detail-section-sm">
                  <div className="detail-section-label">댓글 {comments.length > 0 ? `(${comments.length})` : ''}</div>
                  {comments.length > 0 && (
                    <div className="card-detail-comment-list">
                      {comments.map(c => (
                        <div key={c.id} className="card-detail-comment-row">
                          <div className="mini-avatar" style={{ background: avatarColor(c.userId) }}>{c.userName[0]}</div>
                          <div className="card-detail-comment-body">
                            <div className="card-detail-comment-meta">
                              <span className="card-detail-comment-author">{c.userName}</span>
                              {' '}
                              <span className="card-detail-comment-time">{formatDateTime(c.createdAt)}</span>
                            </div>
                            <div className="card-detail-comment-content">{c.content}</div>
                          </div>
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="card-detail-comment-delete"
                            title="삭제"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <form onSubmit={handleAddComment} className="card-detail-comment-form">
                    <input
                      type="text"
                      placeholder="댓글 추가..."
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      className="card-detail-comment-input"
                    />
                    <button
                      type="submit"
                      disabled={submitting || !newComment.trim()}
                      className="card-detail-comment-submit"
                    >
                      전송
                    </button>
                  </form>
                </div>

                <div className="card-detail-delete-row">
                  {confirmDelete ? (
                    <div className="delete-confirm-row">
                      <span>정말 삭제하시겠습니까?</span>
                      <button onClick={handleDeleteCard} className="danger-inline-btn">삭제</button>
                      <button onClick={() => setConfirmDelete(false)} className="cancel-inline-btn">취소</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(true)} className="danger-inline-btn">카드 삭제</button>
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="card-detail-msg">카드를 불러올 수 없습니다.</div>
        )}
      </div>
    </div>
  )
}

export default function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const pid = Number(projectId)
  const navigate = useNavigate()

  const [boardData, setBoardData] = useState<BoardData>({ backlog: [], inProgress: [], done: [] })
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedCard, setSelectedCard] = useState<CardSummary | null>(null)
  const [activeCard, setActiveCard] = useState<CardSummary | null>(null)
  const [prRefreshKey, setPrRefreshKey] = useState(0)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  useEffect(() => {
    loadBoard()
  }, [pid])

  const handleWsMessage = useCallback((msg: BoardSocketMessage) => {
    if (msg.type === 'PR_REVIEW_UPDATED') {
      setSelectedCard(prev => {
        if (prev && prev.id === msg.cardId) setPrRefreshKey(k => k + 1)
        return prev
      })
      return
    }

    if (msg.type === 'CARD_DELETED') {
      setBoardData(prev => ({
        backlog: prev.backlog.filter(c => c.id !== msg.cardId),
        inProgress: prev.inProgress.filter(c => c.id !== msg.cardId),
        done: prev.done.filter(c => c.id !== msg.cardId),
      }))
      return
    }

    if (msg.type === 'COMMENT_COUNT_CHANGED' && msg.commentCount !== undefined) {
      setBoardData(prev => {
        const apply = (cards: CardSummary[]) =>
          cards.map(c => c.id === msg.cardId ? { ...c, commentCount: msg.commentCount! } : c)
        return { backlog: apply(prev.backlog), inProgress: apply(prev.inProgress), done: apply(prev.done) }
      })
      return
    }

    if (!msg.card) return

    const incoming = msg.card as CardSummary
    const col = statusKey(incoming.status as CardStatus)

    setBoardData(prev => {
      const existingInCol = prev[col].find(c => c.id === incoming.id)
      if (existingInCol) {
        return {
          ...prev,
          [col]: prev[col].map(c => c.id === incoming.id ? incoming : c),
        }
      }
      const filtered = {
        backlog: prev.backlog.filter(c => c.id !== incoming.id),
        inProgress: prev.inProgress.filter(c => c.id !== incoming.id),
        done: prev.done.filter(c => c.id !== incoming.id),
      }
      return { ...filtered, [col]: [...filtered[col], incoming] }
    })
  }, [])

  useBoardSocket(pid, handleWsMessage)

  function loadBoard() {
    setLoading(true)
    getBoardApi(pid)
      .then(res => setBoardData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  function handleDragStart(event: DragStartEvent) {
    const { cardId, status } = event.active.data.current as { cardId: number; status: CardStatus }
    const key = statusKey(status)
    const card = boardData[key].find(c => c.id === cardId) ?? null
    setActiveCard(card)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null)
    const { active, over } = event
    if (!over) return

    const cardId = (active.data.current as { cardId: number; status: CardStatus }).cardId
    const fromStatus = (active.data.current as { cardId: number; status: CardStatus }).status
    const toStatus = over.id as CardStatus

    if (fromStatus === toStatus) return

    const fromKey = statusKey(fromStatus)
    const toKey = statusKey(toStatus)
    const card = boardData[fromKey].find(c => c.id === cardId)
    if (!card) return

    // Optimistic update
    setBoardData(prev => ({
      ...prev,
      [fromKey]: prev[fromKey].filter(c => c.id !== cardId),
      [toKey]: [...prev[toKey], { ...card, status: toStatus }],
    }))

    try {
      await updateCardStatusApi(pid, cardId, toStatus)
    } catch {
      loadBoard()
    }
  }

  async function handleCreate(
    title: string,
    dueDate: string,
    memo: string,
    assigneeIds: number[],
    branches: { branchName: string; repoName: string }[]
  ) {
    const body: { title: string; dueDate?: string; memo?: string; assigneeIds?: number[] } = { title }
    if (dueDate) body.dueDate = dueDate
    if (memo.trim()) body.memo = memo.trim()
    if (assigneeIds.length > 0) body.assigneeIds = assigneeIds
    const res = await createCardApi(pid, body)
    const cardId = res.data.data.id
    if (branches.length > 0) {
      await Promise.all(branches.map(b => addBranchApi(pid, cardId, b)))
    }
    loadBoard()
  }

  function handleCardDeleted(cardId: number) {
    setBoardData(prev => ({
      backlog: prev.backlog.filter(c => c.id !== cardId),
      inProgress: prev.inProgress.filter(c => c.id !== cardId),
      done: prev.done.filter(c => c.id !== cardId),
    }))
  }

  function handleCardUpdated(cardId: number, patch: { title?: string; dueDate?: string | null; commentCount?: number; assignees?: Assignee[] }) {
    const apply = (cards: CardSummary[]) =>
      cards.map(c => c.id === cardId ? { ...c, ...patch } : c)
    setBoardData(prev => ({
      backlog: apply(prev.backlog),
      inProgress: apply(prev.inProgress),
      done: apply(prev.done),
    }))
  }

  if (loading) {
    return (
      <div className="board-page-wrap board-loading-wrap">
        <span className="board-loading-msg">로딩 중...</span>
      </div>
    )
  }

  return (
    <div className="board-page-wrap">
      <div className="board-toolbar">
        <button className="topbar-btn accent" onClick={() => setShowCreate(true)}>
          <PlusIcon />
          카드 추가
        </button>
      </div>

      <div className="board-cols-wrap">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="board-cols">
            <DroppableColumn
              status="BACKLOG"
              title="Backlog"
              badgeClass="badge-backlog"
              cards={boardData.backlog}
              onAddCard={() => setShowCreate(true)}
              onCardClick={setSelectedCard}
            />
            <DroppableColumn
              status="IN_PROGRESS"
              title="In Progress"
              badgeClass="badge-progress"
              cards={boardData.inProgress}
              onAddCard={() => setShowCreate(true)}
              onCardClick={setSelectedCard}
            />
            <DroppableColumn
              status="DONE"
              title="Done"
              badgeClass="badge-done"
              cards={boardData.done}
              onAddCard={() => setShowCreate(true)}
              onCardClick={setSelectedCard}
            />
          </div>
          <DragOverlay>
            {activeCard && (
              <div className={`kanban-card${activeCard.status === 'DONE' ? ' done-card' : ''} dragging-overlay`}>
                <div className="card-header">
                  <div className="card-title-text">{activeCard.title}</div>
                </div>
                {activeCard.dueDate && (
                  <div className="card-date">마감일: {formatDate(activeCard.dueDate)}</div>
                )}
                <div className="card-footer">
                  <div className="card-assignees">
                    {activeCard.assignees.slice(0, 3).map(a => (
                      <div key={a.userId} className="mini-avatar" style={{ background: avatarColor(a.userId) }} title={a.name}>
                        {a.name[0]}
                      </div>
                    ))}
                  </div>
                  <div className="card-footer-meta">
                    {activeCard.commentCount > 0 && (
                      <span className="card-comment-count">
                        <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0113.25 12H9.06l-2.573 2.573A1.458 1.458 0 014 13.543V12H2.75A1.75 1.75 0 011 10.25v-7.5z" />
                        </svg>
                        {activeCard.commentCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {showCreate && (
        <CreateCardModal
          projectId={pid}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}

      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          projectId={pid}
          prRefreshKey={prRefreshKey}
          onClose={() => setSelectedCard(null)}
          onDeleted={handleCardDeleted}
          onUpdated={handleCardUpdated}
        />
      )}
    </div>
  )
}