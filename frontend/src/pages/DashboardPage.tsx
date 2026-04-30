import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import type { DashboardData, MemberSummary } from '@/types/dashboard'
import { getDashboardApi } from '@/api/dashboard'

const AVATAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6']
const avatarColor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length]

const BAR_COLORS = ['#6366f1', '#10b981', '#ec4899', '#f59e0b', '#8b5cf6', '#3b82f6']

function formatCommitTime(dt: string | null): string {
  if (!dt) return ''
  const d = new Date(dt)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH = Math.floor(diffMs / 3600000)
  const diffD = Math.floor(diffMs / 86400000)
  if (diffH < 1) return '방금 전'
  if (diffH < 24) return `${diffH}시간 전`
  if (diffD < 2) return '어제'
  return `${diffD}일 전`
}

interface DonutChartProps {
  backlog: number
  inProgress: number
  done: number
  total: number
}

function DonutChart({ backlog, inProgress, done, total }: DonutChartProps) {
  const r = 38
  const circum = 2 * Math.PI * r

  function seg(count: number): number {
    if (total === 0) return 0
    return (count / total) * circum
  }

  const backlogLen = seg(backlog)
  const progressLen = seg(inProgress)
  const doneLen = seg(done)

  const segments = [
    { len: backlogLen, color: 'var(--gm-accent)', offset: 0 },
    { len: progressLen, color: 'var(--gm-amber)', offset: backlogLen },
    { len: doneLen, color: 'var(--gm-green)', offset: backlogLen + progressLen },
  ]

  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--gm-bg4)" strokeWidth="14" />
      {total > 0 && segments.map((s, i) =>
        s.len > 0 ? (
          <circle
            key={i}
            cx="50" cy="50" r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="14"
            strokeDasharray={`${s.len} ${circum - s.len}`}
            strokeDashoffset={-s.offset}
            transform="rotate(-90 50 50)"
          />
        ) : null
      )}
      <text x="50" y="55" textAnchor="middle" fontSize="14" fontWeight="600" fill="var(--gm-text1)" fontFamily="Geist Variable, sans-serif">
        {total}
      </text>
    </svg>
  )
}

interface MemberBarsProps {
  members: MemberSummary[]
}

function MemberBars({ members }: MemberBarsProps) {
  const maxCount = Math.max(...members.map(m => m.assignedCardCount), 1)

  return (
    <div className="member-bars">
      {members.map((m, i) => (
        <div key={m.userId} className="member-bar-row">
          <div className="member-bar-name" title={m.name}>{m.name}</div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{
                width: `${(m.assignedCardCount / maxCount) * 100}%`,
                background: BAR_COLORS[i % BAR_COLORS.length],
              }}
            />
          </div>
          <div className="bar-num">{m.assignedCardCount}</div>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const pid = Number(projectId)

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardApi(pid)
      .then(res => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [pid])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--gm-text3)', fontSize: 14 }}>
        로딩 중...
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--gm-text3)', fontSize: 14 }}>
        데이터를 불러올 수 없습니다.
      </div>
    )
  }

  const { cardSummary, recentCommits, members } = data

  return (
    <>
      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-label-text">전체 카드</div>
          <div className="metric-val">{cardSummary.total}</div>
          <div className="metric-sub-text">Backlog + 진행 + 완료</div>
        </div>
        <div className="metric-card">
          <div className="metric-label-text">진행 중</div>
          <div className="metric-val amber">{cardSummary.inProgress}</div>
          <div className="metric-sub-text">In Progress</div>
        </div>
        <div className="metric-card">
          <div className="metric-label-text">완료</div>
          <div className="metric-val green">{cardSummary.done}</div>
          <div className="metric-sub-text">Done</div>
        </div>
        <div className="metric-card">
          <div className="metric-label-text">완료율</div>
          <div className="metric-val indigo">{cardSummary.progressRate}%</div>
          <div className="metric-sub-text">{cardSummary.done} / {cardSummary.total} 완료</div>
        </div>
      </div>

      <div className="dash-row">
        <div className="dash-card">
          <div className="dash-card-title">카드 현황</div>
          {cardSummary.total > 0 ? (
            <div className="status-donut-wrap">
              <DonutChart
                backlog={cardSummary.backlog}
                inProgress={cardSummary.inProgress}
                done={cardSummary.done}
                total={cardSummary.total}
              />
              <div className="donut-legend">
                <div className="legend-row">
                  <span className="legend-dot" style={{ background: 'var(--gm-accent)' }} />
                  Backlog
                  <span className="legend-val">{cardSummary.backlog}</span>
                </div>
                <div className="legend-row">
                  <span className="legend-dot" style={{ background: 'var(--gm-amber)' }} />
                  In Progress
                  <span className="legend-val">{cardSummary.inProgress}</span>
                </div>
                <div className="legend-row">
                  <span className="legend-dot" style={{ background: 'var(--gm-green)' }} />
                  Done
                  <span className="legend-val">{cardSummary.done}</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--gm-text3)', fontSize: 13 }}>
              카드가 없습니다
            </div>
          )}
        </div>

        <div className="dash-card">
          <div className="dash-card-title">멤버별 담당 카드</div>
          {members.length > 0 ? (
            <MemberBars members={members} />
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--gm-text3)', fontSize: 13 }}>
              멤버 정보가 없습니다
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div className="dash-card">
          <div className="dash-card-title">최근 커밋</div>
          {recentCommits.length > 0 ? (
            <div className="commit-feed">
              {recentCommits.map((c, i) => (
                <div key={`${c.commitSha}-${i}`} className="commit-row">
                  <div className="commit-av" style={{ background: avatarColor(c.author.charCodeAt(0)) }}>
                    {c.author ? c.author[0].toUpperCase() : '?'}
                  </div>
                  <div className="commit-body">
                    <div className="commit-message">{c.message || '(메시지 없음)'}</div>
                    <div className="commit-meta">
                      {formatCommitTime(c.committedAt)}
                      {c.commitSha && (
                        <> · <span className="commit-sha">{c.commitSha.slice(0, 7)}</span></>
                      )}
                      {c.cardTitle && (
                        <> · {c.cardTitle}</>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--gm-text3)', fontSize: 13 }}>
              커밋 내역이 없습니다
            </div>
          )}
        </div>
      </div>
    </>
  )
}