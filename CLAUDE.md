# CLAUDE.md — AI Agent 지시서

> 모르는 건 임의로 구현 금지. 구현 전 반드시 이 파일 숙지.
> 코드 구현 후 구현된 내용을 검토하여 쓰레기 코드가 생성되지 않았는지 확인하기(생성되었다면 적절한 조치)
> 백엔드 구현 시 DB ERD → docs/ERD.md 참조.

## 0. 작업 원칙

1. **실질적으로 필요한가?** 동작에 이득이 없으면 수정하지 않는다.
2. **가독성이 나빠지지 않는가?** 추상화가 의도를 불명확하게 만들면 하지 않는다.
3. **수정 범위가 명확한가?** 영향받는 파일·호출부 파악 후 사용자에게 먼저 설명, 허락 받고 수정.

현재 코드가 명확하고 동작에 문제없다면 그대로 두는 것도 올바른 판단이다.

---

## 1. 프로젝트 개요

Git 연동 팀 협업 관리 플랫폼. 왼쪽 사이드바에서 프로젝트 선택 → Board / 캘린더 / 대시보드 전환 구조.

**핵심 기능 7가지**
1. 회원 관리 (JWT 인증)
2. 팀 프로젝트 관리 (사이드바, 6자리 초대 코드)
3. 개인 ToDo 리스트
4. Develop Board (칸반 + GitHub 자동 연동)
5. GitHub OAuth + Webhook 연동
6. 개발 일정 관리 캘린더
7. 프로젝트 대시보드

---

## 2. 기술 스택

```
Backend  : Spring Boot 3.5.12, Spring Security, JPA (Hibernate)
Auth     : JWT (Access Token + Refresh Token), BCrypt
Database : MySQL (로컬) / AWS RDS (배포)
Storage  : AWS S3 (서버 중계 방식 이미지 업로드)
Deploy   : Docker + AWS EC2
Frontend : React 19 + TypeScript, Vite, Tailwind CSS v4
Libs     : FullCalendar, Chart.js, @dnd-kit/core, @stomp/stompjs + sockjs-client
Email    : Gmail SMTP (회원가입 인증 전용)
Encrypt  : Jasypt (GitHub OAuth access token 암호화 — PBEWITHHMACSHA512ANDAES_256)
RealTime : Spring WebSocket (STOMP) — 엔드포인트 /ws, SimpleBroker /topic
```

---

## 3. 코딩 규칙

### 패키지 구조
기능별 패키지로 분리. 절대 계층형으로 만들지 말 것.

```
com.capstone.gitmanager
├── auth/ ├── project/ ├── todo/ ├── board/
├── github/ ├── calendar/ ├── dashboard/
└── common/
    ├── config/    (SecurityConfig, JwtConfig, CorsConfig 등)
    ├── exception/ (GlobalExceptionHandler)
    └── util/
```

### Entity
- 도메인 Entity는 `BaseEntity` 상속 (createdAt, updatedAt 자동 관리)
  - 예외: 불변 토큰 엔티티 (RefreshToken, PreEmailVerification 등)는 `createdAt`만 수동 선언
- 구조상 불필요하면 상속 안 함
- `@NoArgsConstructor(access = PROTECTED)` 필수
- Lombok: `@Getter`만. `@Setter` 금지
- `@ToString` 연관관계 필드 제외

### DTO
- Request: `@Valid` 검증
- Response: `record` 권장
- 변환은 DTO 내 `from()` 정적 메서드. Entity를 Controller까지 올리지 말 것.

### Service
- `@Transactional(readOnly = true)` 기본, 쓰기만 `@Transactional`
- 비즈니스 로직은 Service에만. 예외는 `CustomException` + `ErrorCode` enum.

### API 응답 형식
```
성공: { "success": true,  "data": { ... } }
실패: { "success": false, "error": { "code": "USER_NOT_FOUND", "message": "..." } }
```

### Security
- JWT 검증은 `JwtAuthenticationFilter`에서만
- Webhook(`/api/webhook/**`)은 JWT 제외, GitHub Secret으로 검증
- CSRF 비활성화
- GitHub OAuth access token: Jasypt 암호화, 알고리즘 `PBEWITHHMACSHA512ANDAES_256`, 키 환경변수 `AES_SECRET_KEY`

### React 연동
- `@RestController`만 사용 (View 렌더링 없음)
- CORS: localhost:5173 (개발) / 배포 도메인
- Access Token: 메모리 저장 / Refresh Token: httpOnly 쿠키

### 네이밍
- API URL: 소문자 + 하이픈 (`/api/project-members`)
- 테이블명: snake_case 복수형 (`users`, `commit_logs`)

---

## 4. 핵심 도메인 로직

### Board 카드 ↔ GitHub branch 연동
> 테이블 스키마 → docs/ERD.md

**카드 생성 진입점**
- A (카드 먼저): 카드 생성 → branch 이름 연결 → Webhook 자동 갱신
- B (branch 먼저): branch 생성 Webhook → 미연결 카드 자동 생성 (IN_PROGRESS)

**카드 상태 자동 전환**
- branch 생성 → 미연결 카드 자동 생성 (IN_PROGRESS)
- commit push → 연결 카드가 BACKLOG이면 IN_PROGRESS
- main merge → DONE + merge 시간 기록

**Webhook 처리 (`POST /api/webhook/github`)**
```
X-Hub-Signature-256 검증 (실패 → 403)
"create"        → card_branch 없으면 미연결 카드 생성 (IN_PROGRESS)
"delete"        → card_branch 레코드 제거 (카드 유지)
"push"          → IN_PROGRESS 전환 + commit_logs 저장 (SHA UNIQUE로 중복 방지)
"pull_request"  → merged=true → DONE + merge 시간 기록
```

**수동 GitHub 동기화 (`POST /api/projects/{projectId}/github/sync`)**
- Webhook 누락 시 수동 반영. 열린 브랜치 → 미연결 카드 생성, merge된 PR → DONE. 중복 처리 방지.
- 프론트: 설정 페이지 "GitHub 불러오기" 버튼

### WebSocket 실시간 업데이트

**토픽**: `/topic/projects/{projectId}/board`

**이벤트 타입**
- `CARD_CREATED` / `CARD_UPDATED` / `CARD_STATUS_CHANGED` — card 필드에 CardSummaryResponse
- `CARD_DELETED` — cardId 필드만
- `COMMENT_COUNT_CHANGED` — cardId + commentCount
- `PR_REVIEW_UPDATED` — cardId만 (프론트에서 PR 패널 재조회 트리거)

**브로드캐스트**: `TransactionSynchronizationManager.afterCommit()` 내에서 실행
- CardService: 카드 생성/수정/상태변경/삭제 후
- CommentService: 댓글 생성/삭제 후
- WebhookService: 카드 자동 생성·전환 후, `pull_request_review` → `PR_REVIEW_UPDATED`

**JWT 인증**: STOMP CONNECT `Authorization: Bearer {token}` (`WebSocketChannelInterceptor`)
**SpaController**: `/ws/**` 경로는 catch-all에서 제외됨

### PR 기능 (GitHub API 프록시)

PR 데이터는 DB 저장 안 함. 백엔드가 GitHub API 중계.

```
GET  /api/projects/{projectId}/cards/{cardId}/pulls      → 카드 브랜치별 PR + reviewer
GET  /api/projects/{projectId}/pulls?state=all           → 프로젝트 전체 PR + reviewer
GET  /api/projects/{projectId}/pulls/{prNumber}/files    → 변경 파일 + patch
POST /api/projects/{projectId}/pulls/{prNumber}/comments → 라인 코멘트 GitHub 등록
```

- 모든 메서드: `validateMember` → `projectGithubRepository` → Jasypt 복호화 토큰으로 GitHub API 호출
- `RestClient` 필드 선언 (thread-safe)
- `pull_request_review` Webhook → `PR_REVIEW_UPDATED` WebSocket 브로드캐스트

### JWT 인증 흐름
Access Token (1h) + Refresh Token (7d) 발급. 만료 시 `POST /api/auth/refresh`. 둘 다 만료 시 재로그인.

---

## 5. 배포
배포 절차, EC2 명령어 → docs/DEPLOY.md 참조

## 6. 프론트엔드 가이드
폴더 구조, 라우트, 인증 흐름 → docs/FRONTEND.md 참조

## 7. 현재 구현 상태
기능별 완료 현황 → STATUS.md 참조