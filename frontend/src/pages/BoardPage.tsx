import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
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
  <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 11, height: 11, flexShrink: 0 }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          {card.commentCount > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--gm-text3)' }}>
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
        {cards.length === 0 && (
          <div style={{ flex: 1, minHeight: 60 }} />
        )}
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
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {members.map(m => {
                  const selected = selectedAssigneeIds.includes(m.userId)
                  return (
                    <label
                      key={m.userId}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        cursor: 'pointer', padding: '4px 10px', borderRadius: 20,
                        border: `1px solid ${selected ? 'var(--gm-accent)' : 'var(--gm-border2)'}`,
                        background: selected ? 'var(--gm-accent)' : 'transparent',
                        color: selected ? 'white' : 'var(--gm-text2)',
                        fontSize: 13, transition: 'all 0.15s',
                      }}
                    >
                      <input
                        type="checkbox"
                        style={{ display: 'none' }}
                        checked={selected}
                        onChange={() => toggleAssignee(m.userId)}
                      />
                      <div className="mini-avatar" style={{ background: avatarColor(m.userId), width: 18, height: 18, fontSize: 10 }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 6 }}>
              <input
                type="text"
                placeholder="Repositories (예: gitmanager)"
                value={repoInput}
                onChange={e => setRepoInput(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  placeholder="Branch (예: feature/login)"
                  value={branchInput}
                  onChange={e => setBranchInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddBranch() } }}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleAddBranch}
                  disabled={!branchInput.trim() || !repoInput.trim()}
                  style={{
                    padding: '8px 12px', background: 'var(--gm-bg3)',
                    border: '1px solid var(--gm-border2)', borderRadius: 'var(--gm-radius)',
                    cursor: 'pointer', fontSize: 13, color: 'var(--gm-text2)', whiteSpace: 'nowrap',
                    opacity: !branchInput.trim() || !repoInput.trim() ? 0.4 : 1,
                  }}
                >
                  추가
                </button>
              </div>
            </div>
            {branches.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {branches.map(b => (
                  <div
                    key={b.branchName}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '3px 8px', background: 'var(--gm-bg3)',
                      border: '1px solid var(--gm-border2)', borderRadius: 12,
                      fontSize: 12, color: 'var(--gm-text2)',
                    }}
                  >
                    <BranchIcon />
                    {b.branchName}
                    <button
                      type="button"
                      onClick={() => setBranches(prev => prev.filter(x => x.branchName !== b.branchName))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gm-text3)', padding: 0, marginLeft: 2, lineHeight: 1 }}
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
  onClose: () => void
  onDeleted: (cardId: number) => void
  onUpdated: (cardId: number, patch: { title?: string; dueDate?: string | null; commentCount?: number; assignees?: Assignee[] }) => void
}

function CardDetailModal({ card, projectId, onClose, onDeleted, onUpdated }: CardDetailModalProps) {
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
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gm-text3)' }}>로딩 중...</div>
        ) : detail ? (
          <>
            {isEditing ? (
              <>
                <div className="auth-field" style={{ marginBottom: 12 }}>
                  <label>제목</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="auth-field" style={{ marginBottom: 12 }}>
                  <label>마감일</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={e => setEditDueDate(e.target.value)}
                  />
                </div>
                <div className="auth-field" style={{ marginBottom: 16 }}>
                  <label>메모</label>
                  <textarea
                    value={editMemo}
                    onChange={e => setEditMemo(e.target.value)}
                    className="card-memo-textarea"
                    placeholder="카드 내용을 입력하세요"
                  />
                </div>
                {members.length > 0 && (
                  <div className="auth-field" style={{ marginBottom: 16 }}>
                    <label>담당자</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {members.map(m => {
                        const selected = editAssigneeIds.includes(m.userId)
                        return (
                          <label
                            key={m.userId}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              cursor: 'pointer', padding: '4px 10px', borderRadius: 20,
                              border: `1px solid ${selected ? 'var(--gm-accent)' : 'var(--gm-border2)'}`,
                              background: selected ? 'var(--gm-accent)' : 'transparent',
                              color: selected ? 'white' : 'var(--gm-text2)',
                              fontSize: 13, transition: 'all 0.15s',
                            }}
                          >
                            <input
                              type="checkbox"
                              style={{ display: 'none' }}
                              checked={selected}
                              onChange={() => setEditAssigneeIds(prev =>
                                prev.includes(m.userId) ? prev.filter(id => id !== m.userId) : [...prev, m.userId]
                              )}
                            />
                            <div className="mini-avatar" style={{ background: avatarColor(m.userId), width: 18, height: 18, fontSize: 10 }}>
                              {m.name[0]}
                            </div>
                            {m.name}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 14, borderTop: '1px solid var(--gm-border)' }}>
                  <button
                    onClick={() => setIsEditing(false)}
                    style={{ padding: '8px 16px', background: 'var(--gm-bg3)', border: '1px solid var(--gm-border2)', borderRadius: 'var(--gm-radius)', cursor: 'pointer', fontSize: 13, color: 'var(--gm-text2)' }}
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !editTitle.trim()}
                    style={{ padding: '8px 16px', background: 'var(--gm-accent)', color: 'white', border: 'none', borderRadius: 'var(--gm-radius)', cursor: 'pointer', fontSize: 13, opacity: saving || !editTitle.trim() ? 0.5 : 1 }}
                  >
                    {saving ? '저장 중...' : '저장'}
                  </button>
                </div>
              </>
            ) : (
              <>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
              <div className="gm-modal-title" style={{ marginBottom: 0, flex: 1 }}>{detail.title}</div>
              <span className="card-status-badge" data-status={detail.status}>
                {STATUS_LABELS[detail.status]}
              </span>
              <button
                onClick={startEdit}
                style={{ padding: '4px 10px', background: 'var(--gm-bg3)', border: '1px solid var(--gm-border2)', borderRadius: 'var(--gm-radius)', cursor: 'pointer', fontSize: 12, color: 'var(--gm-text2)', flexShrink: 0 }}
              >
                수정
              </button>
            </div>

            {detail.dueDate && (
              <div style={{ fontSize: 12, color: 'var(--gm-text3)', marginBottom: 12 }}>
                마감일: {formatDate(detail.dueDate)}
              </div>
            )}

            {detail.memo && (
              <div style={{ fontSize: 13, color: 'var(--gm-text2)', background: 'var(--gm-bg3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {detail.memo}
              </div>
            )}

            {detail.branches.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div className="detail-section-label">브랜치</div>
                {detail.branches.map(b => (
                  <div key={b.branchName} className="card-branch" style={{ marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gm-text3)', fontSize: 11, padding: '2px 4px', lineHeight: 1 }}
                      title="브랜치 연결 해제"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {detail.assignees.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div className="detail-section-label">담당자</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {detail.assignees.map(a => (
                    <div key={a.userId} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--gm-text2)' }}>
                      <div className="mini-avatar" style={{ background: avatarColor(a.userId) }}>{a.name[0]}</div>
                      {a.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detail.commitLogs.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div className="detail-section-label">커밋 ({detail.commitLogs.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
                  {detail.commitLogs.map(c => (
                    <div key={c.commitSha} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="commit-sha">{c.commitSha.slice(0, 7)}</span>
                      <span style={{ fontSize: 12, color: 'var(--gm-text2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 8 }}>
              <div className="detail-section-label">댓글 {comments.length > 0 ? `(${comments.length})` : ''}</div>
              {comments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
                  {comments.map(c => (
                    <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <div className="mini-avatar" style={{ background: avatarColor(c.userId), flexShrink: 0 }}>{c.userName[0]}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: 'var(--gm-text2)', marginBottom: 2 }}>
                          <span style={{ fontWeight: 500, color: 'var(--gm-text1)' }}>{c.userName}</span>
                          {' '}
                          <span style={{ color: 'var(--gm-text3)' }}>{formatDateTime(c.createdAt)}</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--gm-text1)', lineHeight: 1.5 }}>{c.content}</div>
                      </div>
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gm-text3)', fontSize: 12, padding: '2px 4px', borderRadius: 4, flexShrink: 0, lineHeight: 1 }}
                        title="삭제"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <form onSubmit={handleAddComment} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="댓글 추가..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', background: 'var(--gm-bg3)', border: '1px solid var(--gm-border2)', borderRadius: 'var(--gm-radius)', color: 'var(--gm-text1)', fontSize: 13, fontFamily: 'Geist Variable, sans-serif', outline: 'none' }}
                />
                <button
                  type="submit"
                  disabled={submitting || !newComment.trim()}
                  style={{ padding: '8px 14px', background: 'var(--gm-accent)', color: 'white', border: 'none', borderRadius: 'var(--gm-radius)', cursor: 'pointer', fontSize: 12, fontFamily: 'Geist Variable, sans-serif', opacity: submitting || !newComment.trim() ? 0.5 : 1 }}
                >
                  전송
                </button>
              </form>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 14, borderTop: '1px solid var(--gm-border)', marginTop: 8 }}>
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
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gm-text3)' }}>카드를 불러올 수 없습니다.</div>
        )}
      </div>
    </div>
  )
}

export default function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const pid = Number(projectId)

  const [boardData, setBoardData] = useState<BoardData>({ backlog: [], inProgress: [], done: [] })
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedCard, setSelectedCard] = useState<CardSummary | null>(null)
  const [activeCard, setActiveCard] = useState<CardSummary | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  useEffect(() => {
    loadBoard()
  }, [pid])

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
      <div className="board-page-wrap" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--gm-text3)', fontSize: 14 }}>로딩 중...</span>
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
              <div className={`kanban-card${activeCard.status === 'DONE' ? ' done-card' : ''}`} style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.35)', opacity: 0.95 }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                    {activeCard.commentCount > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--gm-text3)' }}>
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
          onClose={() => setSelectedCard(null)}
          onDeleted={handleCardDeleted}
          onUpdated={handleCardUpdated}
        />
      )}
    </div>
  )
}