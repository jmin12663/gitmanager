import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerApi, sendEmailCodeApi, verifyEmailCodeApi } from '@/api/auth'

const OTP_LENGTH = 6

interface HintCondition {
  label: string
  met: boolean
}

function FieldHint({ conditions, touched }: { conditions: HintCondition[]; touched: boolean }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', marginTop: 6 }}>
      {conditions.map(c => (
        <span
          key={c.label}
          style={{
            fontSize: 11,
            color: touched && c.met ? '#10b981' : touched && !c.met ? 'var(--gm-red, #ef4444)' : 'var(--gm-text3)',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          {touched ? (c.met ? '✓' : '✗') : '·'} {c.label}
        </span>
      ))}
    </div>
  )
}

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

  async function handleRegister(e: React.SyntheticEvent) {
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
          <span className="auth-logo-name">DevFlow</span>
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
            <FieldHint conditions={[
              { label: '필수 입력', met: name.trim().length > 0 },
            ]} touched={name.length > 0} />
          </div>
          <div className="auth-field">
            <label>아이디</label>
            <input
              type="text"
              placeholder="영문·숫자 조합"
              value={loginId}
              onChange={e => setLoginId(e.target.value)}
              required
            />
            <FieldHint conditions={[
              { label: '5~20자', met: loginId.length >= 5 && loginId.length <= 20 },
              { label: '영문·숫자만 허용', met: /^[a-zA-Z0-9]+$/.test(loginId) },
            ]} touched={loginId.length > 0} />
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
            <FieldHint conditions={[
              { label: '올바른 이메일 형식', met: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) },
              { label: '이메일 인증 완료', met: emailVerified },
            ]} touched={email.length > 0} />
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

          <div className="auth-field">
            <label>비밀번호</label>
            <input
              type="password"
              placeholder="8자 이상"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <FieldHint conditions={[
              { label: '8자 이상', met: password.length >= 8 },
            ]} touched={password.length > 0} />
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