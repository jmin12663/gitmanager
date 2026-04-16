# FRONTEND.md — 프론트엔드 구현 지침서

> Claude Code가 프론트 작업 시 이 파일을 먼저 읽고 시작할 것.
> 디자인 일관성과 구현 맥락 유지가 목적.

---

## 1. 프로젝트 위치 & 세팅

| 항목 | 값 |
|------|----|
| 위치 | `/Users/shinjeongmin/IdeaProjects/gitmanager/frontend/` |
| 번들러 | Vite + React |
| 패키지 매니저 | npm |
| 백엔드 주소 | `http://localhost:8080` (Vite proxy 설정) |

---

## 2. 기술 스택

| 역할 | 라이브러리 |
|------|-----------|
| 런타임 | React 19 |
| 번들러 | Vite 8 |
| 라우팅 | React Router v7 |
| HTTP | Axios |
| 스타일 | Tailwind CSS v4 (`@tailwindcss/vite` 플러그인, `tailwind.config.js` 없음) |
| UI 컴포넌트 | `@base-ui/react` (primitives) + shadcn CLI (컴포넌트 생성 도구) |
| 캘린더 | FullCalendar (미설치, 구현 시 추가) |
| 차트 | Chart.js + react-chartjs-2 (미설치, 구현 시 추가) |
| 드래그앤드롭 | @dnd-kit/core (미설치, 구현 시 추가) |
| 상태 관리 | Context API (별도 라이브러리 없음) |

---

## 3. 디자인 시스템

### 3-1. 기본 원칙
- **미니멀 라이트 테마** — 흰 배경, 연한 회색 구분선, 텍스트 위주
- 색은 최소화. 포인트 컬러는 primary(거의 검정)만 사용
- 여백과 구조로 정리된 느낌. 불필요한 그림자·그라디언트 없음
- 버튼, 카드 등 UI 요소는 작고 깔끔하게

### 3-2. Tailwind v4 설정 방식

> **주의**: Tailwind v4는 `tailwind.config.js`가 없다. CSS 변수 기반으로 동작한다.

```css
/* index.css — Tailwind v4 진입점 */
@import "tailwindcss";        /* Tailwind v4 핵심 */
@import "tw-animate-css";     /* 애니메이션 유틸 */
@import "shadcn/tailwind.css"; /* shadcn 토큰 연결 */
```

```js
// vite.config.js — 플러그인으로 통합 (postcss 설정 불필요)
import tailwindcss from '@tailwindcss/vite'
plugins: [react(), tailwindcss()]
```

색상 커스텀은 `index.css`의 `@theme inline` 블록에서 CSS 변수로 정의한다.  
`bg-primary`, `text-foreground` 등 시맨틱 토큰 클래스를 사용한다.

### 3-3. 색상 토큰 (CSS 변수 기반)

| 역할 | CSS 변수 | Tailwind 클래스 |
|------|---------|----------------|
| 기본 배경 | `--background` | `bg-background` |
| 기본 텍스트 | `--foreground` | `text-foreground` |
| 카드 배경 | `--card` | `bg-card` |
| 보조 텍스트 | `--muted-foreground` | `text-muted-foreground` |
| 테두리 | `--border` | `border-border` |
| 포인트 (버튼 등) | `--primary` | `bg-primary text-primary-foreground` |
| 호버 배경 | `--muted` | `hover:bg-muted` |

### 3-4. 카드 상태 배지 색상

| 상태 | Tailwind 클래스 |
|------|----------------|
| BACKLOG | `bg-gray-100 text-gray-600` |
| IN_PROGRESS | `bg-blue-50 text-blue-600` |
| DONE | `bg-green-50 text-green-600` |

### 3-5. 타이포그래피

| 용도 | 클래스 |
|------|--------|
| 페이지 제목 | `text-xl font-semibold text-foreground` |
| 섹션 제목 | `text-sm font-medium text-foreground` |
| 본문 | `text-sm text-foreground` |
| 보조 텍스트 | `text-xs text-muted-foreground` |

### 3-6. 공통 컴포넌트 스타일 가이드

```
카드(칸반): bg-card rounded-lg border border-border p-4 shadow-none
입력 필드: border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring
버튼 (primary): bg-primary text-primary-foreground text-sm px-4 py-2 rounded-md
버튼 (ghost): text-muted-foreground text-sm px-4 py-2 rounded-md hover:bg-muted
구분선: border-t border-border
```

### 3-7. UI 컴포넌트 사용 방법

`src/components/ui/`에 이미 생성된 컴포넌트 우선 사용.  
새 컴포넌트 필요 시 shadcn CLI로 추가:
```bash
npx shadcn add <component-name>
```
내부적으로 `@base-ui/react` primitives를 래핑한 구조다.

---

## 4. 폴더 구조

```
gitmanager/frontend/
├── public/
└── src/
    ├── api/
    │   ├── client.js          # axios 인스턴스 + interceptor
    │   ├── auth.js
    │   ├── project.js
    │   ├── board.js
    │   ├── calendar.js
    │   ├── dashboard.js
    │   ├── todo.js
    │   └── github.js
    ├── context/
    │   ├── AuthContext.jsx    # accessToken(메모리), 로그인 유저 정보
    │   └── ProjectContext.jsx # 현재 선택된 projectId
    ├── components/
    │   ├── layout/
    │   │   ├── AppLayout.jsx  # 사이드바 + 메인 영역 전체 틀
    │   │   └── Sidebar.jsx    # 프로젝트 목록 + 네비게이션
    │   └── ui/                # shadcn CLI로 생성된 컴포넌트 (button, input, label 등)
    ├── pages/
    │   ├── auth/
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   └── VerifyPage.jsx
    │   ├── todo/
    │   │   └── TodoPage.jsx
    │   ├── board/
    │   │   ├── BoardPage.jsx
    │   │   └── CardModal.jsx
    │   ├── calendar/
    │   │   └── CalendarPage.jsx
    │   ├── dashboard/
    │   │   └── DashboardPage.jsx
    │   └── project/
    │       └── ProjectSettingsPage.jsx
    ├── hooks/
    │   └── useAuth.js         # AuthContext를 쓰기 편하게 래핑
    ├── utils/
    │   └── date.js            # 날짜 포맷 유틸
    ├── App.jsx                # 라우터 정의
    └── main.jsx
```

---

## 5. 라우팅 구조

```
/login          LoginPage   (비인증)
/register       RegisterPage (비인증)
/verify         VerifyPage  (비인증) — 이메일 + 6자리 코드 입력 폼. URL ?email=xxx 로 이메일 자동 세팅 가능.
                              POST /api/auth/verify-email { email, code } 호출

/               AppLayout   (PrivateRoute — 비로그인 시 /login 리다이렉트)
                → 진입 시 기본 리다이렉트:
                  프로젝트 있음 → 첫 번째 프로젝트의 /projects/:id/board
                  프로젝트 없음 → /todos
├── /todos                  TodoPage
└── /projects/:projectId
    ├── /board              BoardPage
    ├── /calendar           CalendarPage
    ├── /dashboard          DashboardPage
    └── /settings           ProjectSettingsPage
```

---

## 6. 인증 흐름 구현

```
앱 첫 로드
  → AuthContext 초기화 시 POST /api/auth/refresh 호출
  → 성공 → accessToken 메모리 저장, 로그인 상태 유지
  → 실패 → 비로그인 상태 (refreshToken 쿠키 없음)

로그인
  → POST /api/auth/login
  → 응답: { accessToken, userId, name, email }
  → accessToken → AuthContext state에 저장
  → refreshToken → 백엔드가 httpOnly 쿠키로 자동 설정

axios interceptor
  → 요청 전: Authorization: Bearer {accessToken} 헤더 자동 첨부
  → 응답 401: POST /api/auth/refresh 호출 → 새 accessToken 저장 → 원래 요청 재시도
  → refresh 실패: AuthContext 초기화 → /login 리다이렉트

로그아웃
  → POST /api/auth/logout
  → AuthContext 초기화
  → /login 리다이렉트
```

---

## 7. API 클라이언트 규칙

- `src/api/client.js`에 axios 인스턴스 1개만 생성 (`baseURL: /api`)
- **`withCredentials: true` 필수** — httpOnly 쿠키(Refresh Token)가 요청에 자동 첨부되려면 반드시 설정해야 함
- Vite proxy로 `/api` → `http://localhost:8080` 포워딩 (CORS 우회)
- 모든 API 함수는 `src/api/` 도메인별 파일에 작성
- 응답은 `response.data.data`에서 꺼내서 반환 (ApiResponse 래퍼 벗기기)

```js
// client.js 핵심 설정
const client = axios.create({
  baseURL: '/api',
  withCredentials: true,  // httpOnly 쿠키 자동 첨부 (Refresh Token)
});

// 예시 패턴
export const getBoard = (projectId) =>
  client.get(`/projects/${projectId}/board`).then(res => res.data.data);
```

---

## 8. 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 파일 | PascalCase | `CardModal.jsx` |
| 일반 JS 파일 | camelCase | `client.js`, `date.js` |
| 컴포넌트 함수 | PascalCase | `function CardModal()` |
| 이벤트 핸들러 | handle + 동사 | `handleSubmit`, `handleDelete` |
| API 함수 | 동사 + 명사 | `getBoard`, `createCard`, `updateSchedule` |
| Context | 명사 + Context | `AuthContext`, `ProjectContext` |

---

## 9. 구현 순서

| 단계 | 내용 |
|------|------|
| 1 | ✅ 완료 — Vite 8, Tailwind v4, @base-ui/react, React Router v7, axios client |
| 2 | AuthContext + 로그인 / 회원가입 / 이메일 인증 페이지 |
| 3 | AppLayout + Sidebar (프로젝트 목록, 생성/참여 모달) |
| 4 | TodoPage |
| 5 | BoardPage (칸반 3컬럼 + dnd-kit) + CardModal |
| 6 | CalendarPage (FullCalendar + 일정 CRUD) |
| 7 | DashboardPage (Chart.js 통계 + 커밋 목록) |
| 8 | ProjectSettingsPage (GitHub 연동, 멤버 관리, 초대코드) |