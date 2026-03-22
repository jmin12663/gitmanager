# 캡스톤 프로젝트 — Git 연동 협업 관리 플랫폼

> Claude Code에서 이 파일을 열고 "CAPSTONE_PLAN.md를 참고해서 ~를 구현해줘" 형태로 사용하면 돼.

---

## 프로젝트 개요

**취지**: GitHub를 사용하다 보면 작업 진행 상황, 담당자, 다음에 할 일이 파악하기 어려움.
이를 해결하기 위한 Git 연동 팀 협업 관리 플랫폼.(한 개 프로젝트에 단일 repo 기준)

**기간**: 2025년 3월 23일~ 6월 6일 (11주)

**목표**: 취업 포트폴리오 + 학교 캡스톤 과제

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 백엔드 | Spring Boot 3.5.12, Spring Security, JPA (Hibernate) |
| 인증 | JWT (Access Token + Refresh Token) |
| 데이터베이스 | MySQL (로컬), AWS RDS (배포) |
| 이미지 저장 | AWS S3 |
| 클라우드 배포 | Docker + AWS EC2 |
| GitHub 연동 | GitHub Webhook + REST API (PAT 방식) |
| 이메일 발송 | Gmail SMTP (회원가입 인증 전용) |
| 프론트 | React |
| 캘린더 UI | FullCalendar 라이브러리 |
| 차트 | Chart.js |
| 칸반 드래그앤드롭 | @dnd-kit/core (React 전용) |
| IDE | IntelliJ Ultimate (JetBrains 학생 무료 라이선스) |

---

## 구현 기능 목록 및 상세 설명

### 기능 1 — 회원 관리

**구현 방식**
- 회원가입 시 이메일 인증 링크 발송 (Gmail SMTP), 인증 완료 후 계정 활성화
- 비밀번호 BCrypt 해싱 저장
- 로그인 성공 시 JWT Access Token + Refresh Token 발급
- **1차 구현 (1~2주차)**: RT를 `refresh_tokens` 테이블에 저장하고 만료 여부만 검증
- **2차 구현 (8주차 이후)**: Refresh Token Rotation(RTR) 추가 적용
  - RT 사용 시 새 RT 발급 + 기존 RT 즉시 무효화 → 탈취된 RT 재사용 방지
  - `is_used` 컬럼으로 관리, 이미 사용된 RT로 갱신 시도 시 해당 계정 전체 RT 무효화 (탈취 감지)
- 모든 API 요청은 JWT로 인증 처리
- 개인정보 수정 (이름, 비밀번호 등)

**연결 기능**
- JWT 토큰이 팀 프로젝트, Board, 캘린더 등 **모든 기능의 인증 기반**
- 가장 먼저 구현해야 함

**주요 API**
```
POST /api/auth/register       회원가입
POST /api/auth/verify-email   이메일 인증
POST /api/auth/login          로그인 → JWT 발급
POST /api/auth/refresh        토큰 갱신 (1차: 만료 검증 / 2차: RTR 적용)
POST /api/auth/logout         로그아웃 (RT 무효화)
GET  /api/users/me            내 정보 조회
PUT  /api/users/me            개인정보 수정
```

---

### 기능 2 — 팀 프로젝트 관리

**구현 방식**
- 프로젝트 생성 시 왼쪽 사이드바에 아이콘으로 표시 (디스코드 구조)
- 프로젝트 클릭 시 해당 프로젝트의 Board / 캘린더 / 대시보드로 전환
- 한 사람이 여러 프로젝트에 속할 수 있음 → `user_project` 중간 테이블로 다대다 처리
- 팀원 초대: 프로젝트 생성 시 6자리 랜덤 초대 코드 자동 발급 → 팀원이 코드 입력 시 프로젝트 합류
  - 초대 코드는 OWNER만 조회 가능
  - 코드 유출 시 OWNER가 재발급 가능 (기존 코드 즉시 무효화)

**연결 기능**
- Board, 캘린더, 대시보드, GitHub 연동이 **모두 프로젝트 단위로 동작**
- 두 번째로 구현해야 함

**주요 API**
```
GET    /api/projects                             내 프로젝트 목록 (사이드바용)
POST   /api/projects                             프로젝트 생성 (초대 코드 자동 발급)
PUT    /api/projects/{id}                        프로젝트 수정
DELETE /api/projects/{id}                        프로젝트 삭제
GET    /api/projects/{id}/invite-code            초대 코드 조회 (OWNER 전용)
POST   /api/projects/{id}/invite-code/regenerate 초대 코드 재발급 (OWNER 전용)
POST   /api/projects/join                        초대 코드 입력 → 프로젝트 합류
GET    /api/projects/{id}/members                팀원 목록
DELETE /api/projects/{id}/members/{userId}       팀원 강퇴 (OWNER 전용)
```

---

### 기능 3 — 개인 ToDo 리스트

**구현 방식**
- 로그인한 사용자 개인의 할 일 목록
- 생성 / 수정 / 삭제 / 완료 체크
- 단순 CRUD, 난이도 가장 낮음

**연결 기능**
- 회원 관리(JWT 인증)에만 의존
- 다른 기능과 연결 없음 — 완전히 개인 기능

**주요 API**
```
GET    /api/todos             내 ToDo 목록 조회
POST   /api/todos             ToDo 생성
PUT    /api/todos/{id}        ToDo 수정
DELETE /api/todos/{id}        ToDo 삭제
PATCH  /api/todos/{id}/check  완료 체크 토글
```

---

### 기능 4 — Develop Board (칸반)

**구현 방식**
칸반 보드: "개발 예정 / 개발 중 / 완료" 3컬럼 구조

**카드 생성 — 두 가지 진입점 (혼합 방식)**

- **진입점 A (카드 먼저)**: 팀원이 기능 카드를 직접 생성 → branch 이름을 카드에 연결 → 이후 Webhook으로 자동 갱신
- **진입점 B (branch 먼저)**: GitHub에서 새 branch 생성 시 Webhook 수신 → 미연결 카드로 Board에 자동 생성 → 나중에 사용자가 기능 카드와 연결

**카드 자동 갱신 흐름**
```
branch에 commit push → 카드 "개발 중"으로 자동 이동 + commit 이력 표시
main에 merge         → 카드 "완료"로 자동 이동 + merge 시간 기록
```

**카드 구성 요소**
- 기능명, 연결된 branch 이름, 담당자
- 한 줄 메모
- 중간 결과 이미지 업로드 (AWS S3)
- 팀원 댓글
- commit 이력 (SHA, 메시지, 작성자, 시간)

**이미지 업로드 방식**
- 서버 중계 방식: React → 서버로 이미지 전송 → 서버가 S3에 업로드 → S3 URL을 DB cards 테이블 image_url에 저장
- 허용 확장자: jpg, jpeg, png, gif
- 파일 크기 제한: 10MB
- S3 버킷 경로: cards/{card_id}/{filename}

**연결 기능**
- 팀 프로젝트 (프로젝트 단위로 Board 존재)
- GitHub 연동 (Webhook으로 자동 갱신)
- 이미지 업로드 (AWS S3)
- 회원 관리 (담당자 지정)
- 캘린더 (카드 마감일 → 캘린더 자동 표시)

**주요 API**
```
GET    /api/projects/{id}/board             Board 전체 조회
POST   /api/projects/{id}/cards             카드 생성
PUT    /api/cards/{id}                      카드 수정
DELETE /api/cards/{id}                      카드 삭제
PATCH  /api/cards/{id}/status               카드 상태 변경
POST   /api/cards/{id}/branches             카드에 branch 연결
DELETE /api/cards/{id}/branches/{name}      카드에서 branch 연결 해제
POST   /api/cards/{id}/comments             댓글 추가
DELETE /api/cards/{card_id}/comments/{id}   댓글 삭제 (Soft Delete)
POST   /api/cards/{id}/image                이미지 업로드 (서버 → S3 중계, URL DB 저장)
GET    /api/cards/{id}/commits              카드 commit 이력
POST   /api/webhook/github                  GitHub Webhook 수신 엔드포인트
```

---

### 기능 5 — GitHub 연동

**구현 방식**
- 프로젝트 생성/설정 시 GitHub repository URL + PAT 등록
- **PAT 암호화**: AES-256-CBC 암호화 후 DB 저장. 암호화 키는 DB에 저장하지 않고 **환경변수(`AES_SECRET_KEY`)로 주입** (로컬: `.env`, 배포: EC2 환경변수 또는 AWS Secrets Manager)
- GitHub Webhook 등록 (push, create, pull_request 이벤트)
- **Webhook 보안 서명 검증**: GitHub이 전송하는 `X-Hub-Signature-256` 헤더를 HMAC-SHA256으로 검증. `webhook_secret`을 키로 payload를 서명 → 위변조된 요청 차단
  ```java
  // 검증 로직 예시
  String expected = "sha256=" + hmacSha256(rawPayload, webhookSecret);
  if (!MessageDigest.isEqual(expected.getBytes(), signature.getBytes())) {
      throw new WebhookSignatureException("Invalid signature");
  }
  ```
- **Webhook 로컬 테스트**: ngrok 대신 GitHub 레포 설정 → Webhooks → Recent Deliveries의 **Redeliver 기능** 활용 (세션 끊김 없이 과거 이벤트 재전송 가능). 초기 설정 시에만 ngrok 사용.
- **Webhook 멱등성 처리**: 동일 push 이벤트 중복 수신 시 commit_sha UNIQUE 제약으로 중복 저장 방지
- Webhook payload 파싱 → `branch_name`으로 연결된 카드 조회 → 자동 갱신

**저장 데이터**
- branch 목록
- commit 이력 (SHA, 메시지, 작성자, 시간)
- push / merge 기록

**카드 ↔ branch 연결 구조 (1카드 : N브랜치)**
```
cards 테이블: id, project_id, title, status, assignee_id, due_date, memo, image_url, is_deleted, created_by, merged_at
card_branch 테이블: card_id, branch_name, repo_name, created_at
  PRIMARY KEY (card_id, branch_name)
                    → 1카드에 여러 branch 연결 가능 (feature + hotfix 시나리오 대응)
commit_logs 테이블: id, card_id, commit_sha UNIQUE, message, author, committed_at
```

**Webhook 처리 로직**
```
Webhook 수신
  → X-Hub-Signature-256 서명 검증 (실패 시 403 반환)
  → branch_name으로 card_branch 조회
  → 연결된 카드 있음: 카드 상태 갱신 + commit_logs 저장 (commit_sha UNIQUE로 중복 방지)
  → 연결된 카드 없음: 미연결 카드 자동 생성 (Board 진입점 B)
```

**연결 기능**
- Board (카드 자동 생성 및 갱신)
- 대시보드 (GitHub 활동 데이터 반영)
- 배포 완료 이후 Webhook 실제 동작 → 배포 일정과 맞물림

**주요 API**
```
POST /api/projects/{id}/github          repository + PAT 등록
PUT  /api/projects/{id}/github          repository + PAT 수정
GET  /api/projects/{id}/github/branches branch 목록 조회
GET  /api/projects/{id}/github/commits  commit 이력 조회
POST /api/webhook/github                Webhook 수신 (public 엔드포인트)
```

---

### 기능 6 — 개발 일정 관리 캘린더

**구현 방식**
- FullCalendar 라이브러리로 UI 구성
- 프로젝트 전체 시작/마감 일정 등록
- 개별 작업 일정 등록 / 수정 / 삭제
- 사이드바에서 프로젝트 선택 시 해당 프로젝트 캘린더로 전환

**연결 기능**
- 팀 프로젝트 (프로젝트 단위 캘린더)
- Board (Board 카드의 마감일 → 캘린더에 자동 표시)

**주요 API**
```
GET    /api/projects/{id}/schedules          일정 목록 조회
POST   /api/projects/{id}/schedules          일정 등록
PUT    /api/projects/{id}/schedules/{sid}    일정 수정
DELETE /api/projects/{id}/schedules/{sid}    일정 삭제
```

---

### 기능 7 — 프로젝트 대시보드

**구현 방식**
- 프로젝트 전체 현황을 한눈에 표시
- 전체 작업 수 / 진행 중 / 완료 카드 형태로 표시
- Chart.js로 진행률 시각화
- GitHub 데이터 반영: 최근 commit 활동, 활성 branch 수
- 프로젝트 마감일까지 남은 기간 표시

**연결 기능**
- Board (작업 현황 집계)
- GitHub 연동 (commit/branch 데이터)
- 캘린더 (마감일 데이터)
- **모든 기능의 데이터를 집계하므로 가장 마지막에 구현**

**주요 API**
```
GET /api/projects/{id}/dashboard    대시보드 전체 데이터 조회
```

---

## 기능 간 의존 관계

```
회원 관리 (JWT)
    ├── 개인 ToDo        ← 독립, 회원에만 의존
    └── 팀 프로젝트 관리
            ├── Develop Board
            │       ├── GitHub 연동 (Webhook 자동 갱신)
            │       ├── 이미지 업로드 (S3)
            │       └── 캘린더 (마감일 연동)
            └── 프로젝트 대시보드  ← Board + GitHub + 캘린더 데이터 집계
```

**구현 순서 (의존 관계 기준)**
1. 회원 관리
2. 팀 프로젝트 관리
3. 개인 ToDo
4. Develop Board
5. GitHub 연동
6. 캘린더
7. 대시보드

---

## 개발 일정 (11주)

| 주차 | 기간 | 작업 |
|------|------|------|
| 1~2주 | 3/23 ~ 4/5 | Spring Boot 세팅, ERD 확정, 회원 관리 + JWT |
| 3~4주 | 4/6 ~ 4/19 | 팀 프로젝트 관리 + 팀원 초대, 개인 ToDo |
| 5~7주 | 4/20 ~ 5/10 | Develop Board (칸반 UI + 카드 CRUD) |
| 7~8주 | 5/4 ~ 5/17 | GitHub Webhook 연동 + 카드 자동 갱신, RTR 추가 |
| 9주 | 5/18 ~ 5/24 | 캘린더 (FullCalendar 연동) + 프로젝트 대시보드 |
| 10주 | 5/25 ~ 5/31 | 대시보드 마무리 + Docker 빌드 + AWS EC2/RDS 배포 |
| 11주 | 6/1 ~ 6/6 | 버그 수정, README 작성, 포트폴리오 정리 |

**체크포인트**
- 3주차 (4/12): 회원 로그인 완전히 동작
- 6주차 (5/3): Board 완성 → 중간 발표 가능
- 9주차 (5/24): GitHub Webhook 실제 동작 확인
- 11주차 (6/6): 배포 완료 + 최종 제출

---

## 제외 기능 (기간 내 리스크)

| 기능 | 제외 이유 | 비고 |
|------|-----------|------|
| 메신저 | WebSocket 필요, 구현 리스크 높음 | 배포 후 추가 고려 |
| 간트차트 | 공수 대비 효과 낮음 | 대시보드 완성 후 여유 있으면 추가 |
| GitHub OAuth | PAT 방식으로 대체 | 면접에서 "알고 있다"고 언급 가능 |

---

## DB 핵심 테이블 구조 (ERD 설계 전 초안)

```sql
-- 회원 (created_at, updated_at은 BaseEntity가 자동 관리)
users: id, email, password, name, email_verified

-- 이메일 인증 토큰 (회원가입 시 발급, 인증 완료 후 삭제)
email_verification_tokens: id, user_id, token, expires_at, created_at

-- Refresh Token (1차: is_used 미사용, 8주차 RTR 적용 시 활성화)
refresh_tokens: id, user_id, token_hash, is_used, expires_at, created_at

-- 프로젝트
projects: id, name, description, start_date, end_date, created_by, invite_code UNIQUE

-- 유저-프로젝트 (다대다, 복합 PK)
user_project: user_id, project_id, role (OWNER/MEMBER)
  PRIMARY KEY (user_id, project_id)

-- GitHub 연동 (project_id가 PK이자 FK, PAT는 AES 암호화, 키는 환경변수 관리)
project_github: project_id, repo_url, repo_name, pat_encrypted, webhook_secret
  PRIMARY KEY (project_id)

-- Board 카드
cards: id, project_id, title, status (TODO/IN_PROGRESS/DONE), assignee_id, due_date, memo, image_url, is_deleted, created_by, merged_at

-- 카드-branch 연결 (1:N, 복합 PK)
card_branch: card_id, branch_name, repo_name, created_at
  PRIMARY KEY (card_id, branch_name)

-- commit 이력 (commit_sha UNIQUE → 중복 수신 방지)
commit_logs: id, card_id, commit_sha UNIQUE, message, author, committed_at

-- 댓글
comments: id, card_id, user_id, content, created_at, is_deleted

-- 일정
schedules: id, project_id, title, start_date, end_date, created_by, card_id(nullable)

-- ToDo
todos: id, user_id, content, is_done, created_at
```

---

## 공통 구현 사항 (전체 기능 공통 적용)

### API 공통 응답 포맷
모든 API는 `ApiResponse<T>` 래퍼로 통일. 기능 구현 전에 먼저 정의할 것.
```java
// 성공
{ "success": true, "data": { ... } }

// 실패
{ "success": false, "error": { "code": "CARD_NOT_FOUND", "message": "카드를 찾을 수 없습니다." } }
```

### 전역 예외 처리
`@ControllerAdvice` + `@ExceptionHandler`로 전역 처리. 각 기능별 커스텀 예외 클래스 정의.
```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ApiResponse<?>> handleNotFound(...) { ... }

    @ExceptionHandler(WebhookSignatureException.class)
    public ResponseEntity<ApiResponse<?>> handleWebhookAuth(...) { ... }
}
```

### Soft Delete 전략
카드, 댓글 삭제 시 물리 삭제 대신 `is_deleted = true`로 처리.
연결된 commit_logs, comment가 연쇄 삭제되는 것을 방지하고 데이터 복구 가능성 확보.
JPA `@SQLRestriction("is_deleted = false")` 어노테이션으로 자동 필터링.

### React 연동 방식
- 백엔드: REST API 전용 (View 렌더링 없음, @RestController만 사용)
- CORS 전역 설정 (WebMvcConfigurer)
  → 허용 Origin: http://localhost:3000 (개발) / 배포 도메인 (배포)
- JWT 저장 방식
  → Access Token: React 메모리(변수) 저장
  → Refresh Token: httpOnly 쿠키 저장 (XSS 방어)
---

## Claude Code 활용 가이드

이 파일을 프로젝트 루트에 두고 아래처럼 활용해:

```
# ERD 설계
"CAPSTONE_PLAN.md를 참고해서 전체 ERD를 MySQL DDL로 작성해줘"

# 기능 구현
"CAPSTONE_PLAN.md의 기능 1(회원 관리)을 Spring Boot + JPA로 구현해줘"
"CAPSTONE_PLAN.md의 GitHub Webhook 수신 로직을 구현해줘"

# API 구현
"CAPSTONE_PLAN.md의 Board API를 Spring Boot Controller + Service + Repository로 구현해줘"

# 보안 관련
"CAPSTONE_PLAN.md의 Refresh Token Rotation 로직을 구현해줘"
"CAPSTONE_PLAN.md의 Webhook X-Hub-Signature-256 서명 검증 필터를 구현해줘"
"PAT AES-256 암호화/복호화 유틸 클래스를 구현해줘 (키는 환경변수에서 읽도록)"

# 공통 구현
"CAPSTONE_PLAN.md 기준으로 ApiResponse 래퍼와 GlobalExceptionHandler를 구현해줘"
"card, comment 엔티티에 Soft Delete(@SQLRestriction is_deleted=false) 적용해줘"

# 특정 부분
"card_branch 연결 테이블 기반으로 Webhook payload 파싱 로직 작성해줘"
"JWT 필터 체인 설정해줘"
```
