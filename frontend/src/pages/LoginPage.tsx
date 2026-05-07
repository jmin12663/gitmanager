import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/store/authStore'
import { loginApi, getMeApi } from '@/api/auth'
import { setAccessToken } from '@/api/client'

const GithubIcon = () => (
  <svg viewBox="0 0 16 16">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
)

export default function LoginPage() {
  const navigate = useNavigate()
  const { setUser } = useAuth()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.SyntheticEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await loginApi({ identifier, password })
      const body = res.data

      if (!body.success) {
        if (body.error?.code === 'EMAIL_NOT_VERIFIED') {
          navigate(`/verify?email=${encodeURIComponent(body.data?.email ?? identifier)}`)
          return
        }
        setError(body.error?.message ?? '로그인에 실패했습니다.')
        return
      }

      setAccessToken(body.data.accessToken)
      const meRes = await getMeApi()
      setUser(meRes.data.data)
      navigate('/todo')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } }
      const msg = axiosErr.response?.data?.error?.message
      if (!axiosErr.response) {
        setError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.')
      } else {
        setError(msg ?? '로그인에 실패했습니다.')
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

        <div className="auth-title">다시 오셨군요</div>
        <div className="auth-sub">팀과 GitHub를 하나로 연결하세요</div>

        <button className="auth-btn-ghost" disabled>
          <GithubIcon />
          GitHub로 계속하기
        </button>

        <div className="auth-divider">또는 이메일로 로그인</div>

        <form onSubmit={handleLogin}>
          <div className="auth-field">
            <label>이메일 또는 아이디</label>
            <input
              type="text"
              placeholder="name@example.com"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              required
            />
          </div>
          <div className="auth-field">
            <label>비밀번호</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-btn-primary" type="submit" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="auth-link">
          계정이 없으신가요? <Link to="/register">회원가입</Link>
        </div>
      </div>
    </div>
  )
}