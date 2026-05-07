# CLAUDE.md — AI Agent 지시서

> 이 파일은 Claude Code가 매 작업마다 자동으로 읽는 컨텍스트야.
> 코드를 생성하기 전에 반드시 이 파일 전체를 숙지해.
> 모르는건 임의로 구현 금지
> 구현하기 전 무조건 보고 먼저 할 것 
> 백엔드 구현시 데이터 베이스 ERD는 docs/ERD.md 참조.

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
Libs     : FullCalendar (캘린더), Chart.js (차트), @dnd-kit/core (드래그앤드롭)
Email    : Gmail SMTP (회원가입 인증 전용)
Encrypt  : Jasypt (GitHub OAuth access token 암호화 — 알고리즘: PBEWITHHMACSHA512ANDAES_256)
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
  - 예외: 생성 후 수정이 없는 불변 토큰 엔티티 (RefreshToken, PreEmailVerification 등)는 `createdAt`만 수동 선언
- 구조 상 'BaseEntity'가 필요없다면 상속하지 않는다
- `@NoArgsConstructor(access = PROTECTED)` 필수
- 연관관계 편의 메서드는 Entity 안에 작성
- Lombok 사용: `@Getter`만. `@Setter` 절대 금지
- `@ToString`에 연관관계 필드 제외 (`exclude` 사용)

### DTO 규칙
- Request DTO: `@Valid` 어노테이션으로 검증
- Response DTO: `record` 사용 권장
- Entity ↔ DTO 변환은 DTO 안에 `from()` 정적 메서드로 처리
- Entity를 Controller까지 올리지 말 것

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

### Security 규칙
- JWT 검증은 `JwtAuthenticationFilter`에서만 처리
- `SecurityConfig`에서 permitAll 경로 명시적으로 관리
- Webhook 엔드포인트(`/api/webhook/**`)는 JWT 인증 제외, GitHub Secret으로 검증
- REST API이므로 `SecurityConfig`에서 CSRF 비활성화 (`csrf.disable()`)
- GitHub OAuth access token 암호화: Jasypt `StringEncryptor` 사용
  → 알고리즘: `PBEWITHHMACSHA512ANDAES_256` 필수 (기본값 DES 취약)
  → 암호화 키: 환경변수 `AES_SECRET_KEY`

### React 연동 규칙
- 백엔드: REST API 전용 (View 렌더링 없음, `@RestController`만 사용)
- CORS 전역 설정 (WebMvcConfigurer)
  → 허용 Origin: http://localhost:5173 (개발) / 배포 도메인 (배포)
- JWT 저장 방식
  → Access Token: React 메모리(변수) 저장
  → Refresh Token: httpOnly 쿠키 저장 (XSS 방어)

### 네이밍 규칙
- API URL: 소문자 + 하이픈 (`/api/project-members`)
- 테이블명: snake_case 복수형 (`users`, `commit_logs`)

---

## 4. 핵심 도메인 로직 — 반드시 숙지

### Board 카드 ↔ GitHub branch 연동 구조
> 테이블 상세 스키마는 docs/ERD.md 참조.

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
   └── "delete" (branch 삭제): card_branch 연결 레코드 제거 (카드는 유지)
   └── "push"  (commit push) : branch_name으로 카드 조회 → IN_PROGRESS 전환 + commit_logs 저장
                               commit_sha UNIQUE 제약으로 중복 수신 방지
   └── "pull_request" (merge): merged=true 확인 → DONE 전환 + merge 시간 기록
```

**수동 GitHub 동기화 (`POST /api/projects/{projectId}/github/sync`)**
- OAuth 연동 중간부터 플랫폼을 도입하거나 Webhook 누락 발생 시 수동으로 GitHub 현재 상태를 Board에 반영
- 열려있는 브랜치 → 미연결 카드 자동 생성 (IN_PROGRESS), 커밋 로그 저장
- main/master로 merge된 PR → 연결 카드 DONE 처리
- 이미 연결된 브랜치 및 저장된 커밋 SHA는 중복 처리 방지
- 프론트: 설정 페이지 GitHub 연동 섹션의 "GitHub 불러오기" 버튼

### JWT 인증 흐름
```
로그인 → Access Token (1시간) + Refresh Token (7일) 발급
→ 모든 요청 헤더: Authorization: Bearer {accessToken}
→ Access Token 만료 시 → POST /api/auth/refresh 로 갱신
→ Refresh Token도 만료 시 → 재로그인
```

---

## 5. 배포
배포 절차, EC2 기동 명령어, 시연 순서 → docs/DEPLOY.md 참조

---

## 6. 프론트엔드 구현 가이드
폴더 구조, 레이아웃, 라우트, 인증 흐름, API 규칙 → docs/FRONTEND.md 참조

---

## 7. 현재 구현 상태
기능별 완료 현황 및 세부 체크리스트 → STATUS.md 참조
