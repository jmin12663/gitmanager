# FRONTEND.md — 프론트엔드 구현 가이드

---

## 기술 스택

| 항목 | 내용 |
|---|---|
| 번들러 | Vite |
| 프레임워크 | React 19 + TypeScript |
| 스타일 | Tailwind CSS v4 (`@tailwindcss/vite` 플러그인) |
| UI 컴포넌트 | shadcn/ui |
| 라우팅 | react-router-dom |
| HTTP | axios (`src/api/client.ts`) |
| 드래그앤드롭 | @dnd-kit/core + @dnd-kit/sortable |
| 차트 | chart.js + react-chartjs-2 |
| 캘린더 | @fullcalendar/react |

---

## 폴더 구조

```
frontend/src/
├── api/
│   └── client.ts          # axios 인스턴스 + 토큰 인터셉터
├── components/
│   └── ui/                # shadcn/ui 자동 생성 컴포넌트
├── pages/                 # 라우트 단위 페이지 컴포넌트
├── hooks/                 # 커스텀 훅
├── store/
│   ├── authStore.ts       # AuthContext 타입 정의 + useAuth 훅
│   └── AuthProvider.tsx   # 세션 복구 + Access Token 관리
└── types/                 # TypeScript 타입 정의
```

---

## 레이아웃 구조

2단 구성 (사이드바 + 메인 콘텐츠).

```
┌──────────────────┬──────────────────────────────────────────────┐
│  Project Alpha    │  [Board] [Calendar] [Dashboard] [Settings]   │
│  Very Long Pro... │  ──────────────────────────────────────────  │
│  My Team C        │                                              │
│                   │            메인 콘텐츠                          │
│                   │                                              │
│                   │                                              │
│  ──────────────   │                                              │
│  👤 홍길동          │                                             │
│  ⚙️ setting       │                                  [📋 Todo]  │
└────────────────── ┴──────────────────────────────────────────────┘
```

- **좌측 사이드바**
  - 가입된 프로젝트 풀네임 리스트 (이름이 길면 말줄임표`...` 처리, 호버 시 툴팁으로 풀네임 표시)
  - 프로젝트 생성 버튼
  - 하단: 유저 아바타 + 이름
  - 개인 설정(⚙️): 비밀번호 변경, 프로필 수정 등 유저 계정 설정

- **메인 콘텐츠 상단 탭**: 선택된 프로젝트의 Board / Calendar / Dashboard / Settings
  - Settings 탭: GitHub 연동, 초대코드 조회·재발급, 멤버 관리·강퇴 (OWNER 전용)

- **Todo 플로팅 버튼**: 우하단 고정 버튼 클릭 시 패널 슬라이드업
  - 어느 페이지에서도 접근 가능한 개인 ToDo
  - 패널 열릴 때 메인 콘텐츠 위에 오버레이로 표시

로그인/회원가입/이메일 인증 페이지는 사이드바 없이 단독 레이아웃.

---

## 라우트 목록

| 경로 | 페이지 | 인증 |
|---|---|---|
| `/login` | 로그인 | 불필요 |
| `/register` | 회원가입 | 불필요 |
| `/verify` | 이메일 인증 | 불필요 |
| `/todo` | 개인 ToDo | 필요 |
| `/projects/:projectId/board` | Develop Board (칸반) | 필요 |
| `/projects/:projectId/calendar` | 캘린더 | 필요 |
| `/projects/:projectId/dashboard` | 대시보드 | 필요 |
| `/projects/:projectId/settings` | 프로젝트 설정 (GitHub 연동, 멤버 관리) | 필요 (OWNER) |
| `*` | → `/login` 리다이렉트 | — |

---

## 인증 흐름

```
앱 시작
→ AuthProvider: POST /api/auth/refresh (RT 쿠키로 AT 재발급)
  → 성공: GET /api/auth/me → user 상태 저장
  → 실패: user = null (로그인 페이지로)

모든 요청: Authorization: Bearer {accessToken} 헤더 자동 첨부
401 수신 시: 자동으로 /api/auth/refresh 재시도 → 실패 시 /login 이동
```

- Access Token: 메모리(`src/api/client.ts`의 `accessToken` 변수) 저장
- Refresh Token: httpOnly 쿠키 (서버가 Set-Cookie로 관리)
- `useAuth()` 훅으로 `user`, `setUser`, `isLoading` 접근

---

## API 호출 규칙

- 모든 HTTP 요청은 `src/api/client.ts`의 axios 인스턴스(`client`) 사용
- API 함수는 기능별로 `src/api/` 하위에 파일 분리
  ```
  src/api/
  ├── client.ts
  ├── auth.ts
  ├── project.ts
  ├── board.ts
  ├── calendar.ts
  ├── dashboard.ts
  └── todo.ts
  ```
- 직접 `axios.get(...)` 호출 금지. 반드시 `client.get(...)` 사용

---

## 코딩 규칙

- 컴포넌트 파일명: PascalCase (`CardItem.tsx`)
- 훅 파일명: camelCase, `use` 접두사 (`useProjects.ts`)
- 페이지 컴포넌트: `Page` 접미사 (`BoardPage.tsx`)
- Props 타입: 컴포넌트 파일 안에 `interface XxxProps` 로 선언
- shadcn 컴포넌트 커스터마이징은 `src/components/ui/` 안에서만