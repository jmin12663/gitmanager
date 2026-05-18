# UML 다이어그램

> PlantUML 형식. https://www.plantuml.com/plantuml 또는 IDE 플러그인으로 렌더링.

---

## 1. 사용자-기능 유스케이스 다이어그램

```plantuml
@startuml UseCase
left to right direction
skinparam packageStyle rectangle
skinparam actorStyle awesome

actor "사용자" as User
actor "GitHub" as GH

rectangle GitManager {

  package "회원 관리" {
    usecase "이메일 인증코드 전송" as UC_SEND_CODE
    usecase "이메일 코드 확인" as UC_VERIFY_CODE
    usecase "회원가입" as UC_REGISTER
    usecase "로그인" as UC_LOGIN
    usecase "로그아웃" as UC_LOGOUT
    usecase "액세스 토큰 재발급" as UC_REFRESH
    usecase "프로필 수정" as UC_PROFILE
    usecase "비밀번호 변경" as UC_PW
  }

  package "팀 프로젝트" {
    usecase "프로젝트 생성" as UC_PRJ_CREATE
    usecase "초대코드로 참여" as UC_PRJ_JOIN
    usecase "멤버 관리" as UC_PRJ_MEMBER
  }

  package "개인 ToDo" {
    usecase "ToDo 생성·수정·삭제" as UC_TODO
  }

  package "Develop Board" {
    usecase "카드 생성·수정·삭제" as UC_CARD
    usecase "카드 상태 변경 (드래그)" as UC_CARD_STATUS
    usecase "GitHub 브랜치 수동 연결" as UC_CARD_BRANCH
    usecase "실시간 보드 업데이트 수신" as UC_WS
  }

  package "GitHub 연동" {
    usecase "GitHub OAuth 연동" as UC_OAUTH
    usecase "수동 GitHub 동기화" as UC_SYNC
    usecase "Webhook 이벤트 처리" as UC_WEBHOOK
  }

  package "개발 일정 캘린더" {
    usecase "일정 생성·수정·삭제" as UC_CAL
  }

  package "프로젝트 대시보드" {
    usecase "프로젝트 현황 조회" as UC_DASH
  }
}

' 사용자 관계
User --> UC_SEND_CODE
User --> UC_VERIFY_CODE
User --> UC_REGISTER
User --> UC_LOGIN
User --> UC_LOGOUT
User --> UC_REFRESH
User --> UC_PROFILE
User --> UC_PW

User --> UC_PRJ_CREATE
User --> UC_PRJ_JOIN
User --> UC_PRJ_MEMBER

User --> UC_TODO

User --> UC_CARD
User --> UC_CARD_STATUS
User --> UC_CARD_BRANCH
User --> UC_WS

User --> UC_OAUTH
User --> UC_SYNC

User --> UC_CAL
User --> UC_DASH

' GitHub 외부 시스템
GH --> UC_WEBHOOK

' 의존 관계
UC_SEND_CODE ..> UC_VERIFY_CODE : <<include>>
UC_VERIFY_CODE ..> UC_REGISTER  : <<include>>
UC_WEBHOOK ..> UC_CARD          : <<extend>> (자동 카드 생성)
UC_WEBHOOK ..> UC_CARD_STATUS   : <<extend>> (상태 자동 전환)
UC_WEBHOOK ..> UC_WS            : <<extend>> (실시간 브로드캐스트)
UC_SYNC ..> UC_CARD             : <<extend>>

@enduml
```

---

## 2. JWT 인증 시퀀스 다이어그램

### 2-1. 회원가입 흐름

```plantuml
@startuml JWT_Register
skinparam sequenceArrowThickness 2

actor 사용자
participant "React\nFrontend" as FE
participant "AuthController" as AC
participant "AuthService" as AS
participant "EmailService" as ES
database "DB (MySQL)" as DB

== 이메일 인증 ==
사용자 -> FE : 이메일 입력
FE -> AC : POST /api/auth/send-email-code
AC -> AS : sendEmailCode()
AS -> DB : 기존 PreEmailVerification 삭제
AS -> DB : 새 인증코드(6자리) 저장\n(유효시간 5분)
AS -> ES : 이메일 발송 (Gmail SMTP)
ES --> 사용자 : 인증코드 이메일 수신

사용자 -> FE : 인증코드 입력
FE -> AC : POST /api/auth/verify-email-code
AC -> AS : verifyEmailCode()
AS -> DB : PreEmailVerification 조회
alt 코드 일치 & 미만료
  AS -> DB : verified = true 저장
  AC --> FE : 200 OK
else 코드 불일치 or 만료
  AC --> FE : 400 INVALID_EMAIL_TOKEN
end

== 회원가입 ==
사용자 -> FE : 아이디·비밀번호·이름 입력
FE -> AC : POST /api/auth/register
AC -> AS : register()
AS -> DB : PreEmailVerification.verified 확인
alt verified = true
  AS -> DB : User 저장 (BCrypt 해시)
  AS -> DB : PreEmailVerification 삭제
  AC --> FE : 200 OK
else not verified
  AC --> FE : 400 EMAIL_NOT_PRE_VERIFIED
end

@enduml
```

### 2-2. 로그인 및 API 요청 흐름

```plantuml
@startuml JWT_Login
skinparam sequenceArrowThickness 2

actor 사용자
participant "React\nFrontend" as FE
participant "JwtAuthFilter" as JF
participant "AuthController" as AC
participant "AuthService" as AS
participant "JwtUtil" as JU
database "DB (MySQL)" as DB

== 로그인 ==
사용자 -> FE : 아이디/이메일 + 비밀번호
FE -> AC : POST /api/auth/login\n(permitAll — 필터 통과)
AC -> AS : login()
AS -> DB : User 조회 (loginId or email)
AS -> AS : BCrypt 비밀번호 검증
AS -> JU : generateAccessToken(userId)\n→ 만료 1시간
AS -> JU : generateRefreshToken(userId)\n→ 만료 7일
AS -> DB : RefreshToken 저장\n(SHA-256 해시로 저장)
AS --> AC : LoginResponse\n(accessToken)
AC --> FE : 200 OK\n{ accessToken }\n+ Set-Cookie: refreshToken (httpOnly)
FE -> FE : accessToken 메모리 저장

== 인증 필요 API 요청 ==
사용자 -> FE : 기능 사용
FE -> JF : API 요청\nAuthorization: Bearer {accessToken}
JF -> JU : validate(token)
alt 토큰 유효
  JF -> JF : SecurityContext에 userId 저장
  JF --> AC : 요청 전달
  AC --> FE : 200 응답
else 토큰 만료/무효
  JF --> FE : 401 UNAUTHORIZED
end

== 액세스 토큰 재발급 ==
FE -> AC : POST /api/auth/refresh\n(Cookie: refreshToken)
AC -> AS : refresh()
AS -> AS : JwtUtil.validate(refreshToken)
AS -> DB : RefreshToken 해시 조회
alt DB에 존재 & 미만료
  AS -> JU : generateAccessToken(userId)
  AC --> FE : 200 OK\n{ accessToken }
  FE -> FE : accessToken 갱신 (메모리)
else 없음 or 만료
  AC --> FE : 401 REFRESH_TOKEN_NOT_FOUND
  FE -> FE : 재로그인 유도
end

== 로그아웃 ==
사용자 -> FE : 로그아웃
FE -> AC : POST /api/auth/logout\n(Cookie: refreshToken)
AC -> AS : logout()
AS -> DB : RefreshToken 삭제
AS -> AS : clearRefreshTokenCookie\n(maxAge=0)
AC --> FE : 200 OK

@enduml
```

---

## 3. GitHub Webhook 처리 시퀀스 다이어그램

```plantuml
@startuml Webhook
skinparam sequenceArrowThickness 2

participant "GitHub" as GH
participant "WebhookController" as WC
participant "WebhookService" as WS
participant "BoardWebSocketService" as BWS
participant "STOMP Broker\n(/topic)" as BROKER
actor "팀원 브라우저" as USER
database "DB (MySQL)" as DB

GH -> WC : POST /api/webhook/github\nX-GitHub-Event: {event}\nX-Hub-Signature-256: sha256=...\nBody: JSON payload

WC -> WS : verifySignature(repoName, signature, payload)
WS -> DB : ProjectGithub 조회 (repoName)
WS -> WS : HMAC-SHA256(webhookSecret, payload)
alt 서명 불일치
  WC --> GH : 403 WEBHOOK_SIGNATURE_INVALID
end

WC -> WC : X-GitHub-Event 분기

== create (branch 생성) ==
WC -> WS : handleCreate(payload, github)
WS -> DB : CardBranch 존재 여부 확인
alt 미연결 브랜치
  WS -> DB : Card 생성\n(title=branchName, status=IN_PROGRESS,\ncreatedBy=0 시스템)
  WS -> DB : CardBranch 저장
  WS -> WS : broadcastAfterCommit()
  note right : afterCommit() — 트랜잭션 커밋 후 발행
  WS -> BWS : broadcast(projectId, CARD_CREATED)
  BWS -> BROKER : /topic/projects/{id}/board
  BROKER -> USER : WebSocket 메시지\n{ type: CARD_CREATED, card: {...} }
end

== push (commit push) ==
WC -> WS : handlePush(payload)
WS -> DB : CardBranch 조회 (repoName + branchName)
alt 연결된 카드 존재
  WS -> DB : 카드 상태 확인
  alt 카드 status == BACKLOG
    WS -> DB : status → IN_PROGRESS
    note right : 진입점 A 대응\n(카드 먼저 생성 후 커밋 push)
  end
  loop payload.commits 순회
    WS -> DB : commitSha 중복 확인\n(UNIQUE 제약)
    alt 미저장 커밋
      WS -> DB : CommitLog 저장\n(sha, message, author, committedAt)
    end
  end
  WS -> WS : broadcastAfterCommit() (상태 변경 시)
  WS -> BWS : broadcast(projectId, CARD_STATUS_CHANGED)
  BWS -> BROKER : /topic/projects/{id}/board
  BROKER -> USER : { type: CARD_STATUS_CHANGED, card: {...} }
end

== delete (branch 삭제) ==
WC -> WS : handleDelete(payload)
WS -> DB : CardBranch 조회
WS -> DB : CardBranch 삭제\n(카드 자체는 유지)

== pull_request (PR merge) ==
WC -> WS : handlePullRequest(payload)
WS -> WS : pullRequest.merged == true 확인
WS -> WS : base.ref == "main" or "master" 확인
WS -> DB : CardBranch 조회 (head.ref 브랜치)
alt 연결된 카드 존재
  WS -> DB : card.markMerged()\n→ status=DONE, mergedAt=now
  WS -> WS : broadcastAfterCommit()
  WS -> BWS : broadcast(projectId, CARD_STATUS_CHANGED)
  BWS -> BROKER : /topic/projects/{id}/board
  BROKER -> USER : { type: CARD_STATUS_CHANGED,\n  card: { status: DONE, ... } }
end

WC --> GH : 200 OK

@enduml
```

---

## WebSocket 연결 시퀀스 (보드 접속)

```plantuml
@startuml WebSocket_Connect
skinparam sequenceArrowThickness 2

actor 사용자
participant "React\nFrontend" as FE
participant "WebSocketChannelInterceptor" as INT
participant "JwtUtil" as JU
participant "STOMP Broker" as BROKER

사용자 -> FE : 보드 페이지 진입
FE -> BROKER : HTTP GET /ws (SockJS 핸드셰이크)\n(permitAll — JWT 미검증)
BROKER --> FE : 101 Switching Protocols

FE -> INT : STOMP CONNECT\nAuthorization: Bearer {accessToken}
INT -> JU : validate(token)
alt 유효한 토큰
  INT -> INT : STOMP 세션에 userId 저장
  INT --> FE : CONNECTED
  FE -> BROKER : SUBSCRIBE /topic/projects/{projectId}/board
else 무효/만료
  INT --> FE : ERROR (연결 거부)
end

note over FE, BROKER
  이후 카드 변경 발생 시
  BoardWebSocketService가
  /topic/projects/{id}/board 로 메시지 발행
end note

BROKER -> FE : { type, cardId, card, commentCount }
FE -> FE : 보드 상태 실시간 갱신

@enduml
```