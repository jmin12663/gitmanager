import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { getProjectPullsApi, getPullFilesApi, getPrCommentsApi, createPrCommentApi, createPrCommentReplyApi, getRepoBranchesApi, createPrApi, mergePrApi, closePrApi, convertDraftStateApi } from '@/api/pullrequest'
import type { PullFile, PullRequest, PrLineComment, MergePrBody } from '@/types/pullrequest'

type TabState = 'open' | 'draft' | 'merged' | 'closed'

const TAB_LABELS: Record<TabState, string> = {
  open: 'Open',
  draft: 'Draft',
  merged: 'Merged',
  closed: 'Closed',
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
}

interface DiffLineInfo {
  text: string
  type: 'hunk' | 'added' | 'removed' | 'context'
  newLine: number | null
}

function parsePatchLines(patch: string): DiffLineInfo[] {
  const result: DiffLineInfo[] = []
  let newLineNum = 0
  const rawLines = patch.split('\n')
  const patchLines = rawLines[rawLines.length - 1] === '' ? rawLines.slice(0, -1) : rawLines

  for (const line of patchLines) {
    if (line.startsWith('@@')) {
      const m = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
      if (m) newLineNum = parseInt(m[1]) - 1
      result.push({ text: line, type: 'hunk', newLine: null })
    } else if (line.startsWith('+')) {
      newLineNum++
      result.push({ text: line, type: 'added', newLine: newLineNum })
    } else if (line.startsWith('-')) {
      result.push({ text: line, type: 'removed', newLine: null })
    } else {
      newLineNum++
      result.push({ text: line, type: 'context', newLine: newLineNum })
    }
  }
  return result
}

const GitPrIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M1.5 3.25a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zm5.677-.177L9.573.677A.25.25 0 0110 .854V2.5h1A2.5 2.5 0 0113.5 5v5.628a2.251 2.251 0 11-1.5 0V5a1 1 0 00-1-1h-1v1.646a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm0 9.5a.75.75 0 100 1.5.75.75 0 000-1.5zm8.25.75a.75.75 0 101.5 0 .75.75 0 00-1.5 0z" />
  </svg>
)

function FileStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    added:    { label: 'A', cls: 'file-status--added' },
    removed:  { label: 'D', cls: 'file-status--removed' },
    modified: { label: 'M', cls: 'file-status--modified' },
    renamed:  { label: 'R', cls: 'file-status--renamed' },
  }
  const { label, cls } = map[status] ?? { label: 'M', cls: 'file-status--modified' }
  return <span className={`file-status-badge ${cls}`}>{label}</span>
}

interface DiffBlockProps {
  patch: string | null
  filename: string
  prNumber: number
  headSha: string
  projectId: number
  onCommentAdded: (comment: PrLineComment) => void
  fileComments: PrLineComment[]
}

function DiffBlock({ patch, filename, prNumber, headSha, projectId, onCommentAdded, fileComments }: DiffBlockProps) {
  const [activeCommentLine, setActiveCommentLine] = useState<number | null>(null)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successLines, setSuccessLines] = useState<Set<number>>(new Set())
  const [error, setError] = useState('')
  const [collapsedLines, setCollapsedLines] = useState<Set<number>>(new Set())
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replySubmitting, setReplySubmitting] = useState(false)
  const [replyError, setReplyError] = useState('')

  const commentsByLine = useMemo(() => {
    const map = new Map<number, PrLineComment[]>()
    for (const c of fileComments) {
      if (c.line != null) {
        if (!map.has(c.line)) map.set(c.line, [])
        map.get(c.line)!.push(c)
      }
    }
    return map
  }, [fileComments])

  if (!patch) {
    return <div className="diff-no-patch">패치 정보가 없습니다. (바이너리 파일이거나 너무 큰 파일입니다)</div>
  }

  const lines = parsePatchLines(patch)

  function toggleCommentForm(line: number) {
    setActiveCommentLine(prev => prev === line ? null : line)
    setCommentText('')
    setError('')
  }

  function toggleCollapsedLine(line: number) {
    setCollapsedLines(prev => {
      const next = new Set(prev)
      if (next.has(line)) next.delete(line)
      else next.add(line)
      return next
    })
  }

  async function submitComment(line: number) {
    if (!commentText.trim() || !headSha) return
    setSubmitting(true)
    setError('')
    try {
      const res = await createPrCommentApi(projectId, prNumber, {
        body: commentText.trim(),
        commitId: headSha,
        path: filename,
        line,
        side: 'RIGHT',
      })
      setSuccessLines(prev => new Set([...prev, line]))
      setActiveCommentLine(null)
      setCommentText('')
      onCommentAdded(res.data.data)
      setCollapsedLines(prev => { const next = new Set(prev); next.delete(line); return next })
    } catch {
      setError('코멘트 등록에 실패했습니다. 이미 병합된 PR이거나 권한이 없을 수 있습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitReply(commentId: number, line: number) {
    if (!replyText.trim()) return
    setReplySubmitting(true)
    setReplyError('')
    try {
      const res = await createPrCommentReplyApi(projectId, prNumber, commentId, replyText.trim())
      setActiveReplyId(null)
      setReplyText('')
      onCommentAdded(res.data.data)
      setCollapsedLines(prev => { const next = new Set(prev); next.delete(line); return next })
    } catch {
      setReplyError('답글 등록에 실패했습니다.')
    } finally {
      setReplySubmitting(false)
    }
  }

  return (
    <div className="diff-block">
      {lines.map((lineInfo, i) => {
        const lineCommentCount = lineInfo.newLine ? (commentsByLine.get(lineInfo.newLine)?.length ?? 0) : 0
        const isCollapsed = lineInfo.newLine !== null && collapsedLines.has(lineInfo.newLine)
        return (
          <div key={i}>
            <div className={`diff-line-wrap${lineInfo.type !== 'context' ? ` diff-${lineInfo.type}` : ''}`}>
              <span className="diff-line-num">{lineInfo.newLine ?? ''}</span>
              {lineInfo.newLine && lineInfo.type !== 'removed' && (
                <button
                  className={`diff-comment-btn${successLines.has(lineInfo.newLine) ? ' diff-comment-btn--done' : ''}`}
                  onClick={() => toggleCommentForm(lineInfo.newLine!)}
                  title="이 줄에 코멘트 달기"
                >
                  {successLines.has(lineInfo.newLine) ? '✓' : '+'}
                </button>
              )}
              {(!lineInfo.newLine || lineInfo.type === 'removed') && (
                <span className="diff-comment-btn-placeholder" />
              )}
              <span className="diff-line-content">{lineInfo.text}</span>
            </div>

            {lineCommentCount > 0 && (
              <div className="diff-thread-block">
                <button
                  className="diff-thread-header"
                  onClick={() => toggleCollapsedLine(lineInfo.newLine!)}
                >
                  <span className="diff-thread-chevron">{isCollapsed ? '▶' : '▼'}</span>
                  <span className="diff-thread-header-label">
                    Line {lineInfo.newLine} · 코멘트 {lineCommentCount}개
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="diff-thread-body">
                    {commentsByLine.get(lineInfo.newLine!)!
                      .filter(c => !c.inReplyToId)
                      .map(c => {
                        const replies = commentsByLine.get(lineInfo.newLine!)!.filter(r => r.inReplyToId === c.id)
                        return (
                          <div key={c.id} className="diff-inline-comment">
                            <div className="diff-inline-comment-meta">
                              <span className="diff-inline-comment-author">{c.author}</span>
                              <span className="diff-inline-comment-date">{formatCommentDate(c.createdAt)}</span>
                            </div>
                            <div className="diff-inline-comment-body">{c.body}</div>
                            <button
                              className="diff-reply-btn"
                              onClick={() => {
                                setActiveReplyId(prev => prev === c.id ? null : c.id)
                                setReplyText('')
                                setReplyError('')
                              }}
                            >
                              {activeReplyId === c.id ? '취소' : '답글'}
                            </button>

                            {replies.length > 0 && (
                              <div className="diff-reply-list">
                                {replies.map(r => (
                                  <div key={r.id} className="diff-reply-item">
                                    <div className="diff-inline-comment-meta">
                                      <span className="diff-inline-comment-author">{r.author}</span>
                                      <span className="diff-inline-comment-date">{formatCommentDate(r.createdAt)}</span>
                                    </div>
                                    <div className="diff-inline-comment-body">{r.body}</div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {activeReplyId === c.id && (
                              <div className="diff-reply-form">
                                <textarea
                                  className="diff-comment-textarea"
                                  value={replyText}
                                  onChange={e => setReplyText(e.target.value)}
                                  placeholder="답글을 입력하세요..."
                                  rows={3}
                                  autoFocus
                                />
                                {replyError && <div className="diff-comment-error">{replyError}</div>}
                                <div className="diff-comment-actions">
                                  <button
                                    className="diff-comment-submit"
                                    onClick={() => submitReply(c.id, lineInfo.newLine!)}
                                    disabled={replySubmitting || !replyText.trim()}
                                  >
                                    {replySubmitting ? '등록 중...' : '답글 등록'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })
                    }
                  </div>
                )}
              </div>
            )}

            {activeCommentLine === lineInfo.newLine && lineInfo.newLine && (
              <div className="diff-comment-form">
                <textarea
                  className="diff-comment-textarea"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder={`${filename} ${lineInfo.newLine}번 줄에 코멘트...`}
                  rows={3}
                  autoFocus
                />
                {error && <div className="diff-comment-error">{error}</div>}
                <div className="diff-comment-actions">
                  <button
                    className="diff-comment-cancel"
                    onClick={() => { setActiveCommentLine(null); setCommentText(''); setError('') }}
                  >
                    취소
                  </button>
                  <button
                    className="diff-comment-submit"
                    onClick={() => submitComment(lineInfo.newLine!)}
                    disabled={submitting || !commentText.trim()}
                  >
                    {submitting ? '등록 중...' : '코멘트 등록'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function formatCommentDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function PrDiffPanel({ projectId, pr }: { projectId: number; pr: PullRequest }) {
  const [files, setFiles] = useState<PullFile[]>([])
  const [comments, setComments] = useState<PrLineComment[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getPullFilesApi(projectId, pr.number),
      getPrCommentsApi(projectId, pr.number),
    ])
      .then(([filesRes, commentsRes]) => {
        const fileData = filesRes.data.data
        setFiles(fileData)
        setComments(commentsRes.data.data)
        if (fileData.length <= 5) {
          setExpandedFiles(new Set(fileData.map(f => f.filename)))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectId, pr.number])

  function toggleFile(filename: string) {
    setExpandedFiles(prev => {
      const next = new Set(prev)
      if (next.has(filename)) next.delete(filename)
      else next.add(filename)
      return next
    })
  }

  function handleCommentAdded(comment: PrLineComment) {
    setComments(prev => [...prev, comment])
  }

  if (loading) return <div className="diff-loading">불러오는 중...</div>

  const totalAdditions = files.reduce((s, f) => s + f.additions, 0)
  const totalDeletions = files.reduce((s, f) => s + f.deletions, 0)

  return (
    <div className="diff-panel">
      <div className="diff-panel-summary">
        <span className="diff-files-count">{files.length}개 파일 변경됨</span>
        <span className="diff-additions">+{totalAdditions}</span>
        <span className="diff-deletions">−{totalDeletions}</span>
      </div>

      {files.length === 0 ? (
        <div className="diff-loading">변경된 파일이 없습니다.</div>
      ) : (
        files.map(file => {
          const fileComments = comments.filter(c => c.path === file.filename)
          return (
            <div key={file.filename} className="diff-file">
              <button className="diff-file-header" onClick={() => toggleFile(file.filename)}>
                <FileStatusBadge status={file.status} />
                <span className="diff-filename">{file.filename}</span>
                <span className="diff-file-stats">
                  <span className="diff-additions">+{file.additions}</span>
                  <span className="diff-deletions">−{file.deletions}</span>
                </span>
                {fileComments.length > 0 && (
                  <span className="diff-file-comment-count">💬 {fileComments.length}</span>
                )}
                <span className="diff-toggle">{expandedFiles.has(file.filename) ? '▲' : '▼'}</span>
              </button>
              {expandedFiles.has(file.filename) && (
                <DiffBlock
                  patch={file.patch}
                  filename={file.filename}
                  prNumber={pr.number}
                  headSha={pr.headSha}
                  projectId={projectId}
                  onCommentAdded={handleCommentAdded}
                  fileComments={fileComments}
                />
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

function MergeButton({ projectId, pr, onMerged }: { projectId: number; pr: PullRequest; onMerged: () => void }) {
  const [open, setOpen] = useState(false)
  const [mergeMethod, setMergeMethod] = useState<MergePrBody['mergeMethod']>('merge')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const LABELS: Record<MergePrBody['mergeMethod'], string> = {
    merge: 'Merge commit',
    squash: 'Squash and merge',
    rebase: 'Rebase and merge',
  }

  async function handleMerge() {
    setLoading(true)
    setError('')
    try {
      await mergePrApi(projectId, pr.number, { mergeMethod })
      setOpen(false)
      onMerged()
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message
      setError(msg ?? '머지에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button className="pr-merge-btn" onClick={() => setOpen(true)}>
        Merge
      </button>
    )
  }

  return (
    <div className="pr-merge-panel">
      <select
        className="pr-merge-select"
        value={mergeMethod}
        onChange={e => setMergeMethod(e.target.value as MergePrBody['mergeMethod'])}
        disabled={loading}
      >
        {(Object.keys(LABELS) as MergePrBody['mergeMethod'][]).map(m => (
          <option key={m} value={m}>{LABELS[m]}</option>
        ))}
      </select>
      <button className="pr-merge-confirm-btn" onClick={handleMerge} disabled={loading}>
        {loading ? '머지 중...' : '확인'}
      </button>
      <button className="pr-merge-cancel-btn" onClick={() => { setOpen(false); setError('') }} disabled={loading}>
        취소
      </button>
      {error && <span className="pr-merge-error">{error}</span>}
    </div>
  )
}

function CloseButton({ projectId, pr, onClosed }: { projectId: number; pr: PullRequest; onClosed: () => void }) {
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleClose() {
    setLoading(true)
    setError('')
    try {
      await closePrApi(projectId, pr.number)
      setConfirm(false)
      onClosed()
    } catch {
      setError('PR 닫기에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (!confirm) {
    return (
      <button className="pr-close-btn" onClick={() => setConfirm(true)}>
        Close
      </button>
    )
  }

  return (
    <div className="pr-close-panel">
      <span className="pr-close-confirm-text">이 PR을 닫으시겠습니까?</span>
      <button className="pr-close-confirm-btn" onClick={handleClose} disabled={loading}>
        {loading ? '처리 중...' : '확인'}
      </button>
      <button className="pr-merge-cancel-btn" onClick={() => { setConfirm(false); setError('') }} disabled={loading}>
        취소
      </button>
      {error && <span className="pr-merge-error">{error}</span>}
    </div>
  )
}

function DraftToggleButton({ projectId, pr, onToggled }: { projectId: number; pr: PullRequest; onToggled: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const toDraft = pr.state === 'OPEN'

  async function handleToggle() {
    setLoading(true)
    setError('')
    try {
      await convertDraftStateApi(projectId, pr.number, toDraft, pr.nodeId)
      onToggled()
    } catch {
      setError(toDraft ? 'Draft 전환에 실패했습니다.' : 'Ready 전환에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pr-draft-toggle">
      <button className="pr-draft-btn" onClick={handleToggle} disabled={loading}>
        {loading ? '처리 중...' : toDraft ? 'Draft로' : 'Ready for Review'}
      </button>
      {error && <span className="pr-merge-error">{error}</span>}
    </div>
  )
}

function PrItem({ pr, projectId, onMerged, autoOpen }: { pr: PullRequest; projectId: number; onMerged: () => void; autoOpen?: boolean }) {
  const [showDiff, setShowDiff] = useState(autoOpen ?? false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoOpen && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [autoOpen])

  return (
    <div ref={ref} className={`pr-item${showDiff ? ' pr-item--expanded' : ''}`}>
      <div className="pr-item-top">
        <div className="pr-item-left">
          <span className={`pr-badge pr-badge--${pr.state.toLowerCase()}`}>{pr.state}</span>
          <div className="pr-item-body">
            <div className="pr-item-text">
              <a href={pr.htmlUrl} target="_blank" rel="noreferrer" className="pr-item-title">
                #{pr.number} {pr.title}
              </a>
              <div className="pr-item-meta">
                <span className="pr-item-branch">{pr.branchName}</span>
                {pr.baseBranch && (
                  <>
                    <span className="pr-item-dot">→</span>
                    <span className="pr-item-branch">{pr.baseBranch}</span>
                  </>
                )}
                <span className="pr-item-dot">·</span>
                <span>{pr.author}</span>
                <span className="pr-item-dot">·</span>
                <span>{formatDate(pr.createdAt)}</span>
              </div>
            </div>
            <div className="pr-item-actions">
              <button
                className={`pr-diff-toggle-btn${showDiff ? ' active' : ''}`}
                onClick={() => setShowDiff(v => !v)}
              >
                {showDiff ? '코드 숨기기' : '코드 보기'}
              </button>
              {pr.state === 'OPEN' && (
                <MergeButton projectId={projectId} pr={pr} onMerged={onMerged} />
              )}
              {(pr.state === 'OPEN' || pr.state === 'DRAFT') && (
                <DraftToggleButton projectId={projectId} pr={pr} onToggled={onMerged} />
              )}
              {(pr.state === 'OPEN' || pr.state === 'DRAFT') && (
                <CloseButton projectId={projectId} pr={pr} onClosed={onMerged} />
              )}
              <a href={pr.htmlUrl} target="_blank" rel="noreferrer" className="pr-item-link">
                GitHub ↗
              </a>
            </div>
          </div>
        </div>
      </div>

      {showDiff && <PrDiffPanel projectId={projectId} pr={pr} />}
    </div>
  )
}

function CreatePrModal({ projectId, onClose, onCreated }: { projectId: number; onClose: () => void; onCreated: (pr: PullRequest) => void }) {
  const [branches, setBranches] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [head, setHead] = useState('')
  const [base, setBase] = useState('')
  const [loading, setLoading] = useState(false)
  const [branchLoading, setBranchLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getRepoBranchesApi(projectId)
      .then(res => {
        const list = res.data.data
        setBranches(list)
        if (list.length > 0) setHead(list[0])
        const main = list.find(b => b === 'main') ?? list.find(b => b === 'master') ?? (list.length > 1 ? list[1] : list[0] ?? '')
        setBase(main)
      })
      .catch(() => {})
      .finally(() => setBranchLoading(false))
  }, [projectId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !head || !base) return
    if (head === base) { setError('head 브랜치와 base 브랜치가 같습니다.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await createPrApi(projectId, { title: title.trim(), body: body.trim() || undefined, head, base })
      onCreated(res.data.data)
      onClose()
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message
      setError(msg ?? 'PR 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="gm-modal-overlay" onClick={onClose}>
      <div className="gm-modal pr-create-modal" onClick={e => e.stopPropagation()}>
        <button className="gm-modal-close" onClick={onClose}>×</button>
        <div className="gm-modal-title">Pull Request 생성</div>
        {branchLoading ? (
          <div className="pr-loading">브랜치 목록 불러오는 중...</div>
        ) : (
          <form className="pr-create-form" onSubmit={handleSubmit}>
            <div className="pr-create-branches">
              <div className="pr-create-field">
                <label className="pr-create-label">compare (head)</label>
                <select className="pr-create-select" value={head} onChange={e => setHead(e.target.value)} disabled={loading}>
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <span className="pr-create-arrow">→</span>
              <div className="pr-create-field">
                <label className="pr-create-label">base</label>
                <select className="pr-create-select" value={base} onChange={e => setBase(e.target.value)} disabled={loading}>
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div className="pr-create-field">
              <label className="pr-create-label">제목 *</label>
              <input
                className="pr-create-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="PR 제목을 입력하세요"
                disabled={loading}
                required
              />
            </div>
            <div className="pr-create-field">
              <label className="pr-create-label">설명</label>
              <textarea
                className="pr-create-textarea"
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="PR 설명을 입력하세요 (선택)"
                rows={4}
                disabled={loading}
              />
            </div>
            {error && <div className="pr-create-error">{error}</div>}
            <div className="pr-create-actions">
              <button type="button" className="pr-create-cancel" onClick={onClose} disabled={loading}>취소</button>
              <button type="submit" className="pr-create-submit" disabled={loading || !title.trim() || head === base}>
                {loading ? '생성 중...' : 'PR 생성'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function PullRequestsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const pid = Number(projectId)
  const [searchParams] = useSearchParams()
  const targetPrNumber = searchParams.get('pr') ? Number(searchParams.get('pr')) : null

  const [tab, setTab] = useState<TabState>('open')
  const [pulls, setPulls] = useState<PullRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [counts, setCounts] = useState<Record<TabState, number>>({ open: 0, draft: 0, merged: 0, closed: 0 })
  const [showCreateModal, setShowCreateModal] = useState(false)

  function loadPulls() {
    setLoading(true)
    getProjectPullsApi(pid, 'all')
      .then(res => {
        const all = res.data.data
        setCounts({
          open:   all.filter(p => p.state === 'OPEN').length,
          draft:  all.filter(p => p.state === 'DRAFT').length,
          merged: all.filter(p => p.state === 'MERGED').length,
          closed: all.filter(p => p.state === 'CLOSED').length,
        })
        setPulls(all)

        if (targetPrNumber) {
          const target = all.find(p => p.number === targetPrNumber)
          if (target) {
            setTab(target.state.toLowerCase() as TabState)
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadPulls()
  }, [pid])

  const filtered = pulls.filter(p => p.state === tab.toUpperCase())

  function handleCreated(pr: PullRequest) {
    setPulls(prev => [pr, ...prev])
    setCounts(prev => ({ ...prev, open: prev.open + 1 }))
    setTab('open')
  }

  return (
    <div className="pr-page">
      <div className="pr-header">
        <div className="pr-title-row">
          <GitPrIcon />
          <h2 className="pr-title">Pull Requests</h2>
        </div>
        <button className="pr-create-btn" onClick={() => setShowCreateModal(true)}>
          + PR 생성
        </button>
      </div>

      <div className="pr-tabs">
        {(Object.keys(TAB_LABELS) as TabState[]).map(t => (
          <button
            key={t}
            className={`pr-tab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {TAB_LABELS[t]}
            <span className="pr-tab-count">{counts[t]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="pr-loading">로딩 중...</div>
      ) : filtered.length === 0 ? (
        <div className="pr-empty">{TAB_LABELS[tab]} PR이 없습니다.</div>
      ) : (
        <div className="pr-list">
          {filtered.map(pr => (
            <PrItem key={pr.number} pr={pr} projectId={pid} onMerged={loadPulls} autoOpen={pr.number === targetPrNumber} />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreatePrModal
          projectId={pid}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
