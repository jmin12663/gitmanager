import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/store/authStore'
import {
  getInviteCodeApi,
  regenerateInviteCodeApi,
  getMembersApi,
  kickMemberApi,
  leaveProjectApi,
  deleteProjectApi,
  getGithubConfigApi,
  registerGithubConfigApi,
} from '@/api/settings'

const AVATAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6']
const avatarColor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length]

interface Member {
  userId: number
  loginId: string
  name: string
  role: 'OWNER' | 'MEMBER'
  joinedAt: string
}

interface GithubConfig {
  projectId: number
  repoUrl: string
  repoName: string
}

// ── GitHub 등록 / 재설정 폼 ──
interface GithubFormProps {
  projectId: number
  existing: GithubConfig | null
  onSuccess: (cfg: GithubConfig) => void
  onCancel?: () => void
}

function GithubForm({ projectId, existing, onSuccess, onCancel }: GithubFormProps) {
  const [repoUrl, setRepoUrl] = useState(existing?.repoUrl ?? '')
  const [repoName, setRepoName] = useState(existing?.repoName ?? '')
  const [pat, setPat] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!repoUrl.trim() || !repoName.trim() || !pat.trim() || !webhookSecret.trim()) {
      setError('모든 필드를 입력하세요.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await registerGithubConfigApi(projectId, {
        repoUrl: repoUrl.trim(),
        repoName: repoName.trim(),
        pat: pat.trim(),
        webhookSecret: webhookSecret.trim(),
      })
      onSuccess(res.data.data)
    } catch {
      setError('GitHub 연동에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
      <div className="auth-field">
        <label>저장소 URL</label>
        <input
          type="url"
          placeholder="https://github.com/username/repo"
          value={repoUrl}
          onChange={e => setRepoUrl(e.target.value)}
        />
      </div>
      <div className="auth-field">
        <label>저장소 이름 (Webhook 매핑용)</label>
        <input
          type="text"
          placeholder="repo-name"
          value={repoName}
          onChange={e => setRepoName(e.target.value)}
        />
      </div>
      <div className="auth-field">
        <label>Personal Access Token (PAT)</label>
        <input
          type="password"
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          value={pat}
          onChange={e => setPat(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <div className="auth-field">
        <label>Webhook Secret</label>
        <input
          type="password"
          placeholder="webhook 서명 검증용 시크릿 키"
          value={webhookSecret}
          onChange={e => setWebhookSecret(e.target.value)}
          autoComplete="new-password"
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
          {loading ? '저장 중...' : (existing ? '업데이트' : '연동하기')}
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
  const pid = Number(projectId)
  const { user } = useAuth()

  const [members, setMembers] = useState<Member[]>([])
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [githubConfig, setGithubConfig] = useState<GithubConfig | null>(null)
  const [githubLoaded, setGithubLoaded] = useState(false)
  const [showGithubForm, setShowGithubForm] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  const myRole = members.find(m => m.userId === user?.userId)?.role ?? null
  const isOwner = myRole === 'OWNER'

  const webhookUrl = `${window.location.protocol}//${window.location.host}/api/webhook/github`

  useEffect(() => {
    Promise.all([
      getMembersApi(pid),
      getInviteCodeApi(pid),
      getGithubConfigApi(pid).catch(() => null),
    ]).then(([membersRes, codeRes, githubRes]) => {
      setMembers(membersRes.data.data)
      setInviteCode(codeRes.data.data.inviteCode)
      if (githubRes) {
        setGithubConfig(githubRes.data.data)
      }
      setGithubLoaded(true)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [pid])

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

  async function handleDeleteProject() {
    const name = prompt('프로젝트를 삭제합니다.\n확인을 위해 "삭제"를 입력하세요:')
    if (name !== '삭제') return
    try {
      await deleteProjectApi(pid)
      navigate('/todo')
    } catch {}
  }

  if (loading) {
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

      {/* ── GitHub 연동 ── */}
      <div className="settings-section">
        <div className="settings-sec-title">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          GitHub 연동
        </div>

        {githubLoaded && githubConfig ? (
          <>
            <div className="settings-row">
              <span className="settings-key">연동 상태</span>
              <span className="status-pill pill-ok">● 연결됨</span>
            </div>
            <div className="settings-row">
              <span className="settings-key">연동 저장소</span>
              <span className="settings-val">{githubConfig.repoName}</span>
            </div>
            <div className="settings-row">
              <span className="settings-key">저장소 URL</span>
              <a
                href={githubConfig.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13, color: 'var(--gm-accent2)', textDecoration: 'none' }}
              >
                {githubConfig.repoUrl}
              </a>
            </div>
            <div className="settings-row">
              <span className="settings-key">Webhook URL</span>
              <div className="webhook-url-box">{webhookUrl}</div>
            </div>
            {isOwner && (
              <div style={{ marginTop: 12 }}>
                {showGithubForm ? (
                  <GithubForm
                    projectId={pid}
                    existing={githubConfig}
                    onSuccess={cfg => { setGithubConfig(cfg); setShowGithubForm(false) }}
                    onCancel={() => setShowGithubForm(false)}
                  />
                ) : (
                  <button className="inline-btn" onClick={() => setShowGithubForm(true)}>
                    Webhook 재설정
                  </button>
                )}
              </div>
            )}
          </>
        ) : githubLoaded ? (
          <>
            <div className="settings-row">
              <span className="settings-key">연동 상태</span>
              <span className="status-pill pill-err">● 미연결</span>
            </div>
            {isOwner && (
              <GithubForm
                projectId={pid}
                existing={null}
                onSuccess={cfg => { setGithubConfig(cfg); setShowGithubForm(false) }}
              />
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
        <div className="settings-sec-title">팀 초대</div>
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
          {members.map(m => (
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
          <div className="settings-sec-title" style={{ color: 'var(--gm-red)' }}>위험 구역</div>
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
