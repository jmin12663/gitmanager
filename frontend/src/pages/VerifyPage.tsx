import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { verifyEmailApi } from '@/api/auth'

const GithubIcon = () => (
  <svg viewBox="0 0 16 16">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
)

const OTP_LENGTH = 6

export default function VerifyPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(59)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

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

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    const code = digits.join('')
    if (code.length < OTP_LENGTH) {
      setError('인증코드 6자리를 모두 입력해주세요.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await verifyEmailApi({ email, code })
      if (!res.data.success) {
        setError(res.data.error?.message ?? '인증에 실패했습니다.')
        return
      }
      navigate('/login')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message
      setError(msg ?? '인증에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-bg" />
      <div className="auth-grid" />
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-logo" style={{ justifyContent: 'center' }}>
          <div className="auth-logo-icon">
            <GithubIcon />
          </div>
          <span className="auth-logo-name">GitManager</span>
        </div>

        <div style={{ fontSize: 40, marginBottom: 16 }}>✉️</div>
        <div className="auth-title">이메일을 확인해주세요</div>
        <div className="auth-sub" style={{ marginBottom: 28 }}>
          {email ? `${email}으로 인증코드를 발송했습니다` : '이메일로 인증코드를 발송했습니다'}
        </div>

        <form onSubmit={handleVerify}>
          <div className="otp-row" onPaste={handlePaste}>
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

          <div className="resend-row">
            코드를 받지 못하셨나요?{' '}
            {countdown > 0
              ? <span style={{ cursor: 'default' }}>재전송 ({countdown}s)</span>
              : <span onClick={() => setCountdown(59)}>재전송</span>
            }
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-btn-primary" type="submit" disabled={loading}>
            {loading ? '인증 중...' : '인증하기'}
          </button>
        </form>

        <div className="auth-link" style={{ marginTop: 14 }}>
          <Link to="/login">로그인으로 돌아가기</Link>
        </div>
      </div>
    </div>
  )
}