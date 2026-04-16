# Code Explanation

> 구현된 파일에 대한 설명을 누적합니다. `/exp-code` 명령으로 업데이트됩니다.

---

# 설정 파일 & 배포

## src/main/resources/application.yaml
**역할**: 공통 설정 파일. 데이터소스, JPA, Mail, JWT, Jasypt, CORS, 쿠키, 서버 포트를 정의. 민감값은 환경변수로 주입.
**주요 설정**: `datasource.url`(localhost MySQL 기본), `show-sql: true`(로컬 개발용), `server.port: 8080`, `cookie.secure: false`(로컬 HTTP 환경)
**플로우**: 앱 시작 → `application.yaml` 로드 → 활성 프로파일(`-Dspring.profiles.active=prod`)에 따라 `application-prod.yaml`로 오버라이드
**특이사항**: 프로파일 지정 없으면 localhost MySQL 기준으로 동작. `cookie.secure: false`는 로컬 HTTP 개발 환경용이며 배포 시 prod 프로파일에서 `true`로 오버라이드됨

---

## src/main/resources/application-prod.yaml
**역할**: EC2 배포 환경 전용 설정. `application.yaml`의 로컬 설정을 오버라이드한다.
**주요 설정**: `DB_HOST` 환경변수로 RDS 엔드포인트 주입, `show-sql: false`, Mail/JWT/Jasypt 환경변수 주입, `cookie.secure: true`(HTTPS 배포 환경)
**플로우**: `-Dspring.profiles.active=prod` 실행 → `application-prod.yaml` 오버라이드 적용 → EC2에서 RDS 연결
**특이사항**: `.gitignore`에 등록되어 있음 — 비밀값이 포함되므로 절대 커밋 금지. EC2 배포 시 직접 파일 업로드. `cookie.secure: true`로 HTTPS 환경에서만 RT 쿠키 전송 보장

---

## Dockerfile
**역할**: Spring Boot JAR를 실행하는 Docker 이미지 빌드 파일.
**주요 설정**: `eclipse-temurin:21-jre-jammy` 베이스 이미지, `build/libs/*.jar`를 `app.jar`로 복사, `spring.profiles.active=prod`로 실행
**플로우**: `./gradlew build` → JAR 생성 → `docker build` → 이미지 빌드 → EC2에서 실행
**특이사항**: 현재 JAR 직접 배포 방식을 사용 중이므로 선택적 사용. Docker 미사용 시 `java -Dspring.profiles.active=prod -jar app.jar`로 직접 실행

---

## src/main/java/com/capstone/gitmanager/common/config/SpaController.java
**역할**: React SPA의 클라이언트 사이드 라우팅을 지원하는 Spring MVC 컨트롤러. `/login`, `/board` 등 직접 접근·새로고침 시 `index.html`을 반환한다.
**주요 클래스/메서드**:
- `forward()` — `/`, `/{path}`, `/{path}/**` 패턴 요청을 `forward:/index.html`로 전달
**의존성**: 없음 (`@Controller`만 사용)
**플로우**: 브라우저 직접 접근 → SpaController → `forward:/index.html` → React Router가 클라이언트에서 라우팅 처리
**특이사항**: `/api/**`, `/static/**` 경로는 정규식 제외 패턴으로 매핑에서 제외. React 빌드 산출물은 `src/main/resources/static/`에 위치 (`npm run build` 시 자동 출력)

---

# 시연용 Static HTML (4월 14일 1차 시연 전용)

## src/main/resources/static/register.html
**역할**: 회원가입 시연용 HTML 페이지. 디자인 없이 입력 폼만 구성.
**주요 동작**: name/loginId/email/password 입력 → `POST /api/auth/register` 호출 → 성공 시 `verify.html?email=...`로 자동 이동
**플로우**: 브라우저 → `http://<EC2_IP>:8080/register.html` → `/api/auth/register` API 호출 → `verify.html` 이동
**특이사항**: React 프론트 개발 완료 후 삭제 예정. API 호출 시 상대 경로 사용으로 EC2 배포 후 별도 설정 불필요

---

## src/main/resources/static/verify.html
**역할**: 이메일 인증 코드 입력 시연용 HTML 페이지.
**주요 동작**: email/code 입력 → `POST /api/auth/verify-email` 호출 → 성공 시 `login.html`로 자동 이동. URL 파라미터로 이메일 자동 채움.
**플로우**: `register.html` 성공 → `verify.html?email=...` → `/api/auth/verify-email` 호출 → `login.html` 이동
**특이사항**: React 프론트 개발 완료 후 삭제 예정

---

## src/main/resources/static/login.html
**역할**: 로그인 시연용 HTML 페이지. 로그인 성공 시 서버 응답(accessToken 포함)을 화면에 출력.
**주요 동작**: identifier(아이디 or 이메일)/password 입력 → `POST /api/auth/login` 호출 → 성공 시 `data`(userId, name, email, accessToken)를 `<pre>`로 출력
**플로우**: `verify.html` 성공 → `login.html` → `/api/auth/login` 호출 → 응답 JSON 화면 표시
**특이사항**: 이메일 미인증(`EMAIL_NOT_VERIFIED`) 에러 시 응답의 `data.email`로 `verify.html?email=...`에 자동 이동. loginId로 로그인해도 서버가 실제 이메일을 반환하므로 인증 페이지에서 이메일 자동 입력됨. React 프론트 개발 완료 후 삭제 예정

---

# 앱 진입점

## GitmanagerApplication.java
**역할**: Spring Boot 애플리케이션 진입점. JPA Auditing과 `@ConfigurationProperties` 스캔을 활성화한다.
**주요 어노테이션**:
- `@EnableJpaAuditing` — BaseEntity의 `createdAt`, `updatedAt` 자동 관리 활성화
- `@ConfigurationPropertiesScan` — `JwtProperties` 등 `@ConfigurationProperties` 빈 자동 등록
**플로우**: 앱 시작 → `JwtProperties` 빈 등록 → `BaseEntity` Auditing 활성화 → 전체 빈 초기화

---

# Common (공통)

## common/entity/BaseEntity.java
**역할**: 모든 Entity가 상속하는 추상 클래스. 생성/수정 시간을 자동으로 관리한다.
**주요 필드**:
- `createdAt` — 엔티티 최초 저장 시 자동 기록
- `updatedAt` — 엔티티 수정 시 자동 갱신
**의존성**: `AuditingEntityListener` (Spring Data JPA)
**플로우**: `GitmanagerApplication(@EnableJpaAuditing)` → 각 Entity 클래스에서 `extends BaseEntity` → JPA 저장/수정 시 자동 주입

---

## common/config/CorsConfig.java
**역할**: React 프론트엔드와의 CORS를 전역 설정한다.
**주요 동작**:
- `/api/**` 경로에 대해 허용 Origin, 메서드, 헤더, 쿠키 자격증명을 설정
- 허용 Origin은 `cors.allowed-origins`에서 주입 (기본값: `http://localhost:3000`)
**플로우**: React 요청 → Spring MVC CORS 필터 → `CorsConfig.addCorsMappings()` 검증 → 컨트롤러 도달

---

## common/config/SecurityConfig.java
**역할**: Spring Security 필터 체인 설정. REST API 전용으로 CSRF 비활성화, 세션리스 구성.
**주요 동작**:
- CSRF 비활성화, 세션 정책 STATELESS
- `permitAll` 경로: `/api/auth/register`, `/api/auth/verify-email`, `/api/auth/login`, `/api/auth/refresh`, `/api/webhook/**`, `/`, `/assets/**`, `/favicon.svg`, `/icons.svg`
- 나머지 요청은 인증 필요
- `JwtAuthenticationFilter`를 `UsernamePasswordAuthenticationFilter` 앞에 등록
- `BCryptPasswordEncoder` 빈 등록
**의존성**: `JwtUtil`, `JwtAuthenticationFilter`
**플로우**: 모든 HTTP 요청 → `JwtAuthenticationFilter`(Bearer 파싱) → `SecurityFilterChain`(permitAll 분기) → 컨트롤러
**특이사항**: `/assets/**`를 permitAll에 추가 — Spring Security 6은 static 리소스도 필터를 통과하므로 비로그인 사용자가 React JS/CSS 번들을 로드할 수 있도록 명시적 허용 필요. `SpaController`가 index.html을 포워딩하면 브라우저가 `/assets/*`를 별도 요청하기 때문.

---

## common/config/JwtProperties.java
**역할**: `application.yaml`의 `jwt.*` 설정값을 바인딩하는 불변 설정 레코드.
**주요 필드**:
- `secret` — JWT 서명 키
- `accessExpiration` — Access Token 만료 시간 (ms)
- `refreshExpiration` — Refresh Token 만료 시간 (ms)
**플로우**: `application.yaml(jwt.*)` → `JwtProperties` 바인딩 → `JwtUtil`에서 주입받아 토큰 생성/검증에 사용

---

## common/config/JwtAuthenticationFilter.java
**역할**: 모든 요청에서 `Authorization: Bearer {token}` 헤더를 파싱해 SecurityContext에 인증 정보를 주입하는 필터.
**주요 동작**: 토큰 검증 성공 시 `UsernamePasswordAuthenticationToken(userId)`를 SecurityContext에 등록
**의존성**: `JwtUtil`
**플로우**: HTTP 요청 → `JwtAuthenticationFilter` → `JwtUtil.validate()` → `SecurityContextHolder.setAuthentication()` → 이후 필터 체인 진행
**특이사항**: 검증 실패 시 예외를 던지지 않고 조용히 무시 — 인증 강제는 SecurityConfig의 `authorizeHttpRequests`가 담당

---

## common/util/JwtUtil.java
**역할**: JWT Access/Refresh Token 생성 및 검증 유틸리티.
**주요 메서드**:
- `generateAccessToken(Long userId)` — 1시간 만료 Access Token 생성
- `generateRefreshToken(Long userId)` — 7일 만료 Refresh Token 생성
- `validate(String token)` — 토큰 유효성 검증 (만료/위변조 구분)
- `getUserId(String token)` — subject에서 userId 추출
**의존성**: `JwtProperties`
**플로우**: `AuthService` → `JwtUtil.generate*()` / `JwtAuthenticationFilter` → `JwtUtil.validate()` → `getUserId()`
**특이사항**: 만료 시 `TOKEN_EXPIRED`, 위변조 시 `INVALID_TOKEN` 예외로 구분

---

## common/dto/ApiResponse.java
**역할**: 모든 API 응답의 통일된 래퍼 레코드.
**주요 메서드**:
- `ok(T data)` — 성공 응답 (`success: true`, data 포함)
- `ok()` — 데이터 없는 성공 응답
- `fail(ErrorCode)` — 실패 응답 (`success: false`, error 포함)
- `fail(ErrorCode, T data)` — 실패이지만 data도 함께 반환 (예: 이메일 미인증 시 이메일 주소 포함)
**플로우**: 컨트롤러 → `ApiResponse.ok()` 또는 `GlobalExceptionHandler` → `ApiResponse.fail()` → HTTP 응답 바디

---

## common/dto/ErrorResponse.java
**역할**: 오류 응답 본문에 담기는 에러 코드와 메시지를 담는 레코드.
**주요 필드**: `code`, `message`
**플로우**: `GlobalExceptionHandler` → `ApiResponse.fail(ErrorCode)` → `ErrorResponse(code, message)` → 응답 바디의 `error` 필드

---

## common/exception/ErrorCode.java
**역할**: 도메인별 에러 코드를 열거형으로 관리. HTTP 상태코드, 코드 문자열, 메시지를 함께 정의.
**주요 카테고리**: Common / Auth(`EMAIL_ALREADY_EXISTS`, `LOGIN_ID_ALREADY_EXISTS` 등) / User / Project(`NEW_OWNER_REQUIRED` 등) / Card / GitHub / File / Schedule / Todo
**플로우**: 서비스 레이어 → `throw new CustomException(ErrorCode.XXX)` → `GlobalExceptionHandler`가 읽어 HTTP 상태 및 메시지 결정

---

## common/exception/CustomException.java
**역할**: `ErrorCode`를 감싸는 커스텀 런타임 예외. 서비스 레이어에서 비즈니스 예외 발생 시 사용.
**의존성**: `ErrorCode`
**플로우**: 서비스 레이어 → `throw new CustomException(ErrorCode.XXX)` → `GlobalExceptionHandler.handleCustomException()` → `ApiResponse.fail()` → HTTP 응답

---

## common/exception/GlobalExceptionHandler.java
**역할**: 전역 예외 처리기. 모든 컨트롤러에서 발생한 예외를 `ApiResponse` 형식으로 변환해 응답한다.
**처리 예외**:
- `CustomException` — 비즈니스 예외, 해당 HTTP 상태코드로 응답
- `MethodArgumentNotValidException` — `@Valid` 검증 실패, 400 응답
- `Exception` — 그 외 모든 예외, 500 응답
**의존성**: `ApiResponse`, `ErrorCode`, `ErrorResponse`
**플로우**: 예외 발생 → `@RestControllerAdvice` 가로챔 → 예외 타입 분기 → `ApiResponse.fail()` → HTTP 응답

---

# 기능 1: 회원 관리

## auth/entity/User.java
**역할**: 회원 정보를 저장하는 핵심 엔티티. `users` 테이블에 매핑된다.
**주요 필드**: `id`(PK, 자동증가), `loginId`(unique, 로그인용 아이디), `email`(unique), `password`(BCrypt), `name`, `emailVerified`
**주요 메서드**: `verifyEmail()` — 이메일 인증 완료 시 `emailVerified = true`로 변경
**플로우**: `AuthService.register()` → `User.builder()` 생성 → DB 저장 → `AuthService.verifyEmail()` → `user.verifyEmail()`

---

## auth/entity/EmailVerificationToken.java
**역할**: 회원가입 시 발급되는 이메일 인증 토큰. 30분 유효, 인증 완료 후 삭제된다.
**주요 필드**: `token`(6자리 숫자 코드), `expiresAt`, `user`(FK)
**주요 메서드**: `isExpired()` — 현재 시각과 `expiresAt` 비교
**플로우**: `AuthService.register()` → 6자리 코드 생성 및 저장 → `EmailService`로 발송 → `AuthService.verifyEmail()` → 이메일+코드로 토큰 검증 후 삭제

---

## auth/entity/RefreshToken.java
**역할**: 로그인 시 발급된 Refresh Token을 SHA-256 해시로 저장하는 엔티티.
**주요 필드**: `tokenHash`, `isUsed`, `expiresAt`, `user`(FK)
**주요 메서드**: `isExpired()` — 만료 여부 확인
**플로우**: `AuthService.login()` → RT 발급 → `hash(RT)` → DB 저장 → `AuthService.refresh()` → `hash(쿠키RT)`로 조회 및 검증
**특이사항**: 실제 토큰이 아닌 해시값만 저장해 DB 탈취 시 토큰 재사용 불가

---

## auth/repository/UserRepository.java
**역할**: User 엔티티 CRUD + 이메일/아이디 기반 조회 및 존재 여부 확인.
**주요 메서드**: `existsByEmail(String)`, `existsByLoginId(String)`, `findByEmail(String)`, `findByLoginId(String)`
**플로우**: `AuthService` → `UserRepository` → MySQL `users` 테이블

---

## auth/repository/EmailVerificationTokenRepository.java
**역할**: 이메일 인증 토큰 조회 및 유저 기준 일괄 삭제.
**주요 메서드**: `findByUser_EmailAndToken(String email, String token)`, `deleteByUser(User)`
**플로우**: `AuthService.verifyEmail()` → `findByUser_EmailAndToken(email, code)` → 검증 → `deleteByUser()` 삭제

---

## auth/repository/RefreshTokenRepository.java
**역할**: Refresh Token 해시 기반 조회 및 유저 기준 일괄 삭제.
**주요 메서드**: `findByTokenHash(String)`, `deleteByUser(User)`
**플로우**: `AuthService.refresh()/logout()` → `findByTokenHash()` → 검증/삭제

---

## auth/dto/RegisterRequest.java
**역할**: 회원가입 요청 DTO. `@Valid`로 입력값 검증.
**주요 필드**: `name`(`@NotBlank`), `loginId`(`@Size(5~20)`, 영문+숫자만), `email`(`@Email`), `password`(`@Size min=8`)
**플로우**: HTTP 요청 바디 → `AuthController.register(@Valid)` → `AuthService.register()`

---

## auth/dto/EmailVerifyRequest.java
**역할**: 이메일 인증 요청 DTO. 이메일 주소와 6자리 인증 코드를 함께 전달한다.
**주요 필드**: `email`(`@Email`, `@NotBlank`), `code`(`@NotBlank`, `@Size(min=6, max=6)`)
**플로우**: HTTP 요청 바디 → `AuthController.verifyEmail(@Valid)` → `AuthService.verifyEmail()`

---

## auth/dto/LoginRequest.java
**역할**: 로그인 요청 DTO. 아이디 또는 이메일 모두 허용.
**주요 필드**: `identifier`(아이디 or 이메일), `password`
**플로우**: HTTP 요청 바디 → `AuthController.login(@Valid)` → `AuthService.login()` → `resolveUser(identifier)`

---

## auth/dto/LoginResponse.java
**역할**: 로그인 성공 응답 DTO. Access Token을 바디로, Refresh Token은 쿠키로 전달.
**주요 필드**: `userId`, `name`, `email`, `accessToken`
**플로우**: `AuthService.login()` → `LoginResponse` 생성 → `ApiResponse.ok(LoginResponse)` → HTTP 응답

---

## auth/dto/TokenRefreshResponse.java
**역할**: Access Token 갱신 응답 DTO.
**주요 필드**: `accessToken`
**플로우**: `AuthService.refresh()` → `TokenRefreshResponse` → `ApiResponse.ok()` → HTTP 응답

---

## auth/service/EmailService.java
**역할**: Gmail SMTP를 통해 이메일 인증 메일을 발송하는 서비스.
**주요 메서드**: `sendVerificationEmail(String to, String token)`
**의존성**: `JavaMailSender`
**플로우**: `AuthService.register()` → `EmailService.sendVerificationEmail()` → Gmail SMTP → 수신자 이메일

---

## auth/service/AuthService.java
**역할**: 회원 관리의 핵심 비즈니스 로직. 회원가입·이메일 인증·로그인·토큰 갱신·로그아웃을 담당.
**주요 메서드**:
- `register(RegisterRequest)` — loginId/이메일 중복 확인 → User 저장 → 인증 토큰 발급 → 메일 발송
- `verifyEmail(EmailVerifyRequest)` — 이메일+코드로 토큰 조회/만료 검증 → `user.verifyEmail()` → 토큰 삭제
- `login(LoginRequest, response)` — `resolveUser(identifier)` → 이메일 인증 여부·비밀번호 검증 → AT/RT 발급 → RT를 httpOnly 쿠키에 저장
- `refresh(request)` — 쿠키에서 RT 추출 → 해시로 DB 조회 → 새 AT 발급
- `logout(request, response)` — RT DB 삭제 → 쿠키 만료 처리
- `findEmailByIdentifier(identifier)` — loginId 또는 이메일로 실제 이메일 주소 반환 (이메일 미인증 리다이렉트용)
- `resolveUser(identifier)` — `@` 포함 시 이메일로 조회, 미포함 시 loginId로 조회
**의존성**: `UserRepository`, `EmailVerificationTokenRepository`, `RefreshTokenRepository`, `JwtUtil`, `JwtProperties`, `EmailService`, `PasswordEncoder`
**특이사항**: RT는 SHA-256 해시로 저장. 쿠키 path는 `/api/auth`로 제한해 불필요한 전송 방지. `cookie.secure` 프로파일 설정값(`@Value`)으로 주입 — 로컬 false, 배포 true로 분기

---

## auth/controller/AuthController.java
**역할**: 인증 관련 REST API 엔드포인트 5개를 제공하는 컨트롤러.
**엔드포인트**:
- `POST /api/auth/register` — 회원가입
- `POST /api/auth/verify-email` — 이메일 인증 (email + code 바디)
- `POST /api/auth/login` — 로그인
- `POST /api/auth/refresh` — Access Token 갱신
- `POST /api/auth/logout` — 로그아웃
**의존성**: `AuthService`
**플로우**: HTTP 요청 → `JwtAuthenticationFilter` → `AuthController` → `AuthService` → `ApiResponse` 반환
**특이사항**: `/login`은 `EMAIL_NOT_VERIFIED` 예외를 컨트롤러에서 직접 처리. `AuthService.findEmailByIdentifier()`로 실제 이메일을 조회해 `data.email`에 포함해 응답 — loginId로 로그인해도 인증 페이지에 올바른 이메일이 전달됨

---

# 기능 2: 팀 프로젝트 관리

## project/entity/ProjectRole.java
**역할**: 프로젝트 내 유저 역할을 나타내는 enum. `OWNER`와 `MEMBER` 두 가지 값을 가진다.
**플로우**: `UserProject.role` 필드에 저장 → `ProjectService`에서 권한 분기 조건으로 사용

---

## project/entity/UserProjectId.java
**역할**: `UserProject` 엔티티의 복합 PK(`user_id + project_id`)를 표현하는 `@IdClass` 클래스.
**특이사항**: `Serializable` 구현 필수. `equals`/`hashCode` 직접 구현.

---

## project/entity/Project.java
**역할**: 팀 프로젝트 정보를 저장하는 핵심 엔티티. `projects` 테이블에 매핑된다.
**주요 필드**: `id`, `name`, `description`, `startDate`, `endDate`, `createdBy`(userId), `inviteCode`(unique, 6자리)
**주요 메서드**:
- `update(...)` — 이름/설명/기간 수정
- `regenerateInviteCode(String)` — 초대 코드 재발급
**플로우**: `ProjectService.createProject()` → `Project.builder()` → DB 저장 → `ProjectService.updateProject()` → `project.update()`

---

## project/entity/UserProject.java
**역할**: 유저와 프로젝트의 다대다 관계를 표현하는 중간 엔티티. `user_project` 테이블에 매핑된다.
**주요 필드**: `user`(FK), `project`(FK), `role`(OWNER/MEMBER), `joinedAt`
**특이사항**: `@IdClass(UserProjectId.class)`로 복합 PK 구성. `BaseEntity` 미상속 — 수정이 없는 구조.

---

## project/repository/ProjectRepository.java
**역할**: `Project` 엔티티 CRUD + 초대 코드 기반 조회/존재 여부 확인.
**주요 메서드**: `findByInviteCode(String)`, `existsByInviteCode(String)`
**플로우**: `ProjectService` → `ProjectRepository` → MySQL `projects` 테이블

---

## project/repository/UserProjectRepository.java
**역할**: 유저-프로젝트 관계 조회/저장/삭제. N+1 방지를 위한 fetch join 쿼리 포함.
**주요 메서드**:
- `findByUserWithProject(User)` — 내 프로젝트 목록 + Project fetch join (N+1 방지, 사이드바용)
- `findByProject(Project)` — 프로젝트 멤버 목록
- `findByUserAndProject(User, Project)` — 특정 멤버 조회
- `existsByUserAndProject(User, Project)` — 멤버 여부 확인
- `findByProjectWithUser(Project)` — 멤버 목록 + User fetch join
- `findByProjectIdWithUser(Long projectId)` — projectId로 멤버 목록 + User fetch join (대시보드용, Project 엔티티 불필요)
**플로우**: `ProjectService` / `DashboardService` → `UserProjectRepository` → MySQL `user_project` 테이블

---

## project/dto/ProjectCreateRequest.java
**역할**: 프로젝트 생성 요청 DTO. `name`은 필수, 나머지는 선택.
**주요 필드**: `name`(`@NotBlank`), `description`, `startDate`, `endDate`
**플로우**: HTTP 요청 바디 → `ProjectController.createProject(@Valid)` → `ProjectService.createProject()`

---

## project/dto/ProjectUpdateRequest.java
**역할**: 프로젝트 수정 요청 DTO. 생성 요청과 동일한 구조.
**플로우**: HTTP 요청 바디 → `ProjectController.updateProject(@Valid)` → `ProjectService.updateProject()`

---

## project/dto/JoinProjectRequest.java
**역할**: 초대 코드로 프로젝트 참여 요청 DTO. 코드는 정확히 6자여야 한다.
**주요 필드**: `inviteCode`(`@NotBlank`, `@Size(min=6, max=6)`)
**플로우**: HTTP 요청 바디 → `ProjectController.joinProject(@Valid)` → `ProjectService.joinProject()`

---

## project/dto/LeaveProjectRequest.java
**역할**: 프로젝트 탈퇴 요청 DTO. OWNER가 탈퇴 시 새 OWNER를 지정하기 위해 사용. MEMBER는 바디 없이 호출 가능.
**주요 필드**: `newOwnerId`(nullable — MEMBER 탈퇴 시 불필요)
**플로우**: HTTP 요청 바디(`required = false`) → `ProjectController.leaveProject()` → `ProjectService.leaveProject()`

---

## project/dto/ProjectResponse.java
**역할**: 프로젝트 응답 DTO. 요청자의 역할(`myRole`)을 함께 반환한다.
**주요 필드**: `id`, `name`, `description`, `startDate`, `endDate`, `createdBy`, `createdAt`, `myRole`
**주요 메서드**: `from(Project, ProjectRole)` — 정적 변환 메서드
**플로우**: `ProjectService` → `ProjectResponse.from(project, role)` → `ApiResponse.ok()` → HTTP 응답

---

## project/dto/ProjectMemberResponse.java
**역할**: 프로젝트 멤버 1명에 대한 응답 DTO.
**주요 필드**: `userId`, `loginId`, `name`, `role`, `joinedAt`
**주요 메서드**: `from(UserProject)` — 정적 변환 메서드
**플로우**: `ProjectService.getMembers()` → `UserProject` 스트림 → `ProjectMemberResponse.from()` → 리스트 반환

---

## project/dto/InviteCodeResponse.java
**역할**: 초대 코드 조회/재발급 응답 DTO.
**주요 필드**: `inviteCode`
**플로우**: `ProjectService.getInviteCode() / regenerateInviteCode()` → `InviteCodeResponse` → `ApiResponse.ok()`

---

## project/service/ProjectService.java
**역할**: 기능 2(팀 프로젝트 관리)의 핵심 비즈니스 로직. 프로젝트 CRUD, 초대 코드 관리, 멤버 관리를 담당.
**주요 메서드**:
- `createProject(userId, request)` — 프로젝트 생성 + OWNER로 `UserProject` 자동 등록
- `getMyProjects(userId)` — 로그인 유저가 속한 프로젝트 목록 (사이드바용, `findByUserWithProject` fetch join으로 N+1 방지)
- `updateProject(userId, projectId, request)` — OWNER만 수정 가능
- `deleteProject(userId, projectId)` — OWNER만 삭제. 관련 `UserProject` 먼저 일괄 삭제
- `getInviteCode / regenerateInviteCode` — OWNER만 조회/재발급
- `joinProject(userId, request)` — 초대 코드로 MEMBER 합류. 중복 참여 방지
- `getMembers(userId, projectId)` — 프로젝트 멤버 이상 조회 가능
- `kickMember(requesterId, projectId, targetUserId)` — OWNER만 강퇴. 자기 자신 강퇴 불가
- `leaveProject(userId, projectId, request)` — 탈퇴. MEMBER는 즉시 탈퇴. OWNER는 혼자면 프로젝트 삭제, 다른 멤버 있으면 `newOwnerId` 지정 필수
**의존성**: `ProjectRepository`, `UserProjectRepository`, `UserRepository`
**특이사항**: 초대 코드는 `SecureRandom`으로 대문자+숫자 6자리 생성. 충돌 시 재생성 루프.

---

## project/controller/ProjectController.java
**역할**: 프로젝트 관련 REST API 11개 엔드포인트 제공.
**엔드포인트**:
- `POST /api/projects` — 프로젝트 생성
- `GET /api/projects` — 내 프로젝트 목록
- `GET /api/projects/{id}` — 프로젝트 상세
- `PUT /api/projects/{id}` — 수정 (OWNER)
- `DELETE /api/projects/{id}` — 삭제 (OWNER)
- `GET /api/projects/{id}/invite-code` — 초대 코드 조회 (OWNER)
- `POST /api/projects/{id}/invite-code/regenerate` — 초대 코드 재발급 (OWNER)
- `POST /api/projects/join` — 초대 코드로 참여
- `GET /api/projects/{id}/members` — 멤버 목록
- `DELETE /api/projects/{id}/members/{userId}` — 강퇴 (OWNER)
- `POST /api/projects/{id}/leave` — 스스로 탈퇴 (OWNER는 `newOwnerId` 포함 가능, 바디 optional)
**의존성**: `ProjectService`
**플로우**: HTTP 요청 → `JwtAuthenticationFilter` → `@AuthenticationPrincipal Long userId` → `ProjectService` → `ApiResponse` 반환

---

# 기능 3: 개인 ToDo

## todo/entity/Todo.java
**역할**: 개인 ToDo 항목을 저장하는 엔티티. `todos` 테이블에 매핑된다.
**주요 필드**: `id`, `user`(FK), `content`, `isDone`, `createdAt`
**주요 메서드**: `toggleDone()` — `isDone` 값을 반전
**플로우**: `TodoService.createTodo()` → `Todo.builder()` → DB 저장 → `TodoService.toggleTodo()` → `todo.toggleDone()`
**특이사항**: `BaseEntity` 미상속. `createdAt`을 생성자에서 `LocalDateTime.now()`로 직접 설정.

---

## todo/repository/TodoRepository.java
**역할**: Todo 엔티티 CRUD + 유저 기준 최신순 목록 조회.
**주요 메서드**: `findByUserOrderByCreatedAtDesc(User)`
**플로우**: `TodoService` → `TodoRepository` → MySQL `todos` 테이블

---

## todo/dto/TodoCreateRequest.java
**역할**: Todo 생성 요청 DTO. `content` 필수 및 500자 이하 검증.
**주요 필드**: `content`(`@NotBlank`, `@Size(max=500)`)
**플로우**: HTTP 요청 바디 → `TodoController.createTodo(@Valid)` → `TodoService.createTodo()`

---

## todo/dto/TodoResponse.java
**역할**: Todo 응답 DTO.
**주요 필드**: `id`, `content`, `isDone`, `createdAt`
**주요 메서드**: `from(Todo)` — 정적 변환 메서드
**플로우**: `TodoService` → `TodoResponse.from(todo)` → `ApiResponse.ok()` → HTTP 응답

---

## todo/service/TodoService.java
**역할**: 기능 3(개인 ToDo)의 핵심 비즈니스 로직. 목록 조회, 생성, 완료 토글, 삭제를 담당.
**주요 메서드**:
- `getMyTodos(userId)` — 로그인 유저의 Todo 최신순 목록
- `createTodo(userId, request)` — Todo 생성
- `toggleTodo(userId, todoId)` — 완료/미완료 토글. 본인 Todo만 가능
- `deleteTodo(userId, todoId)` — 삭제. 본인 Todo만 가능
**의존성**: `TodoRepository`, `UserRepository`
**특이사항**: `requireOwner()`로 타인의 Todo 접근 시 403 반환.

---

## todo/controller/TodoController.java
**역할**: 개인 ToDo REST API 4개 엔드포인트 제공.
**엔드포인트**:
- `GET /api/todos` — 내 Todo 목록
- `POST /api/todos` — Todo 생성
- `PATCH /api/todos/{todoId}/toggle` — 완료 토글
- `DELETE /api/todos/{todoId}` — 삭제
**의존성**: `TodoService`
**플로우**: HTTP 요청 → `JwtAuthenticationFilter` → `@AuthenticationPrincipal Long userId` → `TodoService` → `ApiResponse` 반환

---

# 기능 4: Develop Board

## board/entity/CardStatus.java
**역할**: 카드 상태를 나타내는 enum. BACKLOG / IN_PROGRESS / DONE 3단계.
**플로우**: `Card.status` 필드 타입으로 사용 → Webhook 이벤트 또는 수동 변경으로 전환

---

## board/entity/Card.java
**역할**: Develop Board의 핵심 엔티티. 프로젝트에 속한 작업 단위.
**주요 필드**: `projectId`, `title`, `status(CardStatus)`, `dueDate`, `memo`, `isDeleted`, `createdBy`, `mergedAt`
**주요 메서드**:
- `update()` — 제목/마감일/메모 수정
- `changeStatus()` — 상태 수동 변경
- `markMerged()` — Webhook merge 이벤트 시 DONE 전환 + mergedAt 기록
- `delete()` — soft delete (is_deleted = true)
**특이사항**: `@SQLRestriction("is_deleted = false")`로 삭제된 카드 자동 필터링. `assignees`, `branches`는 `orphanRemoval = true`로 컬렉션 clear 시 자동 삭제

---

## board/entity/CardAssignee.java / CardAssigneeId.java
**역할**: 카드-유저 다대다 담당자 연결 엔티티. 복합 PK(card_id, user_id).
**플로우**: `CardService.saveAssignees()` → `CardAssignee` 생성 → `card_assignees` 테이블 저장

---

## board/entity/CardBranch.java / CardBranchId.java
**역할**: 카드와 GitHub branch를 연결하는 엔티티. 복합 PK(card_id, branch_name).
**주요 메서드**: `getBranchName()` — embedded ID에서 branchName 추출
**플로우**: `CardBranchService.addBranch()` → `CardBranch` 생성 → Webhook에서 branch_name으로 카드 조회 시 활용

---

## board/entity/CommitLog.java
**역할**: GitHub push 이벤트로 수신된 커밋 이력 저장 엔티티.
**주요 필드**: `commitSha(UNIQUE)`, `message`, `author`, `committedAt`
**특이사항**: `commitSha UNIQUE` 제약으로 Webhook 중복 수신 방지. 기능 5(Webhook) 연동 시 자동 저장

---

## board/entity/Comment.java
**역할**: 카드에 달리는 댓글 엔티티.
**주요 메서드**: `delete()` — soft delete
**의존성**: `BaseEntity`(createdAt/updatedAt 자동 관리), `Card`, `User`
**플로우**: `CommentService.createComment()` → `Comment.builder()` → DB 저장 → `CommentService.deleteComment()` → `comment.delete()`
**특이사항**: `@SQLRestriction("is_deleted = false")`로 삭제 댓글 자동 필터링. 삭제는 작성자 본인만 가능. `BaseEntity` 상속으로 `createdAt`/`updatedAt` JPA Auditing 자동 처리

---

## board/repository/CardRepository.java
**역할**: Card JPA 레포지토리.
**주요 메서드**: `findAllByProjectId()` — `@EntityGraph`로 assignees, assignees.user, branches 한 번에 fetch (N+1 방지)
**플로우**: `CardService` → `CardRepository` → DB

---

## board/repository/CardAssigneeRepository.java
**역할**: CardAssignee JPA 레포지토리.
**주요 메서드**: `findAllByCardId()` — 카드의 담당자 목록 조회

---

## board/repository/CardBranchRepository.java
**역할**: CardBranch JPA 레포지토리.
**주요 메서드**:
- `findAllByCardId()` — 카드에 연결된 branch 목록
- `findByRepoNameAndIdBranchName()` — Webhook에서 repoName + branchName으로 카드 조회 시 사용

---

## board/repository/CommitLogRepository.java
**역할**: CommitLog JPA 레포지토리.
**주요 메서드**:
- `existsByCommitSha()` — 중복 커밋 수신 여부 확인 (Webhook 처리 시 사용)
- `findTop10ByCard_ProjectIdOrderByCommittedAtDesc()` — 프로젝트 전체 최근 커밋 10개 조회 (대시보드용)

---

## board/repository/CommentRepository.java
**역할**: Comment JPA 레포지토리.
**주요 메서드**: `findAllByCardId()` — 카드의 댓글 목록 조회

---

## board/dto/ (Request)
**역할**: Board 관련 요청 DTO 모음.
- `CardCreateRequest` — title(필수), dueDate, memo, assigneeIds
- `CardUpdateRequest` — title(필수), dueDate, memo, assigneeIds
- `CardStatusUpdateRequest` — status(필수, CardStatus enum)
- `CardBranchRequest` — branchName(필수), repoName(필수)
- `CommentCreateRequest` — content(필수)

---

## board/dto/ (Response)
**역할**: Board 관련 응답 DTO 모음.
- `BoardResponse` — backlog / inProgress / done 컬럼별 `CardSummaryResponse` 리스트
- `CardSummaryResponse` — 보드 목록용 요약 (id, title, status, dueDate, assignees)
- `CardResponse` — 카드 상세 (assignees, branches, commitLogs 포함)
- `AssigneeResponse` — userId, name
- `BranchResponse` — branchName, repoName
- `CommitLogResponse` — commitSha, message, author, committedAt
- `CommentResponse` — id, userId, userName, content, createdAt

---

## board/service/CardService.java
**역할**: 카드 CRUD 및 보드 조회 비즈니스 로직.
**주요 메서드**:
- `getBoard()` — 프로젝트 카드 전체를 상태별로 분류해 반환
- `createCard()` — 카드 생성 + 담당자 저장
- `updateCard()` — 카드 수정 + 담당자 교체 (`assignees.clear()` → orphanRemoval로 기존 삭제 후 재저장)
- `updateCardStatus()` — 상태 수동 변경
- `deleteCard()` — soft delete
**의존성**: `CardRepository`, `CardAssigneeRepository`, `CommitLogRepository`, `UserRepository`, `UserProjectRepository`
**플로우**: `CardController` → `CardService` → Repository → DB

---

## board/service/CommentService.java
**역할**: 댓글 CRUD 비즈니스 로직.
**주요 메서드**:
- `getComments()` — 멤버 검증 후 카드 댓글 목록 반환
- `createComment()` — 멤버 검증 후 댓글 저장
- `deleteComment()` — 댓글이 해당 카드에 속하는지 검증 + 작성자 본인 여부 확인 후 soft delete
**의존성**: `CommentRepository`, `CardRepository`, `UserRepository`, `UserProjectRepository`
**플로우**: `CommentController` → `CommentService` → Repository → DB

---

## board/service/CardBranchService.java
**역할**: 카드-branch 연결/해제 비즈니스 로직.
**주요 메서드**:
- `addBranch()` — 카드에 branch 연결
- `removeBranch()` — branch 연결 해제 (`BRANCH_NOT_FOUND` 에러 반환)
**의존성**: `CardRepository`, `CardBranchRepository`, `UserProjectRepository`
**플로우**: `CardBranchController` → `CardBranchService` → `CardBranchRepository` → DB

---

## board/controller/CardController.java
**역할**: 카드 및 보드 조회 REST API 엔드포인트.
**엔드포인트**:
- `GET /api/projects/{projectId}/board` — 보드 전체 조회
- `POST /api/projects/{projectId}/cards` — 카드 생성
- `GET /api/projects/{projectId}/cards/{cardId}` — 카드 상세
- `PATCH /api/projects/{projectId}/cards/{cardId}` — 카드 수정
- `PATCH /api/projects/{projectId}/cards/{cardId}/status` — 상태 변경
- `DELETE /api/projects/{projectId}/cards/{cardId}` — 카드 삭제
**의존성**: `CardService`
**플로우**: HTTP 요청 → `JwtAuthenticationFilter` → `CardController` → `CardService` → `ApiResponse` 반환

---

## board/controller/CommentController.java
**역할**: 댓글 REST API 엔드포인트.
**엔드포인트**:
- `GET /api/projects/{projectId}/cards/{cardId}/comments` — 댓글 목록
- `POST /api/projects/{projectId}/cards/{cardId}/comments` — 댓글 작성
- `DELETE /api/projects/{projectId}/cards/{cardId}/comments/{commentId}` — 댓글 삭제
**의존성**: `CommentService`
**플로우**: HTTP 요청 → `JwtAuthenticationFilter` → `CommentController` → `CommentService` → `ApiResponse` 반환

---

## board/controller/CardBranchController.java
**역할**: 카드-branch 연결/해제 REST API 엔드포인트.
**엔드포인트**:
- `POST /api/projects/{projectId}/cards/{cardId}/branches` — branch 연결
- `DELETE /api/projects/{projectId}/cards/{cardId}/branches/{branchName}` — branch 해제
**의존성**: `CardBranchService`
**플로우**: HTTP 요청 → `JwtAuthenticationFilter` → `CardBranchController` → `CardBranchService` → `ApiResponse` 반환

---

# 기능 5: GitHub Webhook 연동

## github/entity/ProjectGithub.java
**역할**: 프로젝트별 GitHub 연동 정보 저장 엔티티. `project_id`가 PK이자 FK.
**주요 필드**: `repoUrl`, `repoName`, `patEncrypted`(Jasypt 암호화), `webhookSecret`
**주요 메서드**: `update()` — 연동 정보 일괄 수정
**특이사항**: `repoName`으로 Webhook 수신 시 프로젝트를 식별함

---

## github/repository/ProjectGithubRepository.java
**역할**: ProjectGithub JPA 레포지토리.
**주요 메서드**: `findByRepoName()` — Webhook 수신 시 repo 이름으로 프로젝트 조회

---

## github/dto/ProjectGithubRequest.java / ProjectGithubResponse.java
**역할**: GitHub 연동 설정 요청/응답 DTO.
- `ProjectGithubRequest` — repoUrl, repoName, pat(평문), webhookSecret
- `ProjectGithubResponse` — projectId, repoUrl, repoName (pat/webhookSecret 노출 안 함)

---

## github/dto/WebhookPayload.java
**역할**: GitHub Webhook 수신 payload 역직렬화 DTO. 세 이벤트(create/push/pull_request) 공용.
**주요 필드**: `refType`, `ref`, `commits`, `pullRequest`, `repository`
**특이사항**: `@JsonIgnoreProperties(ignoreUnknown = true)` — GitHub가 보내는 수십 개의 미사용 필드 무시. 내부 클래스 전체 동일 적용

---

## github/service/ProjectGithubService.java
**역할**: GitHub 연동 설정 등록/조회/수정 비즈니스 로직. OWNER 전용.
**주요 메서드**:
- `getGithubConfig()` — 멤버 검증 후 연동 정보 조회
- `registerGithubConfig()` — OWNER 검증 + PAT Jasypt 암호화 후 등록 (이미 존재하면 수정)
- `updateGithubConfig()` — OWNER 검증 + 연동 정보 수정
**의존성**: `ProjectGithubRepository`, `ProjectRepository`, `UserProjectRepository`, `StringEncryptor(jasyptStringEncryptor)`
**플로우**: `ProjectGithubController` → `ProjectGithubService` → `ProjectGithubRepository` → DB

---

## github/service/WebhookService.java
**역할**: GitHub Webhook 서명 검증 및 이벤트별 카드 자동 처리 로직.
**주요 메서드**:
- `verifySignature()` — `X-Hub-Signature-256` HMAC-SHA256 검증. 실패 시 403
- `handleCreate()` — branch 생성 이벤트. `ref_type == "branch"`만 처리. 미연결 카드 자동 생성 (IN_PROGRESS)
- `handlePush()` — commit push 이벤트. `refs/heads/` 파싱 후 카드에 커밋 이력 저장. 중복 SHA 무시
- `handlePullRequest()` — PR merge 이벤트. `base.ref == main/master`일 때만 카드 DONE 전환
**의존성**: `ProjectGithubRepository`, `CardRepository`, `CardBranchRepository`, `CommitLogRepository`
**플로우**: `WebhookController` → `verifySignature()` → `handle*()` → Repository → DB
**특이사항**: 클래스 레벨 `@Transactional(readOnly = true)` 적용 — `verifySignature()`의 DB 조회도 트랜잭션 범위 내에서 실행. 쓰기 메서드(`handle*`)는 개별 `@Transactional`로 분리

---

## github/controller/ProjectGithubController.java
**역할**: GitHub 연동 설정 REST API 엔드포인트.
**엔드포인트**:
- `GET /api/projects/{projectId}/github` — 연동 정보 조회 (멤버)
- `POST /api/projects/{projectId}/github` — 연동 등록 (OWNER)
- `PUT /api/projects/{projectId}/github` — 연동 수정 (OWNER)
**의존성**: `ProjectGithubService`
**플로우**: HTTP 요청 → `JwtAuthenticationFilter` → `ProjectGithubController` → `ProjectGithubService` → `ApiResponse` 반환

---

## github/controller/WebhookController.java
**역할**: GitHub Webhook 수신 단일 엔드포인트.
**엔드포인트**: `POST /api/webhook/github`
**의존성**: `WebhookService`, `ObjectMapper`
**플로우**: GitHub → `POST /api/webhook/github` (JWT 인증 제외) → rawBody로 수신 → `ObjectMapper` 파싱 → `verifySignature()` → 이벤트별 `handle*()` 호출
**특이사항**: `@RequestBody String rawBody`로 받아 서명 검증 후 직접 파싱. repository null 체크 후 verifySignature 호출

---

# 기능 6: 캘린더

## calendar/entity/Schedule.java
**역할**: 프로젝트 팀 일정을 저장하는 엔티티. `schedules` 테이블에 매핑된다.
**주요 필드**: `projectId`, `title`, `startDate`, `endDate`(LocalDate), `createdBy`(userId)
**주요 메서드**: `update(title, startDate, endDate)` — 일정 수정
**플로우**: `ScheduleService.createSchedule()` → `Schedule.builder()` → DB 저장 → `ScheduleService.updateSchedule()` → `schedule.update()`

---

## calendar/repository/ScheduleRepository.java
**역할**: Schedule JPA 레포지토리. 기간 범위 조회 쿼리를 포함한다.
**주요 메서드**: `findAllByProjectIdAndPeriod(projectId, from, to)` — `startDate <= to AND endDate >= from` 조건으로 기간에 걸치는 일정 전체 반환
**플로우**: `ScheduleService` → `ScheduleRepository` → MySQL `schedules` 테이블

---

## calendar/dto/ (Request/Response)
**역할**: 캘린더 관련 DTO 모음.
- `ScheduleCreateRequest` — title(`@NotBlank`), startDate(`@NotNull`), endDate(`@NotNull`)
- `ScheduleUpdateRequest` — 생성 요청과 동일한 구조
- `ScheduleResponse` — id, title, startDate, endDate, createdBy. `from(Schedule)` 정적 변환 메서드 포함

---

## calendar/service/ScheduleService.java
**역할**: 기능 6(캘린더)의 핵심 비즈니스 로직. 일정 CRUD 및 기간 조회를 담당.
**주요 메서드**:
- `getSchedules(projectId, userId, from, to)` — 멤버 검증 후 기간 내 일정 목록 반환
- `createSchedule(projectId, userId, request)` — 멤버 검증 후 일정 생성
- `updateSchedule(projectId, userId, scheduleId, request)` — 멤버 검증 + 프로젝트 소속 확인 후 수정
- `deleteSchedule(projectId, userId, scheduleId)` — 멤버 검증 + 프로젝트 소속 확인 후 삭제
**의존성**: `ScheduleRepository`, `UserProjectRepository`
**플로우**: `ScheduleController` → `ScheduleService` → `ScheduleRepository` → DB

---

## calendar/controller/ScheduleController.java
**역할**: 캘린더 일정 REST API 4개 엔드포인트 제공.
**엔드포인트**:
- `GET /api/projects/{projectId}/schedules?from=&to=` — 기간 조회 (ISO DATE 형식)
- `POST /api/projects/{projectId}/schedules` — 일정 생성
- `PATCH /api/projects/{projectId}/schedules/{scheduleId}` — 일정 수정
- `DELETE /api/projects/{projectId}/schedules/{scheduleId}` — 일정 삭제
**의존성**: `ScheduleService`
**플로우**: HTTP 요청 → `JwtAuthenticationFilter` → `ScheduleController` → `ScheduleService` → `ApiResponse` 반환

---

# 기능 7: 대시보드

## dashboard/dto/CardStatusSummary.java
**역할**: 카드 상태별 집계 요약 레코드.
**주요 필드**: `backlog`, `inProgress`, `done`, `total`, `progressRate`(done/total*100)
**플로우**: `DashboardService.buildCardSummary()` → `CardStatusSummary` → `DashboardResponse`에 포함

---

## dashboard/dto/RecentCommitResponse.java
**역할**: 대시보드용 최근 커밋 응답 DTO. 커밋이 속한 카드 제목을 함께 반환한다.
**주요 필드**: `commitSha`, `message`, `author`, `committedAt`, `cardTitle`
**주요 메서드**: `from(CommitLog)` — `commitLog.getCard().getTitle()`로 카드 제목 포함
**플로우**: `DashboardService` → `CommitLogRepository.findTop10...()` → `RecentCommitResponse.from()` → `DashboardResponse`

---

## dashboard/dto/MemberSummaryResponse.java
**역할**: 대시보드용 멤버 요약 응답 DTO. 담당 카드 수를 포함한다.
**주요 필드**: `userId`, `name`, `role`(OWNER/MEMBER), `assignedCardCount`
**주요 메서드**: `of(UserProject, int assignedCardCount)` — 정적 팩토리 메서드
**플로우**: `DashboardService` → `UserProjectRepository.findByProjectIdWithUser()` + 카드 집계 → `MemberSummaryResponse.of()` → `DashboardResponse`

---

## dashboard/dto/DashboardResponse.java
**역할**: 대시보드 단일 API의 최상위 응답 래퍼 레코드.
**주요 필드**: `cardSummary`(CardStatusSummary), `recentCommits`(List), `members`(List)
**플로우**: `DashboardService.getDashboard()` → `DashboardResponse` → `ApiResponse.ok()` → HTTP 응답

---

## dashboard/service/DashboardService.java
**역할**: 기능 7(대시보드)의 핵심 비즈니스 로직. 카드 현황, 최근 커밋, 멤버 요약을 조합해 단일 응답으로 반환.
**주요 메서드**:
- `getDashboard(projectId, userId)` — 멤버 검증 후 세 가지 데이터를 조합해 `DashboardResponse` 반환
- `buildCardSummary(cards)` — 상태별 카드 수 및 진행률 계산
**의존성**: `CardRepository`, `CommitLogRepository`, `UserProjectRepository`
**플로우**: `DashboardController` → `getDashboard()` → `CardRepository` + `CommitLogRepository` + `UserProjectRepository` → `DashboardResponse`
**특이사항**: 담당 카드 수는 `CardRepository.findAllByProjectId()`로 이미 로드된 카드의 `assignees`에서 집계 (추가 쿼리 없음)

---

## dashboard/controller/DashboardController.java
**역할**: 대시보드 단일 API 엔드포인트.
**엔드포인트**: `GET /api/projects/{projectId}/dashboard`
**의존성**: `DashboardService`
**플로우**: HTTP 요청 → `JwtAuthenticationFilter` → `DashboardController` → `DashboardService.getDashboard()` → `ApiResponse` 반환
