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

### 4. PR 리뷰 기능 ★ (가장 중요)
GitHub API를 프록시로 사용 — 데이터는 GitHub에 저장, UI는 이 툴에서 완결

**PR 목록 조회**
- 카드 상세에서 연결된 PR 목록 표시
- GitHub API: `GET /repos/{owner}/{repo}/pulls`

**Diff 뷰어**
- 어떤 파일의 어떤 라인이 바뀌었는지 이 툴 안에서 표시
- GitHub API: `GET /repos/{owner}/{repo}/pulls/{pr}/files`
- 백엔드: GitHub API 중계 엔드포인트 추가
- 프론트: unified diff 렌더링 (react-diff-viewer 등 라이브러리)

**라인 코멘트**
- Diff 특정 라인에 코멘트 작성
- GitHub API: `POST /repos/{owner}/{repo}/pulls/{pr}/comments`

**Approve / Request Changes**
- GitHub API: `POST /repos/{owner}/{repo}/pulls/{pr}/reviews`
- 이 툴에서 버튼 클릭 → GitHub에 리뷰 반영

### 5. 리뷰 요청 알림
- PR 생성 시 담당 팀원에게 리뷰 요청 알림 (이메일 우선)
- 없으면 Slack/카톡으로 따로 알려야 함 → GitHub 이탈 발생

### 6. 스레드형 댓글 (답글)
- 현재 카드 댓글은 1depth flat 구조
- `parent_comment_id` 추가 → 댓글에 답글 달기
- PR 라인 코멘트도 동일한 스레드 구조로 통일

---

## 3순위 — 협업 완성도

### 7. WebSocket 실시간 업데이트
- 다른 팀원 카드 이동 → 새로고침 없이 즉시 반영
- Spring WebSocket (STOMP) + `@stomp/stompjs`
- 프로젝트 단위 토픽으로 카드 상태 변경·댓글 이벤트 브로드캐스트

### 8. 활동 로그 (Audit Log)
- 카드 상태 변경, 담당자 변경, 리뷰 등 "누가 언제 뭘 했는지" 추적
- `card_activities` 테이블 (card_id, user_id, action, before_value, after_value, created_at)
- 카드 상세에서 활동 타임라인 표시

### 9. 알림 시스템
- 이메일 (Gmail SMTP 재활용) → Slack Incoming Webhook 순
- 트리거 이벤트: PR merge, 담당자 지정, 댓글, 리뷰 요청

---

## 4순위 — 생산성 향상

### 10. 카드 검색 + 필터
- `GET /api/projects/{id}/board?assignee=&keyword=&priority=` 쿼리 파라미터
- 프론트: 보드 상단 필터 바 (담당자 멀티셀렉트, 키워드 검색)

### 11. 카드 우선순위 (HIGH / MEDIUM / LOW)
- `cards` 테이블에 `priority ENUM('HIGH','MEDIUM','LOW') DEFAULT 'MEDIUM'` 추가
- 칸반 카드에 우선순위 컬러 배지, 보드 정렬 기본값: 우선순위 높은 것 위로

### 12. 스프린트 / 마일스톤
- `sprints` 테이블 추가 (name, start_date, end_date, project_id)
- 카드에 `sprint_id` FK → 스프린트별 보드 필터
- 대시보드에 현재 스프린트 번다운 차트 추가

### 13. 카드 마감일 → 캘린더 자동 연동
- 카드 생성/수정 시 `due_date` 있으면 `schedules` 테이블 자동 레코드 생성
- 카드 삭제 시 연결된 일정도 삭제

---

## 5순위 — 장기 과제

### 14. GitHub Issue 연동
- `issues` Webhook 이벤트 수신 (opened, closed)
- Issue 생성 → 카드 자동 생성, Issue close → 카드 DONE 전환

### 15. 데이터 내보내기 (CSV / JSON)
- `GET /api/projects/{id}/export?format=csv` — 카드 전체 목록 다운로드
- 도구 전환 시 데이터 이식성 확보

### 16. GitHub App으로 전환 (현재 OAuth App)
- 현재 문제: OAuth App 토큰 소유자 퇴사 시 Webhook 전체 먹통
- GitHub App은 조직/레포 단위 권한 → 사람에 종속되지 않음

### 17. Webhook 처리 실패 재시도
- 실패한 Webhook payload → `webhook_failures` 테이블에 저장
- 수동 재처리 API: `POST /api/webhook/retry/{id}`

### 18. 간트차트
- 스프린트 + 카드 마감일 데이터 시각화
- 스프린트 구현 이후 구현

---

## 구현 로드맵

```
1주차: 배포 (Docker + EC2/RDS)
2주차: RTR + 비밀번호 재설정 + 멀티 repo 지원
3주차: PR 리뷰 — Diff 뷰어 + 라인 코멘트
4주차: PR 리뷰 — Approve/Request Changes + 리뷰 요청 알림
5주차: WebSocket 실시간 업데이트 + 스레드형 댓글
6주차: 활동 로그 + 알림 시스템
7주차: 카드 검색/필터 + 우선순위 + 스프린트
이후:  GitHub Issue 연동, 데이터 내보내기, GitHub App 전환, 간트차트
```

---

## 경쟁 도구 대비 포지션

| 도구 | 강점 | 이 툴 대비 약점 |
|------|------|----------------|
| GitHub Projects | GitHub 내장, 무료 | 코드 리뷰와 분리, 캘린더·ToDo 없음 |
| Linear | UX 우수, 빠름 | GitHub 리뷰 통합 없음, 유료 |
| Jira | 기능 풍부 | 무겁고 복잡, GitHub 연동 별도 설정 |
| **이 툴** | Webhook 자동화 + PR 리뷰 + 캘린더 통합 | 생태계·안정성 부족 (초기) |