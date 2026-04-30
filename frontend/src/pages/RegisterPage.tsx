import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerApi, sendEmailCodeApi, verifyEmailCodeApi } from '@/api/auth'

const GithubIcon = () => (
  <svg viewBox="0 0 16 16">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
)

const OTP_LENGTH = 6

export default function RegisterPage() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [loginId, setLoginId] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [codeSent, setCodeSent] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [countdown, setCountdown] = useState(300)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const [error, setError] = useState('')
  const [sendLoading, setSendLoading] = useState(false)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [registerLoading, setRegisterLoading] = useState(false)

  useEffect(() => {
    if (!codeSent || countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [codeSent, countdown])

  async function handleSendCode() {
    if (!email) {
      setError('이메일을 입력해주세요.')
      return
    }
    setError('')
    setSendLoading(true)
    try {
      await sendEmailCodeApi(email)
      setCodeSent(true)
      setEmailVerified(false)
      setCountdown(300)
      setDigits(Array(OTP_LENGTH).fill(''))
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } }
      const msg = axiosErr.response?.data?.error?.message
      setError(msg ?? '인증코드 전송에 실패했습니다.')
    } finally {
      setSendLoading(false)
    }
  }

  function handleDigitChange(idx: number, val: string) {
    const ch = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[idx] = ch
    setDigits(next)
    if (ch && idx < OTP_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus()
    }
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    const next = Array(OTP_LENGTH).fill('')
    pasted.split('').forEach((ch, i) => { next[i] = ch })
    setDigits(next)
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus()
  }

  async function handleVerifyCode() {
    const code = digits.join('')
    if (code.length < OTP_LENGTH) {
      setError('인증코드 6자리를 모두 입력해주세요.')
      return
    }
    setError('')
    setVerifyLoading(true)
    try {
      const res = await verifyEmailCodeApi({ email, code })
      if (!res.data.success) {
        setError(res.data.error?.message ?? '인증에 실패했습니다.')
        return
      }
      setEmailVerified(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message
      setError(msg ?? '인증에 실패했습니다.')
    } finally {
      setVerifyLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!emailVerified) {
      setError('이메일 인증을 먼저 완료해주세요.')
      return
    }
    setError('')
    setRegisterLoading(true)
    try {
      await registerApi({ name, loginId, email, password })
      navigate('/login')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } }
      const msg = axiosErr.response?.data?.error?.message
      setError(msg ?? '회원가입에 실패했습니다.')
    } finally {
      setRegisterLoading(false)
    }
  }

  const mmss = `${String(Math.floor(countdown / 60)).padStart(2, '0')}:${String(countdown % 60).padStart(2, '0')}`

  return (
    <div className="auth-wrap">
      <div className="auth-bg" />
      <div className="auth-grid" />
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon"><GithubIcon /></div>
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
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setCodeSent(false); setEmailVerified(false) }}
                required
                style={{ flex: 1, minWidth: 0 }}
              />
              <button
                type="button"
                className="auth-btn-secondary"
                onClick={handleSendCode}
                disabled={sendLoading}
                style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {sendLoading ? '전송 중...' : codeSent ? '재전송' : '인증코드 전송'}
              </button>
            </div>
          </div>

          {codeSent && !emailVerified && (
            <div style={{ marginBottom: 16 }}>
              <div className="otp-row" onPaste={handlePaste} style={{ marginBottom: 8 }}>
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el }}
                    maxLength={1}
                    value={d}
                    onChange={e => handleDigitChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    inputMode="numeric"
                  />
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--gm-text2)' }}>
                  {countdown > 0
                    ? <span>{mmss}</span>
                    : <span style={{ cursor: 'pointer', color: 'var(--gm-accent)' }} onClick={handleSendCode}>재전송</span>
                  }
                </span>
                <button
                  type="button"
                  className="auth-btn-secondary"
                  onClick={handleVerifyCode}
                  disabled={verifyLoading}
                  style={{ height: 32, fontSize: 12 }}
                >
                  {verifyLoading ? '확인 중...' : '인증하기'}
                </button>
              </div>
            </div>
          )}

          {emailVerified && (
            <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--gm-accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✓</span> 이메일 인증 완료
            </div>
          )}

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

          <button
            className="auth-btn-primary"
            type="submit"
            disabled={registerLoading || !emailVerified || !name || !loginId || !password}
          >
            {registerLoading ? '처리 중...' : '회원가입'}
          </button>
        </form>

        <div className="auth-link">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </div>
      </div>
    </div>
  )
}