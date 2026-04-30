# FRONTEND.md — 프론트엔드 구현 가이드

---

## 기술 스택

| 항목 | 내용 |
|---|---|
| 번들러 | Vite |
| 프레임워크 | React 19 + TypeScript |
| 스타일 | Tailwind CSS v4 (`@tailwindcss/vite` 플러그인) + `--gm-*` CSS 변수 |
| UI 컴포넌트 | shadcn/ui |
| 라우팅 | react-router-dom |
| HTTP | axios (`src/api/client.ts`) |
| 드래그앤드롭 | @dnd-kit/core + @dnd-kit/sortable |
| 차트 | chart.js + react-chartjs-2 |
| 캘린더 | @fullcalendar/react |

---

## UI 참조

- `frontend/gitmanager-mockup.html` 파일이 전체 UI/UX 기준
- 이 파일의 디자인, 색상, 레이아웃, 컴포넌트 구조를 그대로 React로 옮길 것
- 신규 페이지 구현 전 반드시 이 파일에서 해당 섹션을 먼저 읽을 것

---

## CSS 디자인 시스템

shadcn/ui 기본 변수(`--background`, `--accent` 등)와 충돌을 피하기 위해
**`--gm-*` 접두사**를 붙인 커스텀 CSS 변수를 `src/index.css`에 정의해 사용한다.

```css
/* src/index.css 에 정의된 핵심 변수 */
--gm-bg: #0f1117          /* 최외곽 배경 */
--gm-bg2: #161b27         /* 카드/사이드바 배경 */
--gm-bg3: #1c2333         /* 입력창/서브 배경 */
--gm-bg4: #222940         /* 호버 배경 */
--gm-border: rgba(255,255,255,0.07)
--gm-border2: rgba(255,255,255,0.12)
--gm-text1: #f0f4ff       /* 주 텍스트 */
--gm-text2: #8b95b0       /* 보조 텍스트 */
--gm-text3: #4e5870       /* 비활성 텍스트 */
--gm-accent: #6366f1      /* 인디고 강조색 */
--gm-accent2: #818cf8
--gm-accent-bg: rgba(99,102,241,0.12)
--gm-accent-bg2: rgba(99,102,241,0.22)
--gm-green: #10b981
--gm-green-bg: rgba(16,185,129,0.12)
--gm-amber: #f59e0b
--gm-amber-bg: rgba(245,158,11,0.12)
--gm-red: #ef4444
--gm-red-bg: rgba(239,68,68,0.1)
--gm-radius: 8px
--gm-radius-lg: 12px
--gm-sidebar-w: 240px
--gm-topbar-h: 52px
```

컴포넌트별 CSS 클래스(`.auth-wrap`, `.sidebar`, `.todo-item` 등)도 모두 `index.css`에 정의한다.
Tailwind 임의값(`bg-[#0f1117]`)은 사용하지 않는다.

---

## 폴더 구조 (현재)

```
frontend/src/
├── api/
│   ├── client.ts          # axios 인스턴스 + Bearer 헤더 + 401 자동 refresh
│   ├── auth.ts            # login / register / verifyEmail / getMe
│   ├── project.ts         # getMyProjects / createProject / joinProject
│   ├── todo.ts            # getTodos / createTodo / toggleTodo / deleteTodo
│   ├── board.ts           # (미구현 — 기능 4)
│   ├── calendar.ts        # (미구현 — 기능 6)
│   └── dashboard.ts       # (미구현 — 기능 7)
├── components/
│   ├── AppLayout.tsx      # 사이드바 + topbar + <Outlet /> 레이아웃
│   └── ui/                # shadcn/ui 자동 생성 컴포넌트
├── pages/
│   ├── LoginPage.tsx      # ✅ 완료
│   ├── RegisterPage.tsx   # ✅ 완료
│   ├── VerifyPage.tsx     # ✅ 완료 (6자리 OTP)
│   ├── TodoPage.tsx       # ✅ 완료
│   ├── BoardPage.tsx      # 🔲 stub
│   ├── CalendarPage.tsx   # 🔲 stub
│   ├── DashboardPage.tsx  # 🔲 stub
│   └── SettingsPage.tsx   # 🔲 stub
├── store/
│   ├── authStore.ts       # AuthContext 타입 + useAuth 훅
│   └── AuthProvider.tsx   # 앱 시작 시 RT 쿠키로 세션 복구
├── types/
│   └── project.ts         # Project, ProjectRole 타입
├── index.css              # --gm-* 변수 + 전체 커스텀 CSS
└── App.tsx                # 라우터 설정
```

---

## 라우트 구조

```tsx
// App.tsx
<Routes>
  {/* 인증 불필요 — 레이아웃 없음 */}
  <Route path="/login"    element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
  <Route path="/verify"   element={<VerifyPage />} />

  {/* 인증 필요 — AppLayout (사이드바+topbar) 래핑 */}
  <Route element={<AppLayout />}>
    <Route path="/todo"                              element={<TodoPage />} />
    <Route path="/projects/:projectId/board"         element={<BoardPage />} />
    <Route path="/projects/:projectId/calendar"      element={<CalendarPage />} />
    <Route path="/projects/:projectId/dashboard"     element={<DashboardPage />} />
    <Route path="/projects/:projectId/settings"      element={<SettingsPage />} />
  </Route>

  <Route path="*" element={<Navigate to="/login" replace />} />
</Routes>
```

**라우트 보호**: `AppLayout`이 `useAuth()`로 user 상태를 확인 후 null이면 `/login`으로 리다이렉트.

---

## 인증 흐름

```
앱 시작
→ AuthProvider: POST /api/auth/refresh (RT 쿠키로 AT 재발급)
  → 성공: GET /api/auth/me → user 상태 저장
  → 실패: user = null (AppLayout이 /login으로 리다이렉트)

모든 요청: Authorization: Bearer {accessToken} 헤더 자동 첨부
401 수신 시: 자동으로 /api/auth/refresh 재시도 → 실패 시 /login 이동
```

- Access Token: 메모리(`src/api/client.ts`의 `accessToken` 변수) 저장
- Refresh Token: httpOnly 쿠키 (서버가 Set-Cookie로 관리)
- `useAuth()` 훅으로 `user`, `setUser`, `isLoading` 접근

---

## API 호출 규칙

- 모든 HTTP 요청은 `src/api/client.ts`의 `client` 인스턴스 사용
- 직접 `axios.get(...)` 호출 금지. 반드시 `client.get(...)` 사용
- API 함수는 기능별 파일로 분리 (`auth.ts`, `project.ts`, `todo.ts`, ...)
- 응답 구조: `res.data.data` 가 실제 페이로드 (`{ success, data, error }` 래핑)

---

## 코딩 규칙

- 컴포넌트 파일명: PascalCase (`CardItem.tsx`)
- 훅 파일명: camelCase, `use` 접두사 (`useProjects.ts`)
- 페이지 컴포넌트: `Page` 접미사 (`BoardPage.tsx`)
- Props 타입: 컴포넌트 파일 안에 `interface XxxProps` 로 선언
- shadcn 컴포넌트 커스터마이징은 `src/components/ui/` 안에서만
- 신규 CSS 클래스는 반드시 `src/index.css`에 `--gm-*` 변수를 사용해 추가

---

## 미구현 페이지 구현 시 참고

### BoardPage (기능 4)
- 백엔드 API: `GET /api/projects/:id/cards`, `POST /api/projects/:id/cards`, `PATCH /api/cards/:id`, `DELETE /api/cards/:id`
- `PATCH /api/cards/:id/status` — 상태 변경 (BACKLOG / IN_PROGRESS / DONE)
- 드래그앤드롭: `@dnd-kit/core` + `@dnd-kit/sortable`
- 3개 컬럼: Backlog / In Progress / Done
- 카드 클릭 → 상세 모달 (댓글, 브랜치 연결 포함)

### CalendarPage (기능 6)
- 백엔드 API: `GET /api/projects/:id/schedules?year=&month=`, `POST`, `PATCH`, `DELETE`
- `@fullcalendar/react` 사용
- 목업: 커스텀 캘린더 그리드 (FullCalendar 대신 직접 구현도 고려)

### DashboardPage (기능 7)
- 백엔드 API: `GET /api/projects/:id/dashboard`
- 응답: `{ cardSummary: {backlog, inProgress, done}, recentCommits: [...], memberCardCounts: [...] }`
- 도넛 차트: `react-chartjs-2`
- 멤버별 바 차트: 직접 구현 (CSS)

### SettingsPage (기능 8)
- OWNER 전용 접근
- GitHub 연동: `GET/POST /api/projects/:id/github`
- 초대 코드: `GET /api/projects/:id/invite-code`, `POST /api/projects/:id/invite-code/regenerate`
- 멤버 관리: `GET /api/projects/:id/members`, `DELETE /api/projects/:id/members/:userId`
- 프로젝트 삭제: `DELETE /api/projects/:id`