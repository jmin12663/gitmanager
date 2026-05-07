import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/store/authStore'
import {
  getInviteCodeApi,
  regenerateInviteCodeApi,
  getMembersApi,
  kickMemberApi,
  leaveProjectApi,
  deleteProjectApi,
  getGithubConfigApi,
  getOAuthRedirectUrlApi,
  syncGithubApi,
} from '@/api/settings'
import { getProjectApi, updateProjectApi } from '@/api/project'

const AVATAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6']
const avatarColor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length]

interface Member {
  userId: number
  loginId: string
  name: string
  role: 'OWNER' | 'MEMBER'
  joinedAt: string
}

interface ProjectInfo {
  name: string
  description: string | null
  startDate: string | null
  endDate: string | null
}

interface GithubConfig {
  projectId: number
  repoUrl: string
  repoName: string
}

// ── GitHub OAuth 연동 폼 ──
interface GithubFormProps {
  projectId: number
  existing: GithubConfig | null
  onCancel?: () => void
}

function GithubForm({ projectId, existing, onCancel }: GithubFormProps) {
  const [repoUrl, setRepoUrl] = useState(existing?.repoUrl ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const submittingRef = useRef(false)

  async function handleConnect(e: React.SyntheticEvent) {
    e.preventDefault()
    if (submittingRef.current) return
    if (!repoUrl.trim()) {
      setError('저장소 URL을 입력하세요.')
      return
    }
    submittingRef.current = true
    setLoading(true)
    setError('')
    try {
      const res = await getOAuthRedirectUrlApi(projectId, repoUrl.trim())
      window.location.href = res.data.data
    } catch {
      submittingRef.current = false
      setError('GitHub 연동 요청에 실패했습니다.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleConnect} style={{ marginTop: 16 }}>
      <div className="auth-field">
        <label>저장소 URL</label>
        <input
          type="url"
          placeholder="https://github.com/username/repo"
          value={repoUrl}
          onChange={e => setRepoUrl(e.target.value)}
        />
      </div>
      {error && <div className="auth-error" style={{ textAlign: 'left', marginBottom: 10 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="submit"
          disabled={loading}
          className="topbar-btn accent"
          style={{ fontSize: 13, padding: '8px 16px' }}
        >
          {loading ? '연결 중...' : 'GitHub으로 연동'}
        </button>
        {onCancel && (
          <button type="button" className="topbar-btn" onClick={onCancel} style={{ fontSize: 13, padding: '8px 16px' }}>
            취소
          </button>
        )}
      </div>
    </form>
  )
}

export default function SettingsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const pid = Number(projectId)
  const { user, isLoading: authLoading } = useAuth()

  const [members, setMembers] = useState<Member[]>([])
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [githubConfig, setGithubConfig] = useState<GithubConfig | null>(null)
  const [githubLoaded, setGithubLoaded] = useState(false)
  const [showGithubForm, setShowGithubForm] = useState(false)
  const [githubSuccess, setGithubSuccess] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<'ok' | 'err' | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null)
  const [editingProject, setEditingProject] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [savingProject, setSavingProject] = useState(false)
  const initializedProjectIdRef = useRef<number | null>(null)

  const myRole = members.find(m => m.userId === user?.userId)?.role ?? null
  const isOwner = myRole === 'OWNER'

  useEffect(() => {
    if (searchParams.get('github') === 'connected') {
      setGithubSuccess(true)
      setSearchParams({}, { replace: true })
      setTimeout(() => setGithubSuccess(false), 4000)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (initializedProjectIdRef.current === pid) return

    initializedProjectIdRef.current = pid

    Promise.all([
      getMembersApi(pid),
      getInviteCodeApi(pid),
      getGithubConfigApi(pid),
      getProjectApi(pid),
    ]).then(([membersRes, codeRes, githubRes, projectRes]) => {
      setMembers(membersRes.data.data)
      setInviteCode(codeRes.data.data.inviteCode)
      setGithubConfig(githubRes.data.data)
      setGithubLoaded(true)
      const p = projectRes.data.data
      setProjectInfo({ name: p.name, description: p.description, startDate: p.startDate, endDate: p.endDate })
    }).catch(() => {
      initializedProjectIdRef.current = null
    }).finally(() => setLoading(false))
  }, [authLoading, pid])

  async function handleCopyCode() {
    if (!inviteCode) return
    await navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRegenerate() {
    if (!confirm('초대 코드를 재생성하면 기존 코드는 무효화됩니다. 계속하시겠습니까?')) return
    try {
      const res = await regenerateInviteCodeApi(pid)
      setInviteCode(res.data.data.inviteCode)
    } catch {}
  }

  async function handleKick(targetUserId: number, name: string) {
    if (!confirm(`${name}님을 프로젝트에서 추방하시겠습니까?`)) return
    try {
      await kickMemberApi(pid, targetUserId)
      setMembers(prev => prev.filter(m => m.userId !== targetUserId))
    } catch {}
  }

  async function handleLeave() {
    if (!confirm('프로젝트를 탈퇴하시겠습니까?')) return
    try {
      await leaveProjectApi(pid)
      navigate('/todo')
    } catch {}
  }

  function startEditProject() {
    if (!projectInfo) return
    setEditName(projectInfo.name)
    setEditDescription(projectInfo.description ?? '')
    setEditStartDate(projectInfo.startDate ?? '')
    setEditEndDate(projectInfo.endDate ?? '')
    setEditingProject(true)
  }

  async function handleSaveProject(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!editName.trim()) return
    setSavingProject(true)
    try {
      const body: { name: string; description?: string; startDate?: string; endDate?: string } = { name: editName.trim() }
      if (editDescription.trim()) body.description = editDescription.trim()
      if (editStartDate) body.startDate = editStartDate
      if (editEndDate) body.endDate = editEndDate
      await updateProjectApi(pid, body)
      setProjectInfo({ name: editName.trim(), description: editDescription.trim() || null, startDate: editStartDate || null, endDate: editEndDate || null })
      setEditingProject(false)
    } catch {
    } finally {
      setSavingProject(false)
    }
  }

  async function handleSyncGithub() {
    setSyncing(true)
    setSyncResult(null)
    try {
      await syncGithubApi(pid)
      setSyncResult('ok')
      setTimeout(() => setSyncResult(null), 4000)
    } catch {
      setSyncResult('err')
      setTimeout(() => setSyncResult(null), 4000)
    } finally {
      setSyncing(false)
    }
  }

  async function handleDeleteProject() {
    const name = prompt('프로젝트를 삭제합니다.\n확인을 위해 "삭제"를 입력하세요:')
    if (name !== '삭제') return
    try {
      await deleteProjectApi(pid)
      navigate('/todo')
    } catch {}
  }

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--gm-text3)', fontSize: 14 }}>
        로딩 중...
      </div>
    )
  }

  return (
    <div className="settings-wrap">
      <div className="settings-title">프로젝트 설정</div>
      <div className="settings-sub">프로젝트 구성 및 연동 관리</div>

      {/* ── 프로젝트 정보 ── */}
      {projectInfo && (
        <div className="settings-section">
          <div className="settings-sec-title">프로젝트 정보</div>
          {editingProject ? (
            <form onSubmit={handleSaveProject}>
              <div className="auth-field">
                <label>프로젝트 이름</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="auth-field">
                <label>설명 (선택)</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  placeholder="프로젝트 설명"
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="auth-field" style={{ flex: 1 }}>
                  <label>시작일 (선택)</label>
                  <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} />
                </div>
                <div className="auth-field" style={{ flex: 1 }}>
                  <label>종료일 (선택)</label>
                  <input type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  type="submit"
                  disabled={savingProject || !editName.trim()}
                  className="topbar-btn accent"
                  style={{ fontSize: 13, padding: '8px 16px', opacity: savingProject || !editName.trim() ? 0.5 : 1 }}
                >
                  {savingProject ? '저장 중...' : '저장'}
                </button>
                <button
                  type="button"
                  className="topbar-btn"
                  onClick={() => setEditingProject(false)}
                  style={{ fontSize: 13, padding: '8px 16px' }}
                >
                  취소
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="settings-row">
                <span className="settings-key">이름</span>
                <span className="settings-val">{projectInfo.name}</span>
              </div>
              {projectInfo.description && (
                <div className="settings-row">
                  <span className="settings-key">설명</span>
                  <span className="settings-val">{projectInfo.description}</span>
                </div>
              )}
              <div className="settings-row">
                <span className="settings-key">기간</span>
                <span className="settings-val">
                  {projectInfo.startDate ?? '미설정'} ~ {projectInfo.endDate ?? '미설정'}
                </span>
              </div>
              {isOwner && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end'}}>
                  <button className="inline-btn" onClick={startEditProject}>정보 수정</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── GitHub 연동 ── */}
      <div className="settings-section">
        <div className="settings-sec-title">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          GitHub 연동
        </div>

        {githubSuccess && (
          <div style={{ fontSize: 13, color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '8px 14px', marginBottom: 12 }}>
            GitHub 연동이 완료되었습니다.
          </div>
        )}
        {githubLoaded && githubConfig ? (
          <>
            <div className="settings-row">
              <span className="settings-key">연동 상태</span>
              <span className="status-pill pill-ok">● 연결됨</span>
            </div>
            <div className="settings-row">
              <span className="settings-key">Repositories Name</span>
              <span className="settings-val">{githubConfig.repoName}</span>
            </div>
            <div className="settings-row">
              <span className="settings-key">Repositories URL</span>
              <a
                href={githubConfig.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13, color: 'var(--gm-accent2)', textDecoration: 'none' }}
              >
                {githubConfig.repoUrl}
              </a>
            </div>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {syncResult === 'ok' && (
                <div style={{ fontSize: 13, color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '8px 14px' }}>
                  불러오기 완료되었습니다.
                </div>
              )}
              {syncResult === 'err' && (
                <div style={{ fontSize: 13, color: 'var(--gm-red)', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 14px' }}>
                  불러오기에 실패했습니다. 다시 시도해 주세요.
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  className="inline-btn"
                  onClick={handleSyncGithub}
                  disabled={syncing}
                  style={{ opacity: syncing ? 0.6 : 1 }}
                >
                  {syncing ? '불러오는 중...' : 'GitHub 불러오기'}
                </button>
                {isOwner && !showGithubForm && (
                  <button className="inline-btn" onClick={() => setShowGithubForm(true)}>
                    재연동
                  </button>
                )}
              </div>
              {isOwner && showGithubForm && (
                <GithubForm
                  projectId={pid}
                  existing={githubConfig}
                  onCancel={() => setShowGithubForm(false)}
                />
              )}
            </div>
          </>
        ) : githubLoaded ? (
          <>
            <div className="settings-row">
              <span className="settings-key">연동 상태</span>
              <span className="status-pill pill-err">● 미연결</span>
            </div>
            {isOwner && (
              <GithubForm projectId={pid} existing={null} />
            )}
            {!isOwner && (
              <div style={{ fontSize: 13, color: 'var(--gm-text3)', marginTop: 8 }}>
                GitHub 연동은 OWNER만 설정할 수 있습니다.
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* ── 팀 초대 ── */}
      <div className="settings-section">
        <div className="settings-sec-title">팀원 초대</div>
        <div className="settings-row">
          <span className="settings-key">초대 코드</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {inviteCode ? (
              <span className="code-display">{inviteCode}</span>
            ) : (
              <span style={{ fontSize: 13, color: 'var(--gm-text3)' }}>-</span>
            )}
            <button className={`inline-btn${copied ? ' accent-btn' : ''}`} onClick={handleCopyCode}>
              {copied ? '복사됨!' : '복사'}
            </button>
            {isOwner && (
              <button className="inline-btn" onClick={handleRegenerate}>재생성</button>
            )}
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--gm-text3)', marginTop: 6 }}>
          이 코드를 팀원에게 공유하면 프로젝트에 참여할 수 있습니다.
        </div>
      </div>

      {/* ── 멤버 관리 ── */}
      <div className="settings-section">
        <div className="settings-sec-title">멤버 관리</div>
        <div className="member-list">
          {[...members].sort((a, b) => (a.role === 'OWNER' ? -1 : b.role === 'OWNER' ? 1 : 0)).map(m => (
            <div key={m.userId} className="member-row-s">
              <div className="m-avatar" style={{ background: m.role === 'OWNER' ? 'linear-gradient(135deg,#6366f1,#a78bfa)' : avatarColor(m.userId) }}>
                {m.name[0]}
              </div>
              <div className="m-name">{m.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                <span className="m-role" style={{ fontSize: 12, color: m.role === 'OWNER' ? 'var(--gm-accent2)' : 'var(--gm-text2)' }}>
                  {m.role}
                </span>
                {isOwner && m.role !== 'OWNER' && m.userId !== user?.userId && (
                  <button className="inline-btn" style={{ fontSize: 11 }} onClick={() => handleKick(m.userId, m.name)}>
                    추방
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {!isOwner && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--gm-border)' }}>
            <button className="inline-btn" onClick={handleLeave} style={{ color: 'var(--gm-red)', borderColor: 'rgba(239,68,68,0.3)' }}>
              프로젝트 탈퇴
            </button>
          </div>
        )}
      </div>

      {/* ── 위험 구역 (OWNER only) ── */}
      {isOwner && (
        <div className="settings-section" style={{ borderColor: 'rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.04)' }}>
          <div className="settings-row">
            <div>
              <div style={{ fontSize: 13, color: 'var(--gm-text1)' }}>프로젝트 삭제</div>
              <div style={{ fontSize: 12, color: 'var(--gm-text3)', marginTop: 2 }}>삭제 후 복구할 수 없습니다. 모든 카드, 일정, 댓글이 함께 삭제됩니다.</div>
            </div>
            <button className="danger-inline-btn" onClick={handleDeleteProject}>
              프로젝트 삭제
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
