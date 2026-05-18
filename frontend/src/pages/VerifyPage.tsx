import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { verifyEmailCodeApi, sendEmailCodeApi } from '@/api/auth'


const OTP_LENGTH = 6

export default function VerifyPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [resendError, setResendError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(300)
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

  async function handleVerify(e: React.SyntheticEvent) {
    e.preventDefault()
    const code = digits.join('')
    if (code.length < OTP_LENGTH) {
      setError('인증코드 6자리를 모두 입력해주세요.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await verifyEmailCodeApi({ email, code })
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
          <span className="auth-logo-name">DevFlow</span>
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
              ? <span style={{ cursor: 'default' }}>재전송 ({String(Math.floor(countdown / 60)).padStart(2, '0')}:{String(countdown % 60).padStart(2, '0')})</span>
              : <span onClick={async () => {
                  try {
                    await sendEmailCodeApi(email)
                    setCountdown(300)
                    setResendError('')
                  } catch (err: unknown) {
                    const msg = (err as { response?: { data?: { error?: { message?: string } } } })
                      ?.response?.data?.error?.message
                    setResendError(msg ?? '재전송에 실패했습니다.')
                  }
                }}>재전송</span>
            }
          </div>

          {resendError && <div className="auth-error">{resendError}</div>}
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