# CLAUDE.md — AI Agent 지시서

> 이 파일은 Claude Code가 매 작업마다 자동으로 읽는 컨텍스트야.
> 코드를 생성하기 전에 반드시 이 파일 전체를 숙지해.
> 세부 계획은 CAPSTONE_PLAN.md, ERD는 docs/ERD.md 참조.

> **작업 시작 전 필수 파일 로드 규칙**
> - 백엔드(Entity/Repository/Service/Controller) 작업 시: 코드 작성 전 반드시 `docs/ERD.md`
> - 프론트엔드(React 컴포넌트/페이지/API 연동) 작업 시: 코드 작성 전 반드시 `docs/FRONTEND.md`
> - 배포(Docker/EC2/환경변수) 작업 시: 반드시 `docs/DEPLOY.md` 를 읽을 것

## 0. 작업 원칙 — 수정 전 반드시 확인

코드를 수정하기 전에 아래 질문을 스스로 먼저 해.

1. **실질적으로 필요한가?** 일관성·규칙 준수 목적만이라면 신중히 판단. 동작에 실질적 이득이 없으면 수정하지 않는 게 나을 수 있다.
2. **가독성이 나빠지지 않는가?** 중복 제거·추상화가 오히려 의도를 불명확하게 만들면 하지 않는다.
3. **수정 범위가 명확한가?** 영향받는 파일과 호출부를 먼저 파악하고, 사용자에게 결과를 먼저 설명한 뒤 허락을 받아 수정한다.

> 무조건 "Best Practice"를 적용하지 말 것. 현재 코드가 충분히 명확하고 파악할 수 있고 동작에 문제없다면 그대로 두는 것도 올바른 판단이다.

---

## 1. 프로젝트 개요

Git 연동 팀 협업 관리 플랫폼. (한 개 프로젝트에 단일 repo 기준)
GitHub를 쓰다 보면 누가 뭘 하는지, 진행 상황이 어떤지 파악이 어렵다는 문제를 해결.
디스코드처럼 왼쪽 사이드바에서 프로젝트를 선택하면 해당 프로젝트의 Board / 캘린더 / 대시보드로 전환되는 구조.

**핵심 기능 7가지 (구현 순서)**
1. 회원 관리 (JWT 인증 — 모든 기능의 기반)
2. 팀 프로젝트 관리 (사이드바 구조, 6자리 초대 코드)
3. 개인 ToDo 리스트
4. Develop Board (칸반 + GitHub 자동 연동)
5. GitHub Webhook 연동
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
Frontend : React
Libs     : FullCalendar (캘린더), Chart.js (차트), @dnd-kit/core (드래그앤드롭)
Email    : Gmail SMTP (회원가입 인증 전용)
Encrypt  : Jasypt (PAT 암호화 — 알고리즘: PBEWITHHMACSHA512ANDAES_256)
```

---

## 3. 코딩 규칙 — 반드시 따를 것

### 패키지 구조
기능별 패키지로 분리. 절대 계층형(controller/service/repository 최상위)으로 만들지 말 것.

```
com.capstone.gitmanager
├── auth/
│   ├── controller/
│   ├── service/
│   ├── repository/
│   ├── dto/
│   └── entity/
├── project/
├── todo/
├── board/
├── github/
├── calendar/
├── dashboard/
└── common/
    ├── config/        (SecurityConfig, JwtConfig, CorsConfig 등)
    ├── exception/     (GlobalExceptionHandler)
    └── util/
```

### Entity 작성 규칙
- 도메인 Entity는 `BaseEntity` 상속 (createdAt, updatedAt 자동 관리)
  - 예외: 생성 후 수정이 없는 불변 토큰 엔티티 (RefreshToken, EmailVerificationToken 등)는 `createdAt`만 수동 선언
- 구조 상 'BaseEntity'가 필요없다면 상속하지 않는다
- `@NoArgsConstructor(access = PROTECTED)` 필수
- 연관관계 편의 메서드는 Entity 안에 작성
- Lombok 사용: `@Getter`만. `@Setter` 절대 금지
- `@ToString`에 연관관계 필드 제외 (`exclude` 사용)

```java
// BaseEntity 예시
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity {
    @CreatedDate
    private LocalDateTime createdAt;
    @LastModifiedDate
    private LocalDateTime updatedAt;
}
```

### DTO 규칙
- Request DTO: `@Valid` 어노테이션으로 검증
- Response DTO: `record` 사용 권장
- Entity ↔ DTO 변환은 DTO 안에 `from()` 정적 메서드로 처리
- Entity를 Controller까지 올리지 말 것

```java
// Response DTO 예시
public record ProjectResponse(
    Long id,
    String name,
    String description
) {
    public static ProjectResponse from(Project project) {
        return new ProjectResponse(project.getId(), project.getName(), project.getDescription());
    }
}
```

### Service 규칙
- `@Transactional(readOnly = true)` 기본, 쓰기 작업만 `@Transactional`
- 비즈니스 로직은 Service에만. Controller는 DTO 변환과 응답 반환만
- 예외는 커스텀 예외 클래스 사용 (`CustomException` + `ErrorCode` enum)

### API 응답 형식
모든 API는 아래 형식으로 통일. 절대 다른 형식 쓰지 말 것.

```json
// 성공
{
  "success": true,
  "data": { ... }
}

// 실패
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "사용자를 찾을 수 없습니다."
  }
}
```

```java
// ApiResponse 클래스
public record ApiResponse<T>(boolean success, T data, ErrorResponse error) {
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null);
    }
    public static ApiResponse<?> fail(ErrorCode code) {
        return new ApiResponse<>(false, null, new ErrorResponse(code));
    }
}
```

### Security 규칙
- JWT 검증은 `JwtAuthenticationFilter`에서만 처리
- `SecurityConfig`에서 permitAll 경로 명시적으로 관리
- Webhook 엔드포인트(`/api/webhook/**`)는 JWT 인증 제외, GitHub Secret으로 검증
- REST API이므로 `SecurityConfig`에서 CSRF 비활성화 (`csrf.disable()`)
- GitHub PAT 암호화: Jasypt `StringEncryptor` 사용
  → 알고리즘: `PBEWITHHMACSHA512ANDAES_256` (반드시 명시, 기본값 DES는 취약)
  → 암호화 키: 환경변수 `AES_SECRET_KEY` 로 주입 (로컬: `.env`, 배포: EC2 환경변수)
  ```yaml
  jasypt:
    encryptor:
      password: ${AES_SECRET_KEY}
      algorithm: PBEWITHHMACSHA512ANDAES_256
      iv-generator-classname: org.jasypt.iv.RandomIvGenerator
  ```

### React 연동 규칙
- 백엔드: REST API 전용 (View 렌더링 없음, `@RestController`만 사용)
- CORS 전역 설정 (WebMvcConfigurer)
  → 허용 Origin: http://localhost:3000 (개발) / 배포 도메인 (배포)
- JWT 저장 방식
  → Access Token: React 메모리(변수) 저장
  → Refresh Token: httpOnly 쿠키 저장 (XSS 방어)

### 네이밍 규칙
- API URL: 소문자 + 하이픈 (`/api/project-members`)
- 변수/메서드: camelCase
- 상수: UPPER_SNAKE_CASE
- 테이블명: snake_case 복수형 (`users`, `commit_logs`)

---

## 4. 핵심 도메인 로직 — 반드시 숙지

### Board 카드 ↔ GitHub branch 연동 구조
```
cards         : id, project_id, title, status, assignee_id, due_date, memo, image_url, is_deleted, created_by, merged_at
card_branch   : card_id, branch_name, repo_name, created_at  ← 복합 PK(card_id, branch_name)
commit_logs   : id, card_id, commit_sha UNIQUE, message, author, committed_at
```

**카드 생성 — 두 가지 진입점**
- 진입점 A (카드 먼저): 팀원이 카드 생성 → branch 이름 연결 → Webhook으로 자동 갱신
- 진입점 B (branch 먼저): GitHub branch 생성 Webhook 수신 → 미연결 카드 자동 생성

**카드 상태 자동 전환 규칙**
- branch 생성 Webhook → 미연결 카드 자동 생성 (status: IN_PROGRESS) — 브랜치 생성 자체가 개발 시작을 의미
- branch에 commit push → 연결된 카드가 BACKLOG이면 IN_PROGRESS 로 변경 (진입점 A 대응)
- main branch로 merge → 연결된 카드 status: DONE 으로 변경 + merge 시간 기록

**Webhook 처리 로직**
```
POST /api/webhook/github 수신
→ X-Hub-Signature-256 헤더로 GitHub Secret 검증 (검증 실패 시 403)
→ event 타입 분기
   └── "create" (branch 생성): card_branch 조회 → 없으면 미연결 카드 생성 (status: IN_PROGRESS)
   └── "push"  (commit push) : branch_name으로 카드 조회 → IN_PROGRESS 전환 + commit_logs 저장
                               commit_sha UNIQUE 제약으로 중복 수신 방지
   └── "pull_request" (merge): merged=true 확인 → DONE 전환 + merge 시간 기록
```

### JWT 인증 흐름
```
로그인 → Access Token (1시간) + Refresh Token (7일) 발급
→ 모든 요청 헤더: Authorization: Bearer {accessToken}
→ Access Token 만료 시 → POST /api/auth/refresh 로 갱신
  1차: 만료 여부만 검증
  2차 (8주차 이후): RTR 적용 — RT 사용 시 새 RT 발급 + 기존 RT 즉시 무효화
→ Refresh Token도 만료 시 → 재로그인
```

### 이미지 업로드 (서버 중계 방식)
```
React → 서버로 이미지 전송
→ 서버가 S3에 업로드
→ S3 URL을 DB cards 테이블 image_url에 저장
- 허용 확장자: jpg, jpeg, png, gif
- 파일 크기 제한: 10MB
- S3 버킷 경로: cards/{card_id}/{filename}
```

### Soft Delete 전략
```
카드, 댓글 삭제 시 is_deleted = true 처리
JPA @SQLRestriction("is_deleted = false") 자동 필터링
연결된 commit_logs, comment 보존
```

---

## 5. DB 핵심 테이블 구조

상세 스키마 → docs/ERD.md 참조

핵심 관계 요약:
- `user_project`: 복합 PK (user_id, project_id), role = OWNER/MEMBER — OWNER만 프로젝트 삭제·강퇴·초대코드 재발급 가능
- `card_branch`: 복합 PK (card_id, branch_name)
- `card_assignees`: 복합 PK (card_id, user_id)
- `commit_logs`: commit_sha UNIQUE → 중복 Webhook 방지
- `project_github`: project_id가 PK이자 FK, PAT는 Jasypt 암호화 (AES_SECRET_KEY)

---

## 6. 배포
배포 절차, EC2 기동 명령어, 시연 순서 → docs/DEPLOY.md 참조

---

## 7. 현재 구현 상태

> **Claude에게**: 기능 구현을 완료하면 반드시 이 섹션의 체크박스를 직접 업데이트할 것. 사용자가 요청하지 않아도 자동으로 수행한다.

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
  - [x] commit push → 커밋 이력 저장
  - [x] PR merge (main/master) → 카드 DONE 전환
- [ ] 기능 1 (2차): RTR 추가 적용
- [x] 기능 6: 캘린더 (일정 CRUD, 기간 조회)
- [x] 기능 7: 대시보드 (카드 현황 요약, 최근 커밋 10개, 멤버별 담당 카드 수)
- [x] SpaController — React SPA 클라이언트 라우팅 지원 (`/login`, `/board` 등 새로고침 시 index.html 반환)
- [x] SecurityConfig permitAll 수정 — `/assets/**`, `/favicon.svg`, `/icons.svg` 추가 (비로그인 React 앱 로드 보장)
- [ ] Docker 빌드
- [ ] AWS 배포 (배포 전 체크리스트 → docs/DEPLOY.md)

**프론트엔드** — 상세 설계·디자인 시스템 → `docs/FRONTEND.md`

- [x] 프로젝트 세팅 (Vite + React + Tailwind v4 + shadcn/ui)
- [x] 모노레포 구조 전환 (`gitmanager/frontend/`) + 빌드 outDir → `../src/main/resources/static`
- [ ] 기능 1: 로그인 / 회원가입 / 이메일 인증 페이지
- [ ] 기능 2: 사이드바 + 팀 프로젝트 관리
- [ ] 기능 3: 개인 ToDo 페이지
- [ ] 기능 4: Develop Board (칸반)
- [ ] 기능 6: 캘린더 페이지
- [ ] 기능 7: 대시보드 페이지
- [ ] 기능 8: 프로젝트 설정 (GitHub 연동, 멤버 관리, 초대코드)
- [ ] 배포

---
