import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation, useParams, Link } from 'react-router-dom'
import { useAuth } from '@/store/authStore'
import { getMyProjectsApi, createProjectApi, joinProjectApi } from '@/api/project'
import type { Project } from '@/types/project'

const PROJ_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6']

const GithubIcon = () => (
  <svg viewBox="0 0 16 16">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
)

const TodoIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12v2H2zm0 4h12v2H2zm0 4h7v2H2z" /></svg>
)

const DashboardIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor"><path d="M0 0h7v7H0zm9 0h7v7H9zm0 9h7v7H9zm-9 0h7v7H0z" /></svg>
)

const BoardIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor"><path d="M1 2h4v12H1zm5 0h4v8H6zm5 0h4v5h-4z" /></svg>
)

const CalendarIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor">
    <rect x="1" y="3" width="14" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
    <path d="M1 7h14M5 1v4M11 1v4" stroke="currentColor" strokeWidth="1.2" fill="none" />
  </svg>
)

const SettingsIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 10a2 2 0 100-4 2 2 0 000 4zm5.67-1.86l.89-.51-.75-1.3-.89.51a4.07 4.07 0 00-.69-.4l-.11-1.02h-1.5l-.11 1.02a4.07 4.07 0 00-.69.4l-.89-.51-.75 1.3.89.51a4 4 0 000 .72l-.89.51.75 1.3.89-.51c.21.16.44.29.69.4l.11 1.02h1.5l.11-1.02c.25-.11.48-.24.69-.4l.89.51.75-1.3-.89-.51a4 4 0 000-.72z" />
  </svg>
)

const BellIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 16a2 2 0 001.985-1.75c.017-.137-.097-.25-.235-.25h-3.5c-.138 0-.252.113-.235.25A2 2 0 008 16zm.25-14.25a.75.75 0 00-1.5 0v.635a5.5 5.5 0 00-4.75 5.365V9.5l-1.5 2v.5h11v-.5l-1.5-2V7.75A5.5 5.5 0 008.25 2.385V1.75z" />
  </svg>
)

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
  </svg>
)

const PAGE_LABELS: Record<string, string> = {
  board: 'Board',
  dashboard: '대시보드',
  calendar: '캘린더',
  settings: '설정',
}

function currentPage(pathname: string): string {
  if (pathname.endsWith('/board')) return 'board'
  if (pathname.endsWith('/dashboard')) return 'dashboard'
  if (pathname.endsWith('/calendar')) return 'calendar'
  if (pathname.endsWith('/settings')) return 'settings'
  if (pathname === '/todo') return 'todo'
  return ''
}

interface CreateModalProps {
  onClose: () => void
  onCreated: (p: Project) => void
}

function CreateProjectModal({ onClose, onCreated }: CreateModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('프로젝트 이름을 입력하세요.'); return }
    setLoading(true)
    try {
      const res = await createProjectApi({ name: name.trim(), description: description.trim() || undefined })
      onCreated(res.data.data)
      onClose()
    } catch {
      setError('프로젝트 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="gm-modal-overlay" onClick={onClose}>
      <div className="gm-modal" onClick={e => e.stopPropagation()}>
        <button className="gm-modal-close" onClick={onClose}>×</button>
        <div className="gm-modal-title">새 프로젝트 만들기</div>
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>프로젝트 이름</label>
            <input
              type="text"
              placeholder="my-awesome-project"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="auth-field">
            <label>설명 (선택)</label>
            <input
              type="text"
              placeholder="프로젝트 간단 설명"
              value={description}
              onChange={e => setDescription(e.target.value)}
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

interface JoinModalProps {
  onClose: () => void
  onJoined: (p: Project) => void
}

function JoinProjectModal({ onClose, onJoined }: JoinModalProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (code.trim().length !== 6) { setError('6자리 초대 코드를 입력하세요.'); return }
    setLoading(true)
    try {
      const res = await joinProjectApi(code.trim().toUpperCase())
      onJoined(res.data.data)
      onClose()
    } catch {
      setError('유효하지 않은 초대 코드입니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="gm-modal-overlay" onClick={onClose}>
      <div className="gm-modal" onClick={e => e.stopPropagation()}>
        <button className="gm-modal-close" onClick={onClose}>×</button>
        <div className="gm-modal-title">프로젝트 참여</div>
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>초대 코드</label>
            <input
              type="text"
              placeholder="A4X9KR"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              autoFocus
              style={{ letterSpacing: '0.2em', fontFamily: 'monospace', fontSize: 18, fontWeight: 600 }}
            />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button className="auth-btn-primary" type="submit" disabled={loading}>
            {loading ? '참여 중...' : '참여하기'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { projectId } = useParams<{ projectId?: string }>()
  const { user, isLoading } = useAuth()

  const [projects, setProjects] = useState<Project[]>([])
  const [openProjectIds, setOpenProjectIds] = useState<Set<number>>(new Set())
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)

  const page = currentPage(location.pathname)
  const currentProjectId = projectId ? Number(projectId) : null
  const currentProject = projects.find(p => p.id === currentProjectId) ?? null

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login', { replace: true })
    }
  }, [isLoading, user, navigate])

  useEffect(() => {
    if (!user) return
    getMyProjectsApi()
      .then(res => {
        const list: Project[] = res.data.data
        setProjects(list)
        if (currentProjectId) {
          setOpenProjectIds(new Set([currentProjectId]))
        } else if (list.length > 0) {
          setOpenProjectIds(new Set([list[0].id]))
        }
      })
      .catch(() => {})
  }, [user, currentProjectId])

  function toggleProject(id: number) {
    setOpenProjectIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleCreated(p: Project) {
    setProjects(prev => [...prev, p])
    setOpenProjectIds(prev => new Set([...prev, p.id]))
    navigate(`/projects/${p.id}/dashboard`)
  }

  function handleJoined(p: Project) {
    setProjects(prev => {
      if (prev.find(x => x.id === p.id)) return prev
      return [...prev, p]
    })
    setOpenProjectIds(prev => new Set([...prev, p.id]))
    navigate(`/projects/${p.id}/dashboard`)
  }

  if (isLoading) return null

  const userInitial = user?.name?.[0] ?? '?'

  function breadcrumb() {
    if (page === 'todo') return { proj: null, cur: '내 할일' }
    if (currentProject) return { proj: currentProject.name, cur: PAGE_LABELS[page] ?? page }
    return { proj: null, cur: PAGE_LABELS[page] ?? page }
  }

  const bc = breadcrumb()

  return (
    <div className="app-wrap">
      {/* ── Sidebar ── */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="logo-mark">
            <GithubIcon />
          </div>
          <span className="logo-text">GitManager</span>
          <button className="notif-btn">
            <div className="notif-dot" />
            <BellIcon />
          </button>
        </div>

        <div className="sidebar-body">
          {/* 내 할일 */}
          <Link
            to="/todo"
            className={`nav-item${page === 'todo' ? ' active' : ''}`}
          >
            <TodoIcon />
            내 할일
          </Link>

          <div className="nav-section-label">프로젝트</div>

          {projects.map((proj, idx) => {
            const color = PROJ_COLORS[idx % PROJ_COLORS.length]
            const isOpen = openProjectIds.has(proj.id)
            const isCurrentProj = proj.id === currentProjectId

            return (
              <div key={proj.id} className="project-item">
                <button
                  className={`project-head${isOpen ? ' open' : ''}`}
                  onClick={() => toggleProject(proj.id)}
                >
                  <span className="proj-dot" style={{ background: color }} />
                  {proj.name}
                  <span className="chevron">▶</span>
                </button>

                <div className={`sub-nav${isOpen ? '' : ' collapsed'}`}>
                  <Link
                    to={`/projects/${proj.id}/dashboard`}
                    className={`sub-item${isCurrentProj && page === 'dashboard' ? ' active' : ''}`}
                  >
                    <DashboardIcon />
                    대시보드
                  </Link>
                  <Link
                    to={`/projects/${proj.id}/board`}
                    className={`sub-item${isCurrentProj && page === 'board' ? ' active' : ''}`}
                  >
                    <BoardIcon />
                    Board
                  </Link>
                  <Link
                    to={`/projects/${proj.id}/calendar`}
                    className={`sub-item${isCurrentProj && page === 'calendar' ? ' active' : ''}`}
                  >
                    <CalendarIcon />
                    캘린더
                  </Link>
                  {proj.myRole === 'OWNER' && (
                    <Link
                      to={`/projects/${proj.id}/settings`}
                      className={`sub-item${isCurrentProj && page === 'settings' ? ' active' : ''}`}
                    >
                      <SettingsIcon />
                      설정
                    </Link>
                  )}
                </div>
              </div>
            )
          })}

          <button className="new-project-btn" onClick={() => setShowCreate(true)}>
            <PlusIcon />
            새 프로젝트 만들기
          </button>
          <button className="new-project-btn" onClick={() => setShowJoin(true)}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H1zm5-6a3 3 0 100-6 3 3 0 000 6zm6.5-3a.5.5 0 01.5.5V7h1.5a.5.5 0 010 1H13v1.5a.5.5 0 01-1 0V8h-1.5a.5.5 0 010-1H12V5.5a.5.5 0 01.5-.5z" />
            </svg>
            초대 코드로 참여
          </button>
        </div>

        <div className="sidebar-footer">
          <div className="user-avatar">{userInitial}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">Developer</div>
          </div>
          <button className="theme-toggle" title="테마 전환">◐</button>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="main-area">
        <div className="topbar">
          <div className="topbar-left">
            <div className="breadcrumb">
              {bc.proj && (
                <>
                  <span className="breadcrumb-proj">{bc.proj}</span>
                  <span className="breadcrumb-sep">/</span>
                </>
              )}
              <span className="breadcrumb-cur">{bc.cur}</span>
            </div>
          </div>
          <div className="topbar-right">
            {page !== 'settings' && (
              <div className="gh-status">
                <span className="gh-dot-live" />
                GitHub 연동됨
              </div>
            )}
          </div>
        </div>

        <div className="page-container">
          <div className="gm-page">
            <Outlet />
          </div>
        </div>
      </div>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
      {showJoin && (
        <JoinProjectModal
          onClose={() => setShowJoin(false)}
          onJoined={handleJoined}
        />
      )}
    </div>
  )
}