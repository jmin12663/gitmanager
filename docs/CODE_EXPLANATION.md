# Code Explanation

> 구현된 파일에 대한 설명을 누적합니다. `/exp-code` 명령으로 업데이트됩니다.

---

## GitmanagerApplication.java
**역할**: Spring Boot 애플리케이션 진입점. JPA Auditing과 `@ConfigurationProperties` 스캔을 활성화한다.
**주요 어노테이션**:
- `@EnableJpaAuditing` — BaseEntity의 `createdAt`, `updatedAt` 자동 관리 활성화
- `@ConfigurationPropertiesScan` — `JwtProperties` 등 `@ConfigurationProperties` 빈 자동 등록
**플로우**: 앱 시작 → `JwtProperties` 빈 등록 → `BaseEntity` Auditing 활성화 → 전체 빈 초기화

---

## common/entity/BaseEntity.java
**역할**: 모든 Entity가 상속하는 추상 클래스. 생성/수정 시간을 자동으로 관리한다. 
**주요 필드**:
- `createdAt` — 엔티티 최초 저장 시 자동 기록
- `updatedAt` — 엔티티 수정 시 자동 갱신
**의존성**: `AuditingEntityListener` (Spring Data JPA)
**플로우**: `GitmanagerApplication(@EnableJpaAuditing)` → 각 Entity 클래스에서 `extends BaseEntity` → JPA 저장/수정 시 자동 주입

---

## common/config/JwtProperties.java
**역할**: `application.yaml`의 `jwt.*` 설정값을 바인딩하는 불변 설정 레코드.
**주요 필드**:
- `secret` — JWT 서명 키
- `accessExpiration` — Access Token 만료 시간 (ms)
- `refreshExpiration` — Refresh Token 만료 시간 (ms)
**플로우**: `application.yaml(jwt.*)` → `JwtProperties` 바인딩 → `JwtUtil`(구현 예정)에서 주입받아 토큰 생성/검증에 사용

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

## auth/entity/User.java
**역할**: 회원 정보를 저장하는 핵심 엔티티. `users` 테이블에 매핑된다.
**주요 필드**: `id`(PK, 자동증가), `loginId`(unique, 로그인용 아이디), `email`(unique), `password`(BCrypt), `name`, `emailVerified`
**주요 메서드**: `verifyEmail()` — 이메일 인증 완료 시 `emailVerified = true`로 변경
**플로우**: `AuthService.register()` → `User.builder()` 생성 → DB 저장 → `AuthService.verifyEmail()` → `user.verifyEmail()`

---

## auth/entity/EmailVerificationToken.java
**역할**: 회원가입 시 발급되는 이메일 인증 토큰. 30분 유효, 인증 완료 후 삭제된다.
**주요 필드**: `token`(UUID), `expiresAt`, `user`(FK)
**주요 메서드**: `isExpired()` — 현재 시각과 `expiresAt` 비교
**플로우**: `AuthService.register()` → 토큰 생성 및 저장 → `EmailService`로 발송 → `AuthService.verifyEmail()` → 토큰 검증 후 삭제

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
**주요 메서드**: `findByToken(String)`, `deleteByUser(User)`
**플로우**: `AuthService.verifyEmail()` → `findByToken()` → 검증 → `deleteByUser()` 삭제

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

## common/config/JwtAuthenticationFilter.java
**역할**: 모든 요청에서 `Authorization: Bearer {token}` 헤더를 파싱해 SecurityContext에 인증 정보를 주입하는 필터.
**주요 동작**: 토큰 검증 성공 시 `UsernamePasswordAuthenticationToken(userId)`를 SecurityContext에 등록
**의존성**: `JwtUtil`
**플로우**: HTTP 요청 → `JwtAuthenticationFilter` → `JwtUtil.validate()` → `SecurityContextHolder.setAuthentication()` → 이후 필터 체인 진행
**특이사항**: 검증 실패 시 예외를 던지지 않고 조용히 무시 — 인증 강제는 SecurityConfig의 `authorizeHttpRequests`가 담당

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
- `verifyEmail(String token)` — 토큰 조회/만료 검증 → `user.verifyEmail()` → 토큰 삭제
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
- `GET /api/auth/verify-email?token=` — 이메일 인증
- `POST /api/auth/login` — 로그인
- `POST /api/auth/refresh` — Access Token 갱신
- `POST /api/auth/logout` — 로그아웃
**의존성**: `AuthService`
**플로우**: HTTP 요청 → `JwtAuthenticationFilter` → `AuthController` → `AuthService` → `ApiResponse` 반환