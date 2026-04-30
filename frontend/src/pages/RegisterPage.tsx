import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerApi } from '@/api/auth'

const GithubIcon = () => (
  <svg viewBox="0 0 16 16">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
)

export default function RegisterPage() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [loginId, setLoginId] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await registerApi({ name, loginId, email, password })
      navigate(`/verify?email=${encodeURIComponent(email)}`)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } }
      const msg = axiosErr.response?.data?.error?.message
      if (!axiosErr.response) {
        setError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.')
      } else {
        setError(msg ?? '회원가입에 실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-bg" />
      <div className="auth-grid" />
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <GithubIcon />
          </div>
          <span className="auth-logo-name">GitManager</span>
        </div>

        <div className="auth-title">계정 만들기</div>
        <div className="auth-sub">지금 바로 시작하세요</div>

        <form onSubmit={handleRegister}>
          <div className="auth-field">
            <label>이름</label>
            <input
              type="text"
              placeholder="홍길동"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className="auth-field">
            <label>아이디</label>
            <input
              type="text"
              placeholder="5~20자, 영문·숫자"
              value={loginId}
              onChange={e => setLoginId(e.target.value)}
              required
            />
          </div>
          <div className="auth-field">
            <label>이메일</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="auth-field">
            <label>비밀번호</label>
            <input
              type="password"
              placeholder="8자 이상"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-btn-primary" type="submit" disabled={loading}>
            {loading ? '처리 중...' : '회원가입'}
          </button>
        </form>

        <div className="auth-link">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </div>
      </div>
    </div>
  )
}