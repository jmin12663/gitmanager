# 현재 구현 상태

> 기능 구현을 완료하면 반드시 이 파일의 체크박스를 직접 업데이트할 것. 사용자가 요청하지 않아도 자동으로 수행한다.

## 백엔드

- [x] 프로젝트 세팅 (Spring Boot 3.5.12, MySQL 연결)
- [x] BaseEntity, ApiResponse, GlobalExceptionHandler 공통 클래스
- [x] CORS 설정 (CorsConfigurationSource 빈 등록 + SecurityConfig .cors() 위임 — Spring Security 필터 레벨에서 처리)
- [x] 기능 1: 회원 관리 + JWT (1차: RT 저장/만료 검증)
  - [x] `POST /api/auth/send-email-code` — 이메일 인증코드 전송 (PreEmailVerification 엔티티)
  - [x] `POST /api/auth/verify-email-code` — 이메일 인증코드 확인
  - [x] `POST /api/auth/register` — 회원가입
  - [x] `POST /api/auth/login` — 로그인 (미인증 계정 → `/verify?email=xxx` 자동 리다이렉트)
  - [x] `POST /api/auth/refresh` — Access Token 재발급
  - [x] `POST /api/auth/logout` — 로그아웃 (Refresh Token 무효화)
  - [x] `GET /api/auth/me` — 세션 복구용 (userId, loginId, name, email 반환)
  - [x] `PATCH /api/auth/me` — 프로필 수정 (name)
  - [x] `PATCH /api/auth/password` — 비밀번호 변경
  - [x] `GET /api/auth/check-login-id` — 아이디 중복 확인
  - [x] `PATCH /api/auth/login-id` — 아이디 변경
- [x] 기능 2: 팀 프로젝트 관리 (초대 코드 방식)
- [x] 기능 3: 개인 ToDo
- [x] 기능 4: Develop Board (카드 CRUD, 담당자, 댓글, Branch 연결, 카드 수정 시 담당자 변경, 카드에 댓글 수 배지 표시)
  - [x] 카드 CRUD (생성/조회/수정/삭제/상태변경)
  - [x] 담당자 다대다 (card_assignees)
  - [x] 댓글 CRUD (soft delete, 작성자만 삭제)
  - [x] Branch 연결/해제
  - [x] Comment 엔티티 BaseEntity 상속 (createdAt/updatedAt JPA Auditing 자동 처리)
  - [x] 카드 dueDate ↔ 캘린더 일정 양방향 자동 연동 (linked_schedule_id)
  - [ ] 이미지 업로드 (S3) — 추후 구현
- [x] 기능 5: GitHub Webhook 연동
  - [x] ProjectGithub 엔티티 / GitHub 연동 설정 API (OWNER 전용, PAT Jasypt 암호화)
  - [x] Webhook 수신 처리 (X-Hub-Signature-256 검증)
  - [x] branch 생성 → 카드 자동 생성 (IN_PROGRESS)
  - [x] branch 삭제 → card_branch 연결 제거
  - [x] commit push → 커밋 이력 저장
  - [x] PR merge (main/master) → 카드 DONE 전환
- [ ] 기능 1 (2차): RTR 추가 적용
- [x] 기능 6: 캘린더 (일정 CRUD, 기간 조회)
  - [x] 캘린더 일정 수정/삭제 → 연결된 카드 dueDate 양방향 동기화
- [x] 기능 7: 대시보드 (카드 현황 요약, 최근 커밋 10개, 멤버별 담당 카드 수)
- [x] SpaController — React SPA 클라이언트 라우팅 지원 (`/login`, `/board` 등 새로고침 시 index.html 반환)
- [x] SecurityConfig permitAll 수정 — `/assets/**`, `/favicon.svg`, `/icons.svg` 추가 (비로그인 React 앱 로드 보장)
- [x] WebSocket 실시간 업데이트 (Spring WebSocket STOMP + SockJS)
  - [x] `WebSocketConfig` — STOMP 엔드포인트 `/ws`, SimpleBroker `/topic`
  - [x] `WebSocketChannelInterceptor` — STOMP CONNECT 시 JWT 검증
  - [x] `BoardWebSocketService` — `/topic/projects/{projectId}/board` 브로드캐스트
  - [x] 카드 생성/수정/상태변경/삭제 → 트랜잭션 커밋 후 이벤트 발행
  - [x] 댓글 생성/삭제 → 댓글 수 변경 이벤트 발행
  - [x] Webhook 카드 자동 생성/상태 전환 → 실시간 반영
  - [x] `PR_REVIEW_UPDATED` 이벤트 — `pull_request_review` Webhook 수신 시 카드 PR 패널 자동 갱신
- [x] PR 기능 (GitHub API 프록시 — DB 저장 없음, GitHub에서 실시간 조회)
  - [x] 4-1: 카드 상세 PR 패널 (`GET /api/projects/{projectId}/cards/{cardId}/pulls`) — 브랜치별 PR + reviewer(APPROVED/CHANGES_REQUESTED/PENDING) 표시
  - [x] 4-2: PR 목록 전용 페이지 (`GET /api/projects/{projectId}/pulls?state=all`) — Open/Draft/Merged/Closed 탭 필터
  - [x] 4-3: `pull_request_review` Webhook → `PR_REVIEW_UPDATED` WebSocket 브로드캐스트 → 카드 PR 패널 자동 갱신
  - [x] 4-4: Diff 뷰어 (`GET /api/projects/{projectId}/pulls/{prNumber}/files`) — 파일별 unified diff 렌더링 (추가/삭제/컨텍스트 색상 구분)
  - [x] 4-5: 라인 코멘트 (`POST /api/projects/{projectId}/pulls/{prNumber}/comments`) — diff 라인 hover "+" 버튼 → 인라인 폼 → GitHub에 반영
- [ ] Docker 빌드
- [ ] AWS 배포 (배포 전 체크리스트 → docs/DEPLOY.md)

## 프론트엔드

- [x] 프로젝트 세팅 (Vite + React + Tailwind v4 + shadcn/ui)
- [x] 모노레포 구조 전환 (`gitmanager/frontend/`) + 빌드 outDir → `../src/main/resources/static`
- [x] 기능 1: 로그인 / 회원가입 / 이메일 인증 페이지
- [x] 기능 2: 사이드바 + 팀 프로젝트 관리
- [x] 기능 3: 개인 ToDo 페이지 - 할일 목록(조회/추가/체크/삭제), 탭 필터(전체 / 미완료 / 완료)
  - 참고: 백엔드에 priority/dueDate 없음 → createdAt 기준 날짜 표시, priority pill 미구현
- [x] 기능 4: Develop Board (칸반) — 3컬럼 칸반, DnD 상태변경, 카드 생성/상세/삭제, 댓글 CRUD, WebSocket 실시간 동기화
- [x] 기능 6: 캘린더 페이지 — 월별 그리드, 연/월 피커, 일정 추가(날 클릭)/삭제
- [x] 기능 7: 대시보드 페이지 — 메트릭 카드 4개, 최근 커밋 피드, 도넛 차트, 멤버 바 차트
- [x] 기능 8: 프로젝트 설정 — GitHub 연동(등록/재설정/불러오기), 초대코드(복사/재생성), 멤버 관리(목록/추방/탈퇴), 프로젝트 삭제
- [x] 프로필 페이지 — 이름 수정, 아이디 수정(중복 확인 → 저장), 비밀번호 변경

### 공통 인프라 (완료)
- [x] `src/index.css` — `--gm-*` 디자인 토큰 + auth/sidebar/topbar/todo CSS 전체
- [x] `src/api/client.ts` — axios + Bearer 헤더 + 401 자동 refresh
- [x] `src/api/auth.ts` — login / register / sendEmailCode / verifyEmailCode / getMe / logout / updateProfile / checkLoginId / updateLoginId / changePassword
- [x] `src/api/project.ts` — getMyProjects / createProject / joinProject / getProject / getProjectMembers / updateProject
- [x] `src/api/todo.ts` — getTodos / createTodo / toggleTodo / deleteTodo
- [x] `src/api/board.ts` — getBoard / createCard / getCard / updateCard / updateCardStatus / deleteCard / getComments / createComment / deleteComment / addBranch / removeBranch
- [x] `src/hooks/useBoardSocket.ts` — STOMP WebSocket 연결/구독/재연결 훅 (BoardPage에서 사용)
- [x] `src/api/calendar.ts` — getSchedules / createSchedule / updateSchedule / deleteSchedule
- [x] `src/api/dashboard.ts` — getDashboard
- [x] `src/types/board.ts`, `calendar.ts`, `dashboard.ts` — 타입 정의
- [x] `src/api/settings.ts` — getInviteCode / regenerateInviteCode / getMembers / kickMember / leaveProject / deleteProject / getGithubConfig / getOAuthRedirectUrl
- [x] `src/components/AppLayout.tsx` — 사이드바 + topbar + Outlet (미인증 시 /login 리다이렉트)
- [x] `src/store/` — AuthContext + AuthProvider (세션 복구)
- [x] `src/types/project.ts` — Project, ProjectRole

- [x] `src/api/pullrequest.ts` — getCardPullsApi / getProjectPullsApi / getPullFilesApi / createPrCommentApi
- [x] `src/types/pullrequest.ts` — PullRequest / PullFile / ReviewerInfo / CreatePrCommentBody
- [ ] 배포