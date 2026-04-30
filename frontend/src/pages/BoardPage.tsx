import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import type { CardSummary, CardStatus, CardDetail, Comment, BoardData } from '@/types/board'
import {
  getBoardApi,
  createCardApi,
  updateCardStatusApi,
  getCardApi,
  getCommentsApi,
  createCommentApi,
  deleteCommentApi,
  deleteCardApi,
} from '@/api/board'

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

  const style: React.CSSProperties = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 999 : 1,
        position: 'relative',
      }
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
        {card.dueDate && <span className="card-date">{formatDate(card.dueDate)}</span>}
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
  onClose: () => void
  onCreate: (title: string, dueDate: string, memo: string) => Promise<void>
}

function CreateCardModal({ onClose, onCreate }: CreateCardModalProps) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [memo, setMemo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('제목을 입력하세요.'); return }
    setLoading(true)
    try {
      await onCreate(title.trim(), dueDate, memo)
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
            <label>제목</label>
            <input
              type="text"
              placeholder="카드 제목을 입력하세요"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="auth-field">
            <label>마감일 (선택)</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div className="auth-field">
            <label>메모 (선택)</label>
            <textarea
              placeholder="카드 내용을 입력하세요"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              className="card-memo-textarea"
            />
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
}

function CardDetailModal({ card, projectId, onClose, onDeleted }: CardDetailModalProps) {
  const [detail, setDetail] = useState<CardDetail | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

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

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await createCommentApi(projectId, card.id, newComment.trim())
      setComments(prev => [...prev, res.data.data])
      setNewComment('')
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteComment(commentId: number) {
    try {
      await deleteCommentApi(projectId, card.id, commentId)
      setComments(prev => prev.filter(c => c.id !== commentId))
    } catch {}
  }

  async function handleDeleteCard() {
    if (!confirm('카드를 삭제하시겠습니까?')) return
    try {
      await deleteCardApi(projectId, card.id)
      onDeleted(card.id)
      onClose()
    } catch {}
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
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
              <div className="gm-modal-title" style={{ marginBottom: 0, flex: 1 }}>{detail.title}</div>
              <span className="card-status-badge" data-status={detail.status}>
                {STATUS_LABELS[detail.status]}
              </span>
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
                  <div key={b.branchName} className="card-branch" style={{ marginBottom: 4 }}>
                    <BranchIcon />
                    {b.branchName}
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
              <button onClick={handleDeleteCard} className="danger-inline-btn">카드 삭제</button>
            </div>
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

  async function handleDragEnd(event: DragEndEvent) {
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

  async function handleCreate(title: string, dueDate: string, memo: string) {
    const body: { title: string; dueDate?: string; memo?: string } = { title }
    if (dueDate) body.dueDate = dueDate
    if (memo.trim()) body.memo = memo.trim()
    await createCardApi(pid, body)
    loadBoard()
  }

  function handleCardDeleted(cardId: number) {
    setBoardData(prev => ({
      backlog: prev.backlog.filter(c => c.id !== cardId),
      inProgress: prev.inProgress.filter(c => c.id !== cardId),
      done: prev.done.filter(c => c.id !== cardId),
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
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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
        </DndContext>
      </div>

      {showCreate && (
        <CreateCardModal
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
        />
      )}
    </div>
  )
}