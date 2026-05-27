import { useState, useEffect } from 'react'
import { getMeApi, updateProfileApi } from '@/api/auth'
import { useAuth } from '@/store/authStore'

interface UserInfo {
  userId: number
  githubLogin: string
  name: string
  email: string
  avatarUrl: string | null
}

export default function ProfilePage() {
  const { setUser } = useAuth()
  const [info, setInfo] = useState<UserInfo | null>(null)
  const [loadError, setLoadError] = useState('')

  const [name, setName] = useState('')
  const [nameLoading, setNameLoading] = useState(false)
  const [nameMsg, setNameMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    getMeApi()
      .then(res => {
        const data: UserInfo = res.data.data
        setInfo(data)
        setName(data.name)
      })
      .catch(() => setLoadError('사용자 정보를 불러오지 못했습니다.'))
  }, [])

  async function handleNameSave(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!name.trim()) { setNameMsg({ type: 'err', text: '이름을 입력하세요.' }); return }
    setNameLoading(true)
    setNameMsg(null)
    try {
      const res = await updateProfileApi(name.trim())
      const updated: UserInfo = res.data.data
      setInfo(updated)
      setUser(updated)
      setNameMsg({ type: 'ok', text: '이름이 변경되었습니다.' })
    } catch {
      setNameMsg({ type: 'err', text: '이름 변경에 실패했습니다.' })
    } finally {
      setNameLoading(false)
    }
  }

  if (loadError) return <div className="profile-load-error">{loadError}</div>
  if (!info) return <div className="profile-loading">불러오는 중...</div>

  const initial = info.name?.[0] ?? '?'

  return (
    <div className="profile-page">
      <div className="profile-header">
        {info.avatarUrl ? (
          <img src={info.avatarUrl} alt="avatar" className="profile-avatar-lg" style={{ borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div className="profile-avatar-lg">{initial}</div>
        )}
        <div>
          <div className="profile-header-name">{info.name}</div>
          <div className="profile-header-id">@{info.githubLogin}</div>
        </div>
      </div>

      <div className="profile-card">
        <div className="profile-card-title">계정 정보</div>
        <form onSubmit={handleNameSave}>
          <div className="auth-field">
            <label>이름</label>
            <div className="profile-input-row">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="이름을 입력하세요"
              />
              <button className="auth-btn-secondary" type="submit" disabled={nameLoading}>
                {nameLoading ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
          {nameMsg && (
            <div className={nameMsg.type === 'ok' ? 'profile-msg-ok' : 'auth-error'}>
              {nameMsg.text}
            </div>
          )}
        </form>
        <div className="auth-field">
          <label>GitHub 계정</label>
          <input type="text" value={info.githubLogin} readOnly className="profile-readonly" />
        </div>
        <div className="auth-field">
          <label>이메일</label>
          <input type="text" value={info.email} readOnly className="profile-readonly" />
        </div>
      </div>
    </div>
  )
}