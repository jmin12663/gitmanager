import { useState, useEffect } from 'react'
import { getMeApi, updateProfileApi, checkLoginIdApi, updateLoginIdApi, changePasswordApi } from '@/api/auth'
import { useAuth } from '@/store/authStore'

interface UserInfo {
  userId: number
  loginId: string
  name: string
  email: string
}

export default function ProfilePage() {
  const { setUser } = useAuth()
  const [info, setInfo] = useState<UserInfo | null>(null)
  const [loadError, setLoadError] = useState('')

  // 이름 수정
  const [name, setName] = useState('')
  const [nameLoading, setNameLoading] = useState(false)
  const [nameMsg, setNameMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // 아이디 수정
  const [loginId, setLoginId] = useState('')
  const [loginIdChecked, setLoginIdChecked] = useState(false)
  const [loginIdCheckLoading, setLoginIdCheckLoading] = useState(false)
  const [loginIdSaveLoading, setLoginIdSaveLoading] = useState(false)
  const [loginIdMsg, setLoginIdMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // 비밀번호 변경
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    getMeApi()
      .then(res => {
        const data: UserInfo = res.data.data
        setInfo(data)
        setName(data.name)
        setLoginId(data.loginId)
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

  async function handleLoginIdCheck() {
    const trimmed = loginId.trim()
    if (!trimmed) { setLoginIdMsg({ type: 'err', text: '아이디를 입력하세요.' }); return }
    if (trimmed === info!.loginId) { setLoginIdMsg({ type: 'err', text: '현재 아이디와 동일합니다.' }); return }
    setLoginIdCheckLoading(true)
    setLoginIdMsg(null)
    try {
      await checkLoginIdApi(trimmed)
      setLoginIdChecked(true)
      setLoginIdMsg({ type: 'ok', text: '사용 가능한 아이디입니다.' })
    } catch {
      setLoginIdChecked(false)
      setLoginIdMsg({ type: 'err', text: '이미 사용 중인 아이디입니다.' })
    } finally {
      setLoginIdCheckLoading(false)
    }
  }

  async function handleLoginIdSave(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!loginIdChecked) { setLoginIdMsg({ type: 'err', text: '중복 확인을 먼저 해주세요.' }); return }
    setLoginIdSaveLoading(true)
    setLoginIdMsg(null)
    try {
      const res = await updateLoginIdApi(loginId.trim())
      const updated: UserInfo = res.data.data
      setInfo(updated)
      setUser(updated)
      setLoginIdChecked(false)
      setLoginIdMsg({ type: 'ok', text: '아이디가 변경되었습니다.' })
    } catch {
      setLoginIdMsg({ type: 'err', text: '아이디 변경에 실패했습니다.' })
    } finally {
      setLoginIdSaveLoading(false)
    }
  }

  async function handlePasswordChange(e: React.SyntheticEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'err', text: '새 비밀번호가 일치하지 않습니다.' })
      return
    }
    if (newPassword.length < 8) {
      setPwMsg({ type: 'err', text: '새 비밀번호는 8자 이상이어야 합니다.' })
      return
    }
    setPwLoading(true)
    setPwMsg(null)
    try {
      await changePasswordApi(currentPassword, newPassword)
      setPwMsg({ type: 'ok', text: '비밀번호가 변경되었습니다.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      const code = err?.response?.data?.error?.code
      if (code === 'WRONG_PASSWORD') {
        setPwMsg({ type: 'err', text: '현재 비밀번호가 올바르지 않습니다.' })
      } else {
        setPwMsg({ type: 'err', text: '비밀번호 변경에 실패했습니다.' })
      }
    } finally {
      setPwLoading(false)
    }
  }

  if (loadError) {
    return <div className="profile-load-error">{loadError}</div>
  }

  if (!info) {
    return <div className="profile-loading">불러오는 중...</div>
  }

  const initial = info.name?.[0] ?? '?'

  return (
    <div className="profile-page">
      {/* 프로필 헤더 */}
      <div className="profile-header">
        <div className="profile-avatar-lg">{initial}</div>
        <div>
          <div className="profile-header-name">{info.name}</div>
          <div className="profile-header-id">@{info.loginId}</div>
        </div>
      </div>

      {/* 계정 정보 */}
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
        <form onSubmit={handleLoginIdSave}>
          <div className="auth-field">
            <label>아이디</label>
            <div className="profile-input-row">
              <input
                type="text"
                value={loginId}
                onChange={e => { setLoginId(e.target.value); setLoginIdChecked(false); setLoginIdMsg(null) }}
                placeholder="5~20자 영문/숫자"
              />
              <button
                className="auth-btn-secondary"
                type="button"
                onClick={handleLoginIdCheck}
                disabled={loginIdCheckLoading || loginId.trim() === info.loginId}
              >
                {loginIdCheckLoading ? '확인 중...' : '중복 확인'}
              </button>
              <button
                className="auth-btn-secondary"
                type="submit"
                disabled={!loginIdChecked || loginIdSaveLoading}
              >
                {loginIdSaveLoading ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
          {loginIdMsg && (
            <div className={loginIdMsg.type === 'ok' ? 'profile-msg-ok' : 'auth-error'}>
              {loginIdMsg.text}
            </div>
          )}
        </form>
        <div className="auth-field">
          <label>이메일</label>
          <input type="text" value={info.email} readOnly className="profile-readonly" />
        </div>
      </div>

      {/* 비밀번호 변경 */}
      <div className="profile-card">
        <div className="profile-card-title">비밀번호 변경</div>
        <form onSubmit={handlePasswordChange}>
          <div className="auth-field">
            <label>현재 비밀번호</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="현재 비밀번호"
              autoComplete="current-password"
            />
          </div>
          <div className="auth-field">
            <label>새 비밀번호</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="8자 이상"
              autoComplete="new-password"
            />
          </div>
          <div className="auth-field">
            <label>새 비밀번호 확인</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="비밀번호를 다시 입력하세요"
              autoComplete="new-password"
            />
          </div>
          {pwMsg && (
            <div className={pwMsg.type === 'ok' ? 'profile-msg-ok' : 'auth-error'}>
              {pwMsg.text}
            </div>
          )}
          <button className="auth-btn-primary" type="submit" disabled={pwLoading}>
            {pwLoading ? '변경 중...' : '변경하기'}
          </button>
        </form>
      </div>
    </div>
  )
}