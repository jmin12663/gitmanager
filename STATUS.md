# 현재 구현 상태

> 기능 구현을 완료하면 반드시 이 파일의 체크박스를 직접 업데이트할 것. 사용자가 요청하지 않아도 자동으로 수행한다.

## 백엔드

- [x] 프로젝트 세팅 (Spring Boot 3.5.12, MySQL 연결)
- [x] BaseEntity, ApiResponse, GlobalExceptionHandler 공통 클래스
- [x] CORS 설정 (WebMvcConfigurer)
- [x] 기능 1: 회원 관리 + JWT (1차: RT 저장/만료 검증)
  - [x] UX 개선: 로그인 시 이메일 미인증 계정 → `/verify?email=xxx`로 자동 리다이렉트 (loginId 입력 시에도 실제 이메일 자동 전달)
  - [x] `GET /api/auth/me` — 페이지 새로고침 후 세션 복구용 (userId, loginId, name, email 반환)
- [x] 기능 2: 팀 프로젝트 관리 (초대 코드 방식)
- [x] 기능 3: 개인 ToDo
- [x] 기능 4: Develop Board
  - [x] 카드 CRUD (생성/조회/수정/삭제/상태변경)
  - [x] 담당자 다대다 (card_assignees)
  - [x] 댓글 CRUD (soft delete, 작성자만 삭제)
  - [x] Branch 연결/해제
  - [x] Comment 엔티티 BaseEntity 상속 (createdAt/updatedAt JPA Auditing 자동 처리)
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
- [x] 기능 7: 대시보드 (카드 현황 요약, 최근 커밋 10개, 멤버별 담당 카드 수)
- [x] SpaController — React SPA 클라이언트 라우팅 지원 (`/login`, `/board` 등 새로고침 시 index.html 반환)
- [x] SecurityConfig permitAll 수정 — `/assets/**`, `/favicon.svg`, `/icons.svg` 추가 (비로그인 React 앱 로드 보장)
- [ ] Docker 빌드
- [ ] AWS 배포 (배포 전 체크리스트 → docs/DEPLOY.md)

## 프론트엔드

- [x] 프로젝트 세팅 (Vite + React + Tailwind v4 + shadcn/ui)
- [x] 모노레포 구조 전환 (`gitmanager/frontend/`) + 빌드 outDir → `../src/main/resources/static`
- [x] 기능 1: 로그인 / 회원가입 / 이메일 인증 페이지
- [x] 기능 2: 사이드바 + 팀 프로젝트 관리
- [x] 기능 3: 개인 ToDo 페이지
  - [x] 할일 목록 조회 / 추가(Enter) / 체크 토글 / 삭제
  - [x] 탭 필터 (전체 / 오늘 / 이번 주 / 완료됨)
  - 참고: 백엔드에 priority/dueDate 없음 → createdAt 기준 날짜 표시, priority pill 미구현
- [x] 기능 4: Develop Board (칸반) — 3컬럼 칸반, DnD 상태변경, 카드 생성/상세/삭제, 댓글 CRUD
- [x] 기능 6: 캘린더 페이지 — 월별 그리드, 연/월 피커, 일정 추가(날 클릭)/삭제
- [x] 기능 7: 대시보드 페이지 — 메트릭 카드 4개, 최근 커밋 피드, 도넛 차트, 멤버 바 차트
- [x] 기능 8: 프로젝트 설정 — GitHub 연동(등록/재설정), 초대코드(복사/재생성), 멤버 관리(목록/추방/탈퇴), 프로젝트 삭제

### 공통 인프라 (완료)
- [x] `src/index.css` — `--gm-*` 디자인 토큰 + auth/sidebar/topbar/todo CSS 전체
- [x] `src/api/client.ts` — axios + Bearer 헤더 + 401 자동 refresh
- [x] `src/api/auth.ts` — login / register / verifyEmail / getMe
- [x] `src/api/project.ts` — getMyProjects / createProject / joinProject
- [x] `src/api/todo.ts` — getTodos / createTodo / toggleTodo / deleteTodo
- [x] `src/api/board.ts` — getBoard / createCard / getCard / updateCard / updateCardStatus / deleteCard / getComments / createComment / deleteComment
- [x] `src/api/calendar.ts` — getSchedules / createSchedule / updateSchedule / deleteSchedule
- [x] `src/api/dashboard.ts` — getDashboard
- [x] `src/types/board.ts`, `calendar.ts`, `dashboard.ts` — 타입 정의
- [x] `src/api/settings.ts` — getInviteCode / regenerateInviteCode / getMembers / kickMember / leaveProject / deleteProject / getGithubConfig / registerGithubConfig
- [x] `src/components/AppLayout.tsx` — 사이드바 + topbar + Outlet (미인증 시 /login 리다이렉트)
- [x] `src/store/` — AuthContext + AuthProvider (세션 복구)
- [x] `src/types/project.ts` — Project, ProjectRole

- [ ] 배포