# FRONTEND.md — 프론트엔드 구현 가이드

## 기술 스택

| 항목 | 내용 |
|---|---|
| 번들러 | Vite |
| 프레임워크 | React 19 + TypeScript |
| 스타일 | Tailwind CSS v4 + `--gm-*` CSS 변수 (`src/index.css`) |
| 라우팅 | react-router-dom |
| HTTP | axios (`src/api/client.ts`) |
| 드래그앤드롭 | @dnd-kit/core |
| 캘린더 | @fullcalendar/react |

---

## 폴더 구조

```
frontend/src/
├── api/           # 기능별 API 함수 (client.ts, auth.ts, board.ts ...)
├── components/
│   └── AppLayout.tsx   # 사이드바 + topbar + <Outlet />
├── pages/         # LoginPage / RegisterPage / VerifyPage / ProfilePage
│                  # TodoPage / BoardPage / CalendarPage / DashboardPage / SettingsPage
│                  # PullRequestsPage
├── store/
│   ├── authStore.ts    # AuthContext 타입 + useAuth 훅
│   └── AuthProvider.tsx # 앱 시작 시 RT 쿠키로 세션 복구
├── types/         # project.ts / board.ts / calendar.ts / dashboard.ts / pullrequest.ts
├── lib/
│   └── theme.ts   # 다크/라이트 테마 토글
├── index.css      # --gm-* 변수 + 전체 커스텀 CSS
└── App.tsx        # 라우터 설정
```

---

## 라우트 구조

```tsx
<Routes>
  {/* 인증 불필요 */}
  <Route path="/login"    element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
  <Route path="/verify"   element={<VerifyPage />} />

  {/* 인증 필요 — AppLayout 래핑 */}
  <Route element={<AppLayout />}>
    <Route path="/todo"                         element={<TodoPage />} />
    <Route path="/profile"                      element={<ProfilePage />} />
    <Route path="/projects/:projectId/board"    element={<BoardPage />} />
    <Route path="/projects/:projectId/calendar" element={<CalendarPage />} />
    <Route path="/projects/:projectId/dashboard" element={<DashboardPage />} />
    <Route path="/projects/:projectId/settings" element={<SettingsPage />} />
    <Route path="/projects/:projectId/pulls"   element={<PullRequestsPage />} />
  </Route>

  <Route path="*" element={<Navigate to="/login" replace />} />
</Routes>
```

`AppLayout`이 `useAuth()`로 user가 null이면 `/login`으로 리다이렉트.

---

## 인증 흐름

```
앱 시작 → AuthProvider: POST /api/auth/refresh (RT 쿠키 → AT 재발급)
  → 성공: GET /api/auth/me → user 저장
  → 실패: user = null → /login 리다이렉트

401 수신 시: 자동으로 /api/auth/refresh 재시도 → 실패 시 /login
```

- Access Token: 메모리 (`client.ts`의 `accessToken` 변수)
- Refresh Token: httpOnly 쿠키

---

## API 파일 목록

| 파일 | 주요 함수 |
|------|----------|
| `api/auth.ts` | login / register / sendEmailCode / verifyEmailCode / getMe / logout / updateProfile / checkLoginId / updateLoginId / changePassword |
| `api/project.ts` | getMyProjects / createProject / joinProject / getProject / getProjectMembers / updateProject |
| `api/todo.ts` | getTodos / createTodo / toggleTodo / deleteTodo |
| `api/board.ts` | getBoard / createCard / getCard / updateCard / updateCardStatus / deleteCard / getComments / createComment / deleteComment / addBranch / removeBranch |
| `api/calendar.ts` | getSchedules / createSchedule / updateSchedule / deleteSchedule |
| `api/dashboard.ts` | getDashboard |
| `api/settings.ts` | getInviteCode / regenerateInviteCode / getMembers / kickMember / leaveProject / deleteProject / getGithubConfig / getOAuthRedirectUrl |
| `api/pullrequest.ts` | getCardPullsApi / getProjectPullsApi / getPullFilesApi / createPrCommentApi |

---

## PR 기능 구조 (GitHub API 프록시)

PR 데이터는 DB에 저장하지 않고 GitHub API를 실시간 조회합니다.

- `PullRequestsPage.tsx` — `/projects/:id/pulls` 라우트. Open/Draft/Merged/Closed 탭 필터, "코드 보기" diff 뷰어, 라인 코멘트
- `BoardPage.tsx` — 카드 상세 모달에 PR 섹션 (브랜치 있을 때만 표시). `PR_REVIEW_UPDATED` WebSocket 이벤트 수신 시 자동 갱신
- `AppLayout.tsx` — 사이드바에 Pull Requests 메뉴 (`currentPage('/pulls')` 감지)

---

## API / CSS 규칙

- HTTP 요청은 반드시 `client.ts`의 `client` 인스턴스 사용 (직접 axios 호출 금지)
- 응답 구조: `res.data.data` 가 실제 페이로드 (`{ success, data }` 래핑)
- 신규 CSS 클래스는 `src/index.css`에 `--gm-*` 변수를 사용해 추가
- Tailwind 임의값(`bg-[#0f1117]`) 사용 금지