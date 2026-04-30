import { useState, useEffect, useRef } from 'react'
import { getTodosApi, createTodoApi, toggleTodoApi, deleteTodoApi } from '@/api/todo'

interface Todo {
  id: number
  content: string
  isDone: boolean
  createdAt: string
}

type Tab = '전체' | '오늘' | '이번 주' | '완료됨'

const TABS: Tab[] = ['전체', '오늘', '이번 주', '완료됨']

function isToday(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
}

function isThisWeek(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  return d >= startOfWeek
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86400000 && isToday(dateStr)) return '오늘'
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}/${dd}`
}

const CheckIcon = () => (
  <svg viewBox="0 0 10 10">
    <polyline points="1.5,5 4,7.5 8.5,2" stroke="white" strokeWidth="1.5" fill="none" />
  </svg>
)

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
  </svg>
)

export default function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [tab, setTab] = useState<Tab>('전체')
  const [inputText, setInputText] = useState('')
  const [focused, setFocused] = useState(false)
  const [loading, setLoading] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getTodosApi()
      .then(res => setTodos(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function filterTodos(list: Todo[]): Todo[] {
    switch (tab) {
      case '오늘':
        return list.filter(t => !t.isDone && isToday(t.createdAt))
      case '이번 주':
        return list.filter(t => !t.isDone && isThisWeek(t.createdAt))
      case '완료됨':
        return list.filter(t => t.isDone)
      default:
        return list
    }
  }

  async function handleAdd() {
    const text = inputText.trim()
    if (!text) return
    setInputText('')
    try {
      const res = await createTodoApi(text)
      setTodos(prev => [res.data.data, ...prev])
    } catch {
      setInputText(text)
    }
  }

  async function handleToggle(id: number) {
    try {
      const res = await toggleTodoApi(id)
      setTodos(prev => prev.map(t => t.id === id ? res.data.data : t))
    } catch {
      /* ignore */
    }
  }

  async function handleDelete(id: number) {
    setTodos(prev => prev.filter(t => t.id !== id))
    try {
      await deleteTodoApi(id)
    } catch {
      getTodosApi().then(res => setTodos(res.data.data)).catch(() => {})
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleAdd()
    if (e.key === 'Escape') {
      setInputText('')
      setFocused(false)
      inputRef.current?.blur()
    }
  }

  const undoneCount = todos.filter(t => !t.isDone).length
  const doneCount = todos.filter(t => t.isDone).length
  const filtered = filterTodos(todos)

  if (loading) return null

  return (
    <div className="todo-page-wrap">
      <div className="todo-page-header">
        <div>
          <div className="todo-page-title">내 할일</div>
          <div className="todo-page-sub">
            {undoneCount}개 미완료 · {doneCount}개 완료
          </div>
        </div>
      </div>

      <div className="todo-tabs">
        {TABS.map(t => (
          <button
            key={t}
            className={`todo-tab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div
        className={`todo-add-row${focused ? ' focused' : ''}`}
        onClick={() => { setFocused(true); inputRef.current?.focus() }}
      >
        <PlusIcon />
        <input
          ref={inputRef}
          className="todo-add-input"
          placeholder="할일 추가 (Enter)"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>

      {filtered.length === 0 && (
        <div className="todo-empty">할일이 없습니다</div>
      )}

      {filtered.map(todo => (
        <div
          key={todo.id}
          className="todo-item"
          style={todo.isDone ? { opacity: 0.5 } : undefined}
        >
          <div
            className={`todo-checkbox${todo.isDone ? ' checked' : ''}`}
            onClick={() => handleToggle(todo.id)}
          >
            {todo.isDone && <CheckIcon />}
          </div>
          <div className={`todo-text-label${todo.isDone ? ' done' : ''}`}>
            {todo.content}
          </div>
          <span className="todo-date-label">
            {todo.isDone ? '완료' : formatDate(todo.createdAt)}
          </span>
          <button className="todo-more" onClick={() => handleDelete(todo.id)}>
            ⋯
          </button>
        </div>
      ))}
    </div>
  )
}
