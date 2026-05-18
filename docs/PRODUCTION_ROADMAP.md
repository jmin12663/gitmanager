# 실무 도구화 로드맵

> **비전: "GitHub는 코드 저장소, 이 툴은 팀 개발 워크스페이스"**
> 개발자가 GitHub를 직접 열지 않아도 기능 현황 파악 / 코드 리뷰 / 의견 조율 / 일정 관리를 이 툴 안에서 완결할 수 있게 한다.

---

## 현재 핵심 강점 (유지·강화 대상)

| 목표 | 현재 상태 |
|------|----------|
| 어느 기능이 개발 중/완료인지 | ✅ Webhook 자동 상태 전환 |
| 팀원이 수정한 부분 평가 | ❌ PR diff 뷰어 + 코드 리뷰 없음 |
| 의견 조율 | 🔺 카드 댓글만 있음 (라인 코멘트·스레드 없음) |
| 일정 관리 | ✅ 캘린더 있음 |

---

## 1순위 — 기반 인프라 (없으면 팀이 못 씀)

### 1. 배포 (Docker + EC2/RDS)
- 로컬만 동작 → 팀 협업 자체 불가
- 절차: `docs/DEPLOY.md` 참조

### 2. RTR + 비밀번호 재설정
- RTR: RT 탈취 감지 및 자동 무효화 (`is_used` 컬럼)
- 비밀번호 재설정: `POST /api/auth/forgot-password` → 이메일 링크 발송 (Gmail SMTP 재활용)
  → `POST /api/auth/reset-password` → 토큰 검증 후 새 비밀번호 저장

### 3. 멀티 repo 지원
- 현재: 프로젝트 1개 = repo 1개 (`project_github` 1:1)
- 변경: `project_github` 1:N 구조로 확장
- Webhook 수신 시 `repo_name`으로 프로젝트 매핑, 카드에 출처 repo 표시

---

## 2순위 — 핵심 비전 구현 (GitHub 대체의 핵심)

### 4. PR 기능 ★ (가장 중요) 
GitHub API를 프록시로 사용 — 데이터는 GitHub에 저장, UI는 이 툴에서 완결

> **현재 상태**: PR merge → 카드 DONE 자동전환은 구현됨 (`WebhookService.java`).
> PR 자체를 조회하거나 리뷰하는 UI 없음.

#### 4-1. 카드 상세 PR 패널 ← 가장 먼저 구현 ✅
카드 상세 모달에 PR 탭 추가. `card_branch`의 `branch_name`으로 GitHub API 조회.

```
카드 상세 모달
├── 기존 탭: 브랜치, 커밋 로그, 댓글
└── 추가 탭: PR
       ├── PR 제목 + 상태 뱃지 (Open / Draft / Merged / Closed)
       ├── Reviewer 목록 + 승인 여부 (approved / changes_requested)
       ├── CI 상태 (passing / failing)
       └── "GitHub에서 보기" 링크
```

- GitHub API: `GET /repos/{owner}/{repo}/pulls?head={branch}&state=all`
- 백엔드 추가: `GET /api/projects/{projectId}/cards/{cardId}/pulls` (GitHub API 중계)
- 프론트 수정: `BoardPage.tsx` 카드 상세 모달에 PR 탭 추가

#### 4-2. PR 목록 전용 페이지 ← 4-1 이후 ✅
사이드바에 "Pull Requests" 항목 추가. 프로젝트 전체 PR 현황 한눈에 파악.

```
사이드바: Board / Calendar / Dashboard / Pull Requests(신규)

PR 목록 페이지
├── Open PRs   (reviewer 요청 필터)
├── Draft PRs
└── Merged / Closed PRs
```

- GitHub API: `GET /repos/{owner}/{repo}/pulls?state=open|closed`
- 백엔드 추가: `GET /api/projects/{projectId}/pulls`
- 프론트 추가: `PullRequestsPage.tsx` + `App.tsx` 라우트 추가 (`/pulls`)

#### 4-3. PR Review Webhook 처리 ← 4-1~4-2 이후✅
- 현재 `pull_request` 이벤트만 수신 중 (`WebhookService.java`)
- `pull_request_review` 이벤트 추가 수신 → 카드에 "리뷰 대기 중" 상태 표시
- GitHub Webhook 설정에서 `Pull request reviews` 이벤트 체크 필요

#### 4-4. Diff 뷰어✅
- 어떤 파일의 어떤 라인이 바뀌었는지 이 툴 안에서 표시
- GitHub API: `GET /repos/{owner}/{repo}/pulls/{pr}/files`
- 프론트: unified diff 렌더링 (`react-diff-viewer` 라이브러리)

#### 4-5. 라인 코멘트✅
- Diff 특정 라인에 코멘트 작성
- GitHub API: `POST /repos/{owner}/{repo}/pulls/{pr}/comments`

#### 4-6. Approve / Request Changes
- GitHub API: `POST /repos/{owner}/{repo}/pulls/{pr}/reviews`
- 이 툴에서 버튼 클릭 → GitHub에 리뷰 반영

### 5. 리뷰 요청 알림
- PR 생성 시 담당 팀원에게 리뷰 요청 알림 (이메일 우선)
- 없으면 Slack/카톡으로 따로 알려야 함 → GitHub 이탈 발생

### 6. 스레드형 댓글 (답글)
- 현재 카드 댓글은 1depth flat 구조 (`Comment.java`)
- `parent_comment_id` 추가 → 댓글에 답글 달기
- PR 라인 코멘트도 동일한 스레드 구조로 통일

---

## 3순위 — 협업 완성도

### 8. 활동 로그 (Audit Log)
- 카드 상태 변경, 담당자 변경, 리뷰 등 "누가 언제 뭘 했는지" 추적
- `card_activities` 테이블 (card_id, user_id, action, before_value, after_value, created_at)
- 카드 상세에서 활동 타임라인 표시

---

## 4순위 — 생산성 향상

### 10. 카드 검색 + 필터
- `GET /api/projects/{id}/board?assignee=&keyword=&priority=` 쿼리 파라미터
- 프론트: 보드 상단 필터 바 (담당자 멀티셀렉트, 키워드 검색)

### 11. 카드 우선순위
- `cards` 테이블에 `priority ENUM('URGENT','HIGH','MEDIUM','LOW') DEFAULT 'MEDIUM'` 추가
- 칸반 카드에 우선순위 컬러 배지 (Urgent=빨강, High=주황, Medium=파랑, Low=회색)
- 보드 정렬 기본값: 우선순위 높은 것 위로
- 카드 필터(10번)와 연동: `?priority=URGENT` 파라미터

### 12. 카드 레이블 (Labels/Tags)
- `labels` 테이블 (id, project_id, name, color)
- `card_labels` 조인 테이블 (card_id, label_id) — N:M
- 기본 레이블 예시: `bug`(빨강), `feature`(초록), `hotfix`(주황), `docs`(파랑)
- 칸반 카드에 색상 태그 표시, 보드 필터와 연동

### 13. 카드 체크리스트 (Sub-task)
Linear의 Sub-issue, Trello의 Checklist에 해당. 카드 안에 세부 항목 체크.

```
카드: "로그인 기능 구현"
└── 체크리스트
    ├── ✅ JWT 발급 로직
    ├── ✅ Refresh Token 저장
    └── ⬜ 토큰 만료 처리
```

- `card_checklists` 테이블 (id, card_id, content, is_done, position, created_at)
- 카드 상세 모달에 체크리스트 섹션 추가
- 카드 목록에 완료율 표시 (예: `2/3`)

### 14. 마일스톤 (Milestone)

> **카드 due_date와의 차이**
> - `cards.due_date` = 개별 태스크 하나의 마감일 ("이 카드 언제까지?")
> - 마일스톤 = 여러 카드 묶음의 목표 기한 + 전체 진행률 ("이 기능 묶음 몇 % 완성?")
>
> **언제 필요한가**: 카드가 30개 이상이거나 릴리즈 단위 관리가 필요할 때 실용적.
> 팀 규모가 작고 카드 수가 적으면 카드 due_date만으로 충분.

```
마일스톤: MVP 배포 (기한: 5/20) — 진행률 60%
├── ✅ 카드: 로그인 API        due_date: 5/10
├── ✅ 카드: 칸반보드          due_date: 5/13
├── ⬜ 카드: GitHub Webhook    due_date: 5/18
└── ⬜ 카드: 대시보드          due_date: 5/19
```

**DB 설계**
```sql
milestones (
  id          BIGINT PK,
  project_id  BIGINT FK → projects.id,
  title       VARCHAR(255),
  description TEXT,
  due_date    DATE,
  status      ENUM('OPEN', 'CLOSED'),
  created_at  DATETIME,
  updated_at  DATETIME
)
-- cards 테이블에 컬럼 추가:
cards.milestone_id  BIGINT FK → milestones.id  NULL
```

**카드-마일스톤 연결 방식 (두 가지 모두 지원)**
- 카드 편집 시 마일스톤 드롭다운 선택 (Linear 방식)
- 마일스톤 상세 페이지에서 카드 검색 후 추가 (GitHub 방식)

**구현 범위**
- 백엔드: `milestones` CRUD API + `GET /api/projects/{id}/milestones/{milestoneId}/progress` (완료율)
- 프론트: 대시보드에 마일스톤별 진행률 위젯 추가

---

## 5순위 — 장기 과제

### 15. GitHub Issue 연동
- `issues` Webhook 이벤트 수신 (opened, closed)
- Issue 생성 → 카드 자동 생성, Issue close → 카드 DONE 전환

### 17. GitHub App으로 전환 (현재 OAuth App)
- 현재 문제: OAuth App 토큰 소유자 퇴사 시 Webhook 전체 먹통
- GitHub App은 조직/레포 단위 권한 → 사람에 종속되지 않음

### 18. Webhook 처리 실패 재시도
- 실패한 Webhook payload → `webhook_failures` 테이블에 저장
- 수동 재처리 API: `POST /api/webhook/retry/{id}`

### 19. 간트차트
- 마일스톤 + 카드 마감일 데이터 시각화
- 마일스톤 구현(14번) 이후 구현

---

## 구현 로드맵

```
1주차: 배포 (Docker + EC2/RDS)
2주차: RTR + 비밀번호 재설정 + 멀티 repo 지원
3주차: PR 기능 — 카드 상세 PR 패널(4-1) + PR 목록 페이지(4-2)
4주차: PR 기능 — Diff 뷰어(4-4) + PR Review Webhook(4-3)
5주차: PR 기능 — 라인 코멘트(4-5) + Approve/Request Changes(4-6) + 리뷰 요청 알림(5)
6주차: WebSocket 실시간 업데이트(7) + 스레드형 댓글(6)
7주차: 활동 로그(8) + 알림 시스템(9)
8주차: 카드 검색/필터(10) + 우선순위(11) + 레이블(12) + 체크리스트(13)
이후:  마일스톤(14), GitHub Issue 연동(15), 데이터 내보내기(16), GitHub App 전환(17), 간트차트(19)
```

---

## 경쟁 도구 대비 포지션

| 도구 | 강점 | 이 툴 대비 약점 |
|------|------|----------------|
| GitHub Projects | GitHub 내장, 무료 | 코드 리뷰와 분리, 캘린더·ToDo 없음 |
| Linear | UX 우수, 빠름 | GitHub 리뷰 통합 없음, 유료 |
| Jira | 기능 풍부 | 무겁고 복잡, GitHub 연동 별도 설정 |
| Trello | 심플, 시각적 | GitHub 연동 없음, 개발 특화 기능 부족 |
| **이 툴** | Webhook 자동화 + PR 리뷰 + 캘린더 통합 | 생태계·안정성 부족 (초기) |