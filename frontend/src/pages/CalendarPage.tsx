import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import type { Schedule } from '@/types/calendar'
import { getSchedulesApi, createScheduleApi, deleteScheduleApi } from '@/api/calendar'

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
const DOWS = ['일', '월', '화', '수', '목', '금', '토']
const EVENT_CLASSES = ['ev-indigo', 'ev-green', 'ev-amber']

function getEventClass(id: number): string {
  return EVENT_CLASSES[id % EVENT_CLASSES.length]
}

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function getSchedulesForDay(schedules: Schedule[], dateStr: string): Schedule[] {
  return schedules.filter(s => s.startDate <= dateStr && dateStr <= s.endDate)
}

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
  </svg>
)

interface CreateScheduleModalProps {
  defaultDate?: string
  onClose: () => void
  onCreate: (title: string, startDate: string, endDate: string) => Promise<void>
}

function CreateScheduleModal({ defaultDate = '', onClose, onCreate }: CreateScheduleModalProps) {
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState(defaultDate)
  const [endDate, setEndDate] = useState(defaultDate)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('제목을 입력하세요.'); return }
    if (!startDate || !endDate) { setError('날짜를 입력하세요.'); return }
    if (startDate > endDate) { setError('종료일은 시작일 이후여야 합니다.'); return }
    setLoading(true)
    try {
      await onCreate(title.trim(), startDate, endDate)
      onClose()
    } catch {
      setError('일정 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="gm-modal-overlay" onClick={onClose}>
      <div className="gm-modal" onClick={e => e.stopPropagation()}>
        <button className="gm-modal-close" onClick={onClose}>×</button>
        <div className="gm-modal-title">일정 추가</div>
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>제목</label>
            <input
              type="text"
              placeholder="일정 제목을 입력하세요"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="auth-field">
            <label>시작일</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="auth-field">
            <label>종료일</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button className="auth-btn-primary" type="submit" disabled={loading}>
            {loading ? '생성 중...' : '추가하기'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const pid = Number(projectId)

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [clickedDate, setClickedDate] = useState<string | undefined>(undefined)

  // Date picker state
  const [pickerOpen, setPickerOpen] = useState(false)
  const [dpYear, setDpYear] = useState(year)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadSchedules()
  }, [pid, year, month])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    if (pickerOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [pickerOpen])

  function loadSchedules() {
    const from = toDateStr(year, month, 1)
    const lastDay = new Date(year, month, 0).getDate()
    const to = toDateStr(year, month, lastDay)
    getSchedulesApi(pid, from, to)
      .then(res => setSchedules(res.data.data))
      .catch(() => setSchedules([]))
  }

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  function goToday() {
    setYear(today.getFullYear())
    setMonth(today.getMonth() + 1)
  }

  function togglePicker() {
    setDpYear(year)
    setPickerOpen(p => !p)
  }

  function selectMonth(y: number, m: number) {
    setYear(y)
    setMonth(m)
    setPickerOpen(false)
  }

  async function handleCreate(title: string, startDate: string, endDate: string) {
    await createScheduleApi(pid, { title, startDate, endDate })
    loadSchedules()
  }

  async function handleDelete(id: number) {
    if (!confirm('일정을 삭제하시겠습니까?')) return
    try {
      await deleteScheduleApi(pid, id)
      setSchedules(prev => prev.filter(s => s.id !== id))
    } catch {}
  }

  // Build calendar cells
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const daysInPrev = new Date(year, month - 1, 0).getDate()
  const total = firstDay + daysInMonth
  const trailing = total % 7 === 0 ? 0 : 7 - (total % 7)

  interface CalCell {
    day: number
    dateStr: string
    isCurrentMonth: boolean
    isToday: boolean
  }

  const cells: CalCell[] = []

  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrev - i
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    cells.push({ day: d, dateStr: toDateStr(prevYear, prevMonth, d), isCurrentMonth: false, isToday: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = toDateStr(year, month, d)
    const isToday =
      today.getFullYear() === year &&
      today.getMonth() + 1 === month &&
      today.getDate() === d
    cells.push({ day: d, dateStr, isCurrentMonth: true, isToday })
  }
  for (let d = 1; d <= trailing; d++) {
    const nextM = month === 12 ? 1 : month + 1
    const nextY = month === 12 ? year + 1 : year
    cells.push({ day: d, dateStr: toDateStr(nextY, nextM, d), isCurrentMonth: false, isToday: false })
  }

  return (
    <div>
      <div className="cal-toolbar">
        <div style={{ position: 'relative' }} ref={pickerRef}>
          <button className="cal-title-btn" onClick={togglePicker}>
            <span className="cal-title-text">{year}년 {MONTHS[month - 1]}</span>
            <svg
              width="14" height="14" viewBox="0 0 16 16" fill="currentColor"
              className="cal-title-chevron"
              style={{ transform: pickerOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: 'var(--gm-text3)' }}
            >
              <path d="M4.5 6.5l3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {pickerOpen && (
            <div className="date-picker-popup">
              <div className="dp-year-nav">
                <button className="dp-year-btn" onClick={() => setDpYear(y => y - 1)}>‹</button>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--gm-text1)' }}>{dpYear}년</span>
                <button className="dp-year-btn" onClick={() => setDpYear(y => y + 1)}>›</button>
              </div>
              <div className="dp-months">
                {MONTHS.map((m, i) => {
                  const mo = i + 1
                  const isActive = dpYear === year && mo === month
                  return (
                    <button
                      key={mo}
                      className={`dp-month-btn${isActive ? ' active' : ''}`}
                      onClick={() => selectMonth(dpYear, mo)}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="cal-nav">
            <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
            <button className="cal-nav-btn" onClick={goToday} style={{ width: 'auto', padding: '0 10px', fontSize: 12 }}>오늘</button>
            <button className="cal-nav-btn" onClick={nextMonth}>›</button>
          </div>
          <button className="topbar-btn accent" onClick={() => { setClickedDate(undefined); setShowCreate(true) }}>
            <PlusIcon />
            일정 추가
          </button>
        </div>
      </div>

      <div className="cal-grid-wrap">
        <div className="cal-dow-row">
          {DOWS.map(d => (
            <div key={d} className="cal-dow-cell">{d}</div>
          ))}
        </div>
        <div className="cal-cells">
          {cells.map((cell, idx) => {
            const daySchedules = getSchedulesForDay(schedules, cell.dateStr)
            return (
              <div
                key={idx}
                className={`cal-cell${cell.isToday ? ' is-today' : ''}`}
                onClick={() => { if (cell.isCurrentMonth) { setClickedDate(cell.dateStr); setShowCreate(true) } }}
                style={{ cursor: cell.isCurrentMonth ? 'pointer' : 'default' }}
              >
                <div className={`cal-day-num${cell.isToday ? ' today' : ''}${!cell.isCurrentMonth ? ' other-month' : ''}`}>
                  {cell.day}
                </div>
                {daySchedules.map(s => (
                  <div
                    key={s.id}
                    className={`cal-event-pill ${getEventClass(s.id)}`}
                    onClick={e => { e.stopPropagation(); handleDelete(s.id) }}
                    title={`${s.title} (클릭하여 삭제)`}
                  >
                    {s.title}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {showCreate && (
        <CreateScheduleModal
          defaultDate={clickedDate}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}