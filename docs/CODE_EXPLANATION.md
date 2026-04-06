# Code Explanation

> 구현된 파일에 대한 설명을 누적합니다. `/exp-code` 명령으로 업데이트됩니다.

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
- `permitAll` 경로: `/api/auth/**`, `/api/webhook/**`
- 나머지 요청은 인증 필요
- `JwtAuthenticationFilter`를 `UsernamePasswordAuthenticationFilter` 앞에 등록
- `BCryptPasswordEncoder` 빈 등록
**의존성**: `JwtUtil`, `JwtAuthenticationFilter`
**플로우**: 모든 HTTP 요청 → `JwtAuthenticationFilter`(Bearer 파싱) → `SecurityFilterChain`(permitAll 분기) → 컨트롤러

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
**플로우**: 컨트롤러 → `ApiResponse.ok()` 또는 `GlobalExceptionHandler` → `ApiResponse.fail()` → HTTP 응답 바디

---

## common/dto/ErrorResponse.java
**역할**: 오류 응답 본문에 담기는 에러 코드와 메시지를 담는 레코드.
**주요 필드**: `code`, `message`
**플로우**: `GlobalExceptionHandler` → `ApiResponse.fail(ErrorCode)` → `ErrorResponse(code, message)` → 응답 바디의 `error` 필드

---

## common/exception/ErrorCode.java
**역할**: 도메인별 에러 코드를 열거형으로 관리. HTTP 상태코드, 코드 문자열, 메시지를 함께 정의.
**주요 카테고리**: Common / Auth(`EMAIL_ALREADY_EXISTS`, `LOGIN_ID_ALREADY_EXISTS` 등) / User / Project / Card / GitHub / File / Schedule / Todo
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
- `resolveUser(identifier)` — `@` 포함 시 이메일로 조회, 미포함 시 username으로 조회
**의존성**: `UserRepository`, `EmailVerificationTokenRepository`, `RefreshTokenRepository`, `JwtUtil`, `JwtProperties`, `EmailService`, `PasswordEncoder`
**특이사항**: RT는 SHA-256 해시로 저장. 쿠키 path는 `/api/auth`로 제한해 불필요한 전송 방지

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
**역할**: 유저-프로젝트 관계 조회/저장/삭제. 멤버 목록 조회 시 N+1 방지를 위한 fetch join 쿼리 포함.
**주요 메서드**:
- `findByUser(User)` — 내 프로젝트 목록
- `findByProject(Project)` — 프로젝트 멤버 목록
- `findByUserAndProject(User, Project)` — 특정 멤버 조회
- `existsByUserAndProject(User, Project)` — 멤버 여부 확인
- `findByProjectWithUser(Project)` — 멤버 목록 + User fetch join
**플로우**: `ProjectService` → `UserProjectRepository` → MySQL `user_project` 테이블

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
- `getMyProjects(userId)` — 로그인 유저가 속한 프로젝트 목록 (사이드바용)
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
