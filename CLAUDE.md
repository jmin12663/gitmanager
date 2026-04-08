# CLAUDE.md — AI Agent 지시서

> 이 파일은 Claude Code가 매 작업마다 자동으로 읽는 컨텍스트야.
> 코드를 생성하기 전에 반드시 이 파일 전체를 숙지해.
> 세부 계획은 CAPSTONE_PLAN.md, ERD는 docs/ERD.md, API 명세는 docs/API.md 참조.

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
- branch 생성 Webhook → 미연결 카드 자동 생성 (status: TODO)
- branch에 commit push → 연결된 카드 status: IN_PROGRESS 로 변경
- main branch로 merge → 연결된 카드 status: DONE 으로 변경 + merge 시간 기록

**Webhook 처리 로직**
```
POST /api/webhook/github 수신
→ X-Hub-Signature-256 헤더로 GitHub Secret 검증 (검증 실패 시 403)
→ event 타입 분기
   └── "create" (branch 생성): card_branch 조회 → 없으면 미연결 카드 생성
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

### 프로젝트 ↔ 유저 다대다
```
user_project: user_id, project_id, role (OWNER / MEMBER)
→ 사이드바 조회: SELECT projects WHERE user_id = :userId
→ OWNER만 프로젝트 삭제 / 팀원 강퇴 가능
```

### 팀원 초대 (초대 코드 방식)
```
프로젝트 생성 시 6자리 랜덤 초대 코드 자동 발급
→ projects 테이블: invite_code UNIQUE 컬럼
→ OWNER만 코드 조회/재발급 가능
→ 팀원이 코드 입력 시 user_project에 MEMBER로 추가
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

```sql
-- 회원 (created_at, updated_at은 BaseEntity가 자동 관리)
users: id, login_id UNIQUE, email UNIQUE, password, name, email_verified

-- 이메일 인증 토큰 (회원가입 시 발급, 인증 완료 후 삭제)
email_verification_tokens: id, user_id, token, expires_at, created_at

-- Refresh Token (1차: is_used 미사용, 8주차 RTR 적용 시 활성화)
refresh_tokens: id, user_id, token_hash, is_used, expires_at, created_at

-- 프로젝트
projects: id, name, description, start_date, end_date, created_by, invite_code UNIQUE

-- 유저-프로젝트 (다대다, 복합 PK)
user_project: user_id, project_id, role (OWNER/MEMBER)
  PRIMARY KEY (user_id, project_id)

-- GitHub 연동 (project_id가 PK이자 FK, PAT는 Jasypt 암호화, 키는 환경변수 AES_SECRET_KEY)
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

## 6. 4월 14일 시연 준비 — "시연 준비 시작" 이라고 하면 아래 순서대로 구현 시작

> 시연 목표: 다른 컴퓨터에서 회원가입 → 이메일 인증 → 로그인 → AWS RDS에 BCrypt 암호화된 비밀번호 저장 확인

### 준비 상태
- [ ] Step 1: AWS RDS 연결
- [ ] Step 2: 서버 외부 노출 (ngrok)
- [ ] Step 3: 이메일 인증 흐름 테스트
- [ ] Step 4: 전체 시연 흐름 최종 검증

### Step 1 — AWS RDS 연결
**작업 내용:**
1. `application.yaml` datasource URL을 RDS 엔드포인트로 변경
   - `jdbc:mysql://{RDS_ENDPOINT}:3306/gitmanager?serverTimezone=Asia/Seoul&characterEncoding=UTF-8`
   - URL은 환경변수 `DB_URL`로 분리 권장
2. `application-local.yaml`에서 DB username/password를 RDS 계정으로 변경
3. RDS 보안 그룹에서 로컬 IP 인바운드 3306 허용 확인
4. 서버 실행 후 `ddl-auto: update`로 테이블 자동 생성 확인

**확인 방법:** 서버 기동 로그에 Hibernate DDL 실행 확인 + AWS RDS 콘솔 쿼리 편집기에서 `SHOW TABLES;`

### Step 2 — EC2 배포 (추후 본 배포에도 그대로 재활용)
**작업 내용:**
1. EC2 인스턴스 생성 (Amazon Linux 2 / t2.micro)
2. 보안 그룹 인바운드 규칙: 8080(서버), 22(SSH) 허용
3. 탄력적 IP 할당 → 고정 IP로 시연 (세션 끊겨도 URL 유지)
4. EC2에 Java 설치 후 jar 배포
   - `./gradlew bootJar` → `build/libs/*.jar` 생성
   - `scp`로 EC2에 전송 후 실행
5. 환경변수(`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `AES_SECRET_KEY`, `MAIL_USERNAME`, `MAIL_PASSWORD`) EC2에 설정
6. RDS 보안 그룹에서 EC2의 프라이빗 IP 인바운드 3306 허용

**시연 URL 형태:** `http://{EC2_탄력적IP}:8080/api/auth/register`

### Step 3 — 이메일 인증 흐름 테스트
**현재 구조:** 회원가입 후 이메일 인증 필수 (`isEmailVerified()` 체크) → 미인증 상태로 로그인 시 `EMAIL_NOT_VERIFIED` 에러 발생

**테스트 시나리오:**
1. `POST /api/auth/register` → 이메일 수신 확인
2. `GET /api/auth/verify-email?token=...` → 인증 완료
3. `POST /api/auth/login` → 성공 확인
4. RDS에서 `SELECT login_id, password FROM users;` → `$2a$...` BCrypt 형태 확인

### Step 3.5 — 시연용 HTML 폼 제작
**작업 내용:**
- 단일 HTML 파일 (`demo.html`) 작성 — 별도 서버 불필요, 브라우저에서 바로 열기
- 회원가입 폼: loginId, email, password, name 입력 → `POST /api/auth/register`
- 이메일 인증 안내 문구 표시 (인증 후 로그인 가능 안내)
- 로그인 폼: identifier(아이디 or 이메일), password 입력 → `POST /api/auth/login`
- 로그인 성공 시 사용자 이름 표시
- EC2 URL을 fetch 대상으로 설정 (`http://{EC2_탄력적IP}:8080`)
- CORS 허용 Origin에 `null` 또는 로컬 파일 origin 추가 필요

### Step 4 — 최종 검증 체크리스트
- [ ] 다른 컴퓨터에서 `demo.html` 열어 회원가입 요청 성공
- [ ] 이메일 인증 메일 수신 및 인증 완료
- [ ] 로그인 후 사용자 이름 화면에 표시 확인
- [ ] AWS RDS 콘솔에서 암호화된 비밀번호(`$2a$...`) 직접 확인

---

## 7. 현재 구현 상태

> 작업 완료 시 이 섹션을 직접 업데이트해.

- [x] 프로젝트 세팅 (Spring Boot 3.5.12, MySQL 연결)
- [x] BaseEntity, ApiResponse, GlobalExceptionHandler 공통 클래스
- [x] CORS 설정 (WebMvcConfigurer)
- [x] 기능 1: 회원 관리 + JWT (1차: RT 저장/만료 검증)
  - [x] 기능 2: 팀 프로젝트 관리 (초대 코드 방식)
- [x] 기능 3: 개인 ToDo
- [ ] 기능 4: Develop Board
- [ ] 기능 5: GitHub Webhook 연동
- [ ] 기능 1 (2차): RTR 추가 적용
- [ ] 기능 6: 캘린더
- [ ] 기능 7: 대시보드
- [ ] Docker 빌드
- [ ] AWS 배포
  - [ ] 배포 전 체크: RefreshToken 쿠키에 `setSecure(true)`, `setSameSite("Strict")` 추가 (AuthService.java - setRefreshTokenCookie)
  - [ ] 배포 전 체크: `application.yaml` `show-sql: true` → `false` 로 변경 (또는 배포용 프로파일에서 override)

---
