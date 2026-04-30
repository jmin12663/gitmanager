import { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate, useLocation, useParams, Link } from 'react-router-dom'
import { useAuth } from '@/store/authStore'
import { getMyProjectsApi, createProjectApi, joinProjectApi } from '@/api/project'
import { getTodosApi } from '@/api/todo'
import { getGithubConfigApi } from '@/api/settings'
import { logoutApi } from '@/api/auth'
import { setAccessToken } from '@/api/client'
import { getTheme, toggleTheme, type Theme } from '@/lib/theme'
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
  <svg viewBox="0 0 16 16" fill="currentColor"><path d="M1 2h4v12H1zM6 2h4v12H6zM11 2h4v12H11z" /></svg>
)

const CalendarIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor">
    <rect x="1" y="3" width="14" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
    <path d="M1 7h14M5 1v4M11 1v4" stroke="currentColor" strokeWidth="1.2" fill="none" />
  </svg>
)

const SettingsIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor">
    <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 01-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 01.872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 012.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 012.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 01.872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 01-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 01-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 110-5.86 2.929 2.929 0 010 5.858z" />
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
  profile: '개인정보 설정',
}

function currentPage(pathname: string): string {
  if (pathname.endsWith('/board')) return 'board'
  if (pathname.endsWith('/dashboard')) return 'dashboard'
  if (pathname.endsWith('/calendar')) return 'calendar'
  if (pathname.endsWith('/settings')) return 'settings'
  if (pathname === '/todo') return 'todo'
  if (pathname === '/profile') return 'profile'
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
  const { user, setUser, isLoading } = useAuth()

  const [projects, setProjects] = useState<Project[]>([])
  const [openProjectIds, setOpenProjectIds] = useState<Set<number>>(new Set())
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [githubConnected, setGithubConnected] = useState<boolean | null>(null)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const [theme, setTheme] = useState<Theme>(getTheme)
  const [undoneTodoCount, setUndoneTodoCount] = useState(0)

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
    getTodosApi()
      .then(res => {
        const todos = res.data.data as { isDone: boolean }[]
        setUndoneTodoCount(todos.filter(t => !t.isDone).length)
      })
      .catch(() => {})
  }, [user, location.pathname])

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

  useEffect(() => {
    if (!currentProjectId) {
      setGithubConnected(null)
      return
    }
    getGithubConfigApi(currentProjectId)
      .then(() => setGithubConnected(true))
      .catch(() => setGithubConnected(false))
  }, [currentProjectId])

  useEffect(() => {
    if (!showProfileMenu) return
    function handleClickOutside(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showProfileMenu])

  function handleThemeToggle() {
    setTheme(toggleTheme())
  }

  async function handleLogout() {
    try {
      await logoutApi()
    } catch {
      // 서버 오류여도 클라이언트 정리는 진행
    }
    setAccessToken(null)
    setUser(null)
    navigate('/login', { replace: true })
  }

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
        </div>

        <div className="sidebar-body">
          {/* 내 할일 */}
          <Link
            to="/todo"
            className={`nav-item${page === 'todo' ? ' active' : ''}`}
          >
            <TodoIcon />
            내 할일
            {undoneTodoCount > 0 && (
              <span className="nav-badge">{undoneTodoCount}</span>
            )}
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

        <div className="sidebar-footer" ref={profileMenuRef}>
          {showProfileMenu && (
            <div className="profile-popover">
              <Link
                to="/profile"
                className="profile-popover-item"
                onClick={() => setShowProfileMenu(false)}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6a5 5 0 0110 0H3z" />
                </svg>
                개인정보 설정
              </Link>
              <div className="profile-popover-divider" />
              <button className="profile-popover-item profile-popover-logout" onClick={handleLogout}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M10 12.5a.5.5 0 01-.5.5h-8a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5h8a.5.5 0 01.5.5v2a.5.5 0 001 0v-2A1.5 1.5 0 009.5 2h-8A1.5 1.5 0 000 3.5v9A1.5 1.5 0 001.5 14h8a1.5 1.5 0 001.5-1.5v-2a.5.5 0 00-1 0v2z" />
                  <path d="M15.854 8.354a.5.5 0 000-.708l-3-3a.5.5 0 00-.708.708L14.293 7.5H5.5a.5.5 0 000 1h8.793l-2.147 2.146a.5.5 0 00.708.708l3-3z" />
                </svg>
                로그아웃
              </button>
            </div>
          )}
          <button
            className="profile-trigger"
            onClick={() => setShowProfileMenu(v => !v)}
          >
            <div className="user-avatar">{userInitial}</div>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">Developer</div>
            </div>
          </button>
          <button
            className="theme-toggle"
            title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
            onClick={handleThemeToggle}
          >
            {theme === 'dark' ? '☀' : '◑'}
          </button>
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
            {page !== 'settings' && githubConnected !== null && (
              githubConnected ? (
                <div className="gh-status">
                  <span className="gh-dot-live" />
                  GitHub 연동됨
                </div>
              ) : (
                <div className="gh-status gh-status-disconnected">
                  <span className="gh-dot-dead" />
                  GitHub 연동 안됨
                </div>
              )
            )}
          </div>
        </div>

        <div className="page-container">
          <div className="gm-page">
            <Outlet context={{ setUndoneTodoCount }} />
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