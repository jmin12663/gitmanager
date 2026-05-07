import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventInput, EventClickArg, DatesSetArg } from '@fullcalendar/core'
import type { DateClickArg } from '@fullcalendar/interaction'
import type { Schedule } from '@/types/calendar'
import { getSchedulesApi, createScheduleApi, updateScheduleApi, deleteScheduleApi } from '@/api/calendar'

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
const FC_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6']

function addOneDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const next = new Date(y, m - 1, d + 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
}

function scheduleToEvent(s: Schedule): EventInput {
  return {
    id: String(s.id),
    title: s.title,
    start: s.startDate,
    end: addOneDay(s.endDate),
    allDay: true,
    backgroundColor: FC_COLORS[s.id % FC_COLORS.length],
    borderColor: FC_COLORS[s.id % FC_COLORS.length],
    extendedProps: { startDate: s.startDate, endDate: s.endDate },
  }
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

  async function handleSubmit(e: React.SyntheticEvent) {
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

interface EditScheduleModalProps {
  id: number
  initialTitle: string
  initialStartDate: string
  initialEndDate: string
  onClose: () => void
  onSave: (id: number, title: string, startDate: string, endDate: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

function EditScheduleModal({ id, initialTitle, initialStartDate, initialEndDate, onClose, onSave, onDelete }: EditScheduleModalProps) {
  const [title, setTitle] = useState(initialTitle)
  const [startDate, setStartDate] = useState(initialStartDate)
  const [endDate, setEndDate] = useState(initialEndDate)
  const [saveLoading, setSaveLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('제목을 입력하세요.'); return }
    if (startDate > endDate) { setError('종료일은 시작일 이후여야 합니다.'); return }
    setSaveLoading(true)
    try {
      await onSave(id, title.trim(), startDate, endDate)
      onClose()
    } catch {
      setError('일정 수정에 실패했습니다.')
    } finally {
      setSaveLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('일정을 삭제하시겠습니까?')) return
    setDeleteLoading(true)
    try {
      await onDelete(id)
      onClose()
    } catch {
      setError('일정 삭제에 실패했습니다.')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="gm-modal-overlay" onClick={onClose}>
      <div className="gm-modal" onClick={e => e.stopPropagation()}>
        <button className="gm-modal-close" onClick={onClose}>×</button>
        <div className="gm-modal-title">일정 수정</div>
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>제목</label>
            <input
              type="text"
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
          <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'stretch' }}>
            <button className="auth-btn-primary" type="submit" disabled={saveLoading} style={{ flex: 1, margin: 0 }}>
              {saveLoading ? '저장 중...' : '저장'}
            </button>
            <button
              className="auth-btn-secondary"
              type="button"
              onClick={handleDelete}
              disabled={deleteLoading}
              style={{ color: 'var(--gm-danger, #ef4444)', margin: 0 }}
            >
              {deleteLoading ? '삭제 중...' : '삭제'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const pid = Number(projectId)

  const calendarRef = useRef<FullCalendar>(null)
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [events, setEvents] = useState<EventInput[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [clickedDate, setClickedDate] = useState<string | undefined>(undefined)
  const [editTarget, setEditTarget] = useState<{ id: number; title: string; startDate: string; endDate: string } | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [dpYear, setDpYear] = useState(today.getFullYear())
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pickerOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [pickerOpen])

  async function loadSchedules(from: string, to: string) {
    try {
      const res = await getSchedulesApi(pid, from, to)
      setEvents((res.data.data as Schedule[]).map(scheduleToEvent))
    } catch {
      setEvents([])
    }
  }

  function handleDatesSet(arg: DatesSetArg) {
    const mid = new Date((arg.start.getTime() + arg.end.getTime()) / 2)
    setYear(mid.getFullYear())
    setMonth(mid.getMonth() + 1)
    void loadSchedules(arg.startStr.slice(0, 10), arg.endStr.slice(0, 10))
  }

  function handleDateClick(arg: DateClickArg) {
    setClickedDate(arg.dateStr)
    setShowCreate(true)
  }

  function handleEventClick(arg: EventClickArg) {
    setEditTarget({
      id: Number(arg.event.id),
      title: arg.event.title,
      startDate: arg.event.extendedProps.startDate as string,
      endDate: arg.event.extendedProps.endDate as string,
    })
  }

  async function handleUpdate(id: number, title: string, startDate: string, endDate: string) {
    await updateScheduleApi(pid, id, { title, startDate, endDate })
    const api = calendarRef.current?.getApi()
    if (api) {
      void loadSchedules(
        api.view.activeStart.toISOString().slice(0, 10),
        api.view.activeEnd.toISOString().slice(0, 10),
      )
    }
  }

  async function handleDelete(id: number) {
    await deleteScheduleApi(pid, id)
    setEvents(prev => prev.filter(e => e.id !== String(id)))
  }

  async function handleCreate(title: string, startDate: string, endDate: string) {
    await createScheduleApi(pid, { title, startDate, endDate })
    const api = calendarRef.current?.getApi()
    if (api) {
      void loadSchedules(
        api.view.activeStart.toISOString().slice(0, 10),
        api.view.activeEnd.toISOString().slice(0, 10),
      )
    }
  }

  function togglePicker() {
    setDpYear(year)
    setPickerOpen(p => !p)
  }

  function selectMonth(y: number, m: number) {
    setYear(y)
    setMonth(m)
    setPickerOpen(false)
    calendarRef.current?.getApi().gotoDate(`${y}-${String(m).padStart(2, '0')}-01`)
  }

  return (
    <div>
      <div className="cal-toolbar">
        {/* 왼쪽: ‹ 2026년 5월 › */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button className="cal-arrow-btn" onClick={() => calendarRef.current?.getApi().prev()}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div style={{ position: 'relative' }} ref={pickerRef}>
            <button className="cal-title-btn" onClick={togglePicker} style={{ padding: '0 6px' }}>
              <span className="cal-title-text">{year}년 {MONTHS[month - 1]}</span>
              <svg
                width="12" height="12" viewBox="0 0 16 16" fill="currentColor"
                style={{ transform: pickerOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: 'var(--gm-text3)', transition: 'transform 0.15s' }}
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

          <button className="cal-arrow-btn" onClick={() => calendarRef.current?.getApi().next()}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* 오른쪽: 오늘 + 일정 추가 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="cal-nav-btn" onClick={() => calendarRef.current?.getApi().today()} style={{ padding: '0 12px', fontSize: 12 }}>오늘</button>
          <button className="topbar-btn accent" onClick={() => { setClickedDate(undefined); setShowCreate(true) }}>
            <PlusIcon />
            일정 추가
          </button>
        </div>
      </div>

      <div className="fc-gm-wrap">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={false}
          locale="ko"
          events={events}
          datesSet={handleDatesSet}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          height="auto"
          dayMaxEvents={3}
          moreLinkText={n => `+${n}개 더`}
          eventDisplay="block"
        />
      </div>

      {showCreate && (
        <CreateScheduleModal
          defaultDate={clickedDate}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}

      {editTarget && (
        <EditScheduleModal
          id={editTarget.id}
          initialTitle={editTarget.title}
          initialStartDate={editTarget.startDate}
          initialEndDate={editTarget.endDate}
          onClose={() => setEditTarget(null)}
          onSave={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}