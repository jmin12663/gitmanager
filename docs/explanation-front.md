# Frontend 코드 설명

> 프론트엔드 위치: `gitmanager/frontend/src/`

---

## frontend/src/api/client.js
**역할**: axios 인스턴스 생성 및 인터셉터 설정. accessToken 메모리 저장소 역할도 겸함.
**함수 목록**:
- `getAccessToken` — 현재 accessToken 반환
- `setAccessToken(token)` — accessToken 메모리에 저장
- `clearAccessToken` — accessToken 초기화
**특이사항**:
- `withCredentials: true` — httpOnly 쿠키(Refresh Token) 자동 첨부에 필수
- 401 응답 시 `/auth/refresh` 자동 호출 후 원래 요청 재시도. 동시 401 발생 시 `failedQueue`로 대기 처리
- refresh 실패 시 `/login`으로 강제 리다이렉트
---

## frontend/src/api/auth.js
**역할**: 인증 관련 API 함수 모음.
**함수 목록**:
- `register(data)` — POST `/auth/register`
- `verifyEmail(email, code)` — POST `/auth/verify-email` → `{ email, code }`
- `login(data)` — POST `/auth/login` → `{ accessToken, userId, name, email }`
- `refresh()` — POST `/auth/refresh` → `{ accessToken }`
- `logout()` — POST `/auth/logout`
---

## frontend/src/api/project.js
**역할**: 프로젝트 CRUD 및 멤버 관리 API 함수 모음.
**함수 목록**:
- `getProjects()` — GET `/projects`
- `getProject(projectId)` — GET `/projects/:id`
- `createProject(data)` — POST `/projects`
- `updateProject(projectId, data)` — PUT `/projects/:id`
- `deleteProject(projectId)` — DELETE `/projects/:id`
- `joinProject(inviteCode)` — POST `/projects/join`
- `leaveProject(projectId, data)` — POST `/projects/:id/leave`
- `getInviteCode(projectId)` — GET `/projects/:id/invite-code`
- `regenerateInviteCode(projectId)` — POST `/projects/:id/invite-code/regenerate`
- `getMembers(projectId)` — GET `/projects/:id/members`
- `kickMember(projectId, targetUserId)` — DELETE `/projects/:id/members/:userId`
---

## frontend/src/api/board.js
**역할**: 칸반 보드 카드, 브랜치, 댓글 API 함수 모음.
**함수 목록**:
- `getBoard(projectId)` — GET `/projects/:id/board`
- `getCard(projectId, cardId)` — GET `/projects/:id/cards/:cardId`
- `createCard(projectId, data)` — POST `/projects/:id/cards`
- `updateCard(projectId, cardId, data)` — PATCH `/projects/:id/cards/:cardId`
- `updateCardStatus(projectId, cardId, status)` — PATCH `/projects/:id/cards/:cardId/status`
- `deleteCard(projectId, cardId)` — DELETE `/projects/:id/cards/:cardId`
- `addBranch(projectId, cardId, branchName, repoName)` — POST `/projects/:id/cards/:cardId/branches` → `{ branchName, repoName }`
- `removeBranch(projectId, cardId, branchName)` — DELETE `/projects/:id/cards/:cardId/branches/:branchName`
- `getComments(projectId, cardId)` — GET `/projects/:id/cards/:cardId/comments`
- `addComment(projectId, cardId, content)` — POST `/projects/:id/cards/:cardId/comments`
- `deleteComment(projectId, cardId, commentId)` — DELETE `/projects/:id/cards/:cardId/comments/:commentId`
**특이사항**: `addBranch`는 `branchName`, `repoName` 둘 다 필수 (@NotBlank)
---

## frontend/src/api/todo.js
**역할**: 개인 ToDo CRUD API 함수 모음.
**함수 목록**:
- `getTodos()` — GET `/todos`
- `createTodo(content)` — POST `/todos`
- `toggleTodo(todoId)` — PATCH `/todos/:id/toggle`
- `deleteTodo(todoId)` — DELETE `/todos/:id`
**특이사항**: 백엔드에 수정 엔드포인트(PUT /todos/:id) 없음 — `updateTodo` 미구현
---

## frontend/src/api/calendar.js
**역할**: 프로젝트 일정 CRUD API 함수 모음.
**함수 목록**:
- `getSchedules(projectId)` — GET `/projects/:id/schedules`
- `createSchedule(projectId, data)` — POST `/projects/:id/schedules`
- `updateSchedule(projectId, scheduleId, data)` — PUT `/projects/:id/schedules/:scheduleId`
- `deleteSchedule(projectId, scheduleId)` — DELETE `/projects/:id/schedules/:scheduleId`
---

## frontend/src/api/dashboard.js
**역할**: 프로젝트 대시보드 데이터 조회 API.
**함수 목록**:
- `getDashboard(projectId)` — GET `/projects/:id/dashboard` → 카드 현황, 커밋 목록, 멤버별 통계
---

## frontend/src/api/github.js
**역할**: GitHub 연동 설정 조회/저장/수정 API.
**함수 목록**:
- `getGithubConfig(projectId)` — GET `/projects/:id/github`
- `saveGithubConfig(projectId, data)` — POST `/projects/:id/github`
- `updateGithubConfig(projectId, data)` — PUT `/projects/:id/github`
---

## frontend/src/context/AuthContext.jsx
**역할**: 전역 인증 상태 관리. accessToken(메모리), user 정보(localStorage 복원), 로그인/로그아웃 함수 제공.
**제공 값**:
- `user` — `{ userId, name, email }` / 비로그인 시 `null`
- `loading` — 앱 초기 refresh 시도 중 여부
- `login(data)` — accessToken + user 저장
- `logout()` — accessToken + user 초기화
**사용처**: `useAuth` 훅을 통해 모든 인증 필요 컴포넌트에서 사용
**플로우**: 앱 마운트 → `refresh()` 호출 → 성공 시 localStorage에서 user 복원 → 실패 시 비로그인 처리
**특이사항**: `TokenRefreshResponse`는 `accessToken`만 반환 → user 정보는 `localStorage('gm_user')`에서 복구
---

## frontend/src/context/ProjectContext.jsx
**역할**: 현재 선택된 프로젝트 ID 전역 관리.
**제공 값**:
- `currentProjectId` — 현재 선택된 프로젝트 ID
- `setCurrentProjectId` — 프로젝트 변경 함수
**사용처**: Sidebar (프로젝트 선택), 각 페이지 (projectId 읽기)
**플로우**: Sidebar에서 프로젝트 클릭 → `setCurrentProjectId` → 각 페이지에서 `currentProjectId`로 API 호출
---

## frontend/src/hooks/useAuth.js
**역할**: `AuthContext`를 편리하게 사용하기 위한 커스텀 훅. Provider 외부 사용 시 에러 발생.
**제공 값**: `AuthContext`의 `{ user, loading, login, logout }` 그대로 반환
**사용처**: 인증 상태가 필요한 모든 컴포넌트
---

## frontend/src/App.jsx
**역할**: 라우터 정의 및 Provider 구성. PrivateRoute/PublicRoute로 인증 기반 접근 제어.
**사용 훅**: `useAuth`
**플로우**: `BrowserRouter` → `AuthProvider` → `ProjectProvider` → `PrivateRoute`(미로그인 시 `/login` 리다이렉트) / `PublicRoute`(로그인 시 `/` 리다이렉트)
**특이사항**: `loading` 중 PrivateRoute는 스피너 표시, PublicRoute는 null 반환
---
