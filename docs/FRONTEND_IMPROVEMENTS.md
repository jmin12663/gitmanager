# 프론트엔드 UI/UX 개선 사항

> 평가 기준: GitHub 연동 개발 일정 관리 도구 / 개발자 대상 / 데스크탑 중심
> 우선순위: 🔴 높음 · 🟡 중간 · 🟢 낮음

---

## 1. Board 페이지

### ✅ 카드에 브랜치 정보 표시 — 완료
- `DraggableCard` 컴포넌트에서 `card.branches` 렌더링 확인됨

---

### ✅ `confirm()` 삭제 확인 제거 — 완료
- `handleDeleteCard()`의 브라우저 기본 `confirm()` 제거
- 카드 상세 모달 하단 인라인 확인 UI (`delete-confirm-row`)로 교체

---

### 🟡 CardDetailModal 인라인 스타일 과다
- **현상**: `CardDetailModal` 전체가 `style={{ ... }}` 인라인 스타일로 작성됨
- **영향**: FRONTEND.md 규칙(신규 CSS는 `index.css`에 추가) 위반, 유지보수 어려움
- **해결**: `index.css`에 `.card-detail-*` 클래스 추가 후 교체

---

### 🟡 브랜치 입력 UX 개선
- **현상**: 카드 생성 모달에서 Repo + Branch 두 input이 나란히 있어 관계 불명확
- **해결**: 레이블을 "저장소 / 브랜치" 형식으로 명확히 하거나, 한 줄 `owner/repo:branch` 입력 방식 고려

---

### 🟢 완료 카드 시각 처리
- **현상**: Done 카드는 `opacity: 0.6`만 적용, 완료 시간·merge 정보 미표시
- **해결**: 완료 시간(`mergedAt`)을 카드 하단에 작게 표시

---

## 2. Dashboard 페이지

### ✅ 도넛 차트 크기 확대 — 완료
- SVG `100×100` → `140×140`, strokeWidth `14` → `12` 조정 완료

---

### ✅ 멤버 바 이름 영역 확대 — 완료
- `.member-bar-name` width `65px` → `84px` 수정 완료

---

### 🟢 데이터 범위 컨트롤 부재
- **현상**: 최근 커밋 개수/날짜 필터 없음
- **해결**: 추후 "최근 N개" 선택 드롭다운 또는 기간 필터 추가 고려

---

## 3. 로그인 / 인증 페이지

### 🟡 비활성 "GitHub로 계속하기" 버튼
- **현상**: `<button disabled>` 상태로 렌더링 — 클릭 불가 이유를 사용자가 알 수 없음
- **해결**: 버튼 제거하거나 `title="GitHub OAuth 연동은 설정 페이지에서 가능합니다"` tooltip 추가

---

### 🟢 로그인 헤딩 문구
- **현상**: `auth-title`이 "다시 오셨군요"로 고정 — 첫 방문자에게도 동일 문구
- **해결**: "로그인" 등 중립적 문구로 변경 또는 유지 (선택)

---

## 4. 레이아웃

### ✅ 프로필 라우트 — 완료
- `App.tsx`에 `/profile` 라우트 이미 등록됨

---

### ~~반응형 CSS~~ — 미적용 (데스크탑 전용 앱으로 결정)

---

## 5. 피드백 · 마이크로인터랙션

### 🔴 토스트/글로벌 알림 시스템 없음
- **현상**: DnD 이동 성공, 카드 저장, 댓글 삭제 등 모든 성공 액션에 시각적 피드백 없음
- **해결**: `sonner` 설치 후 주요 액션에 `toast.success()` / `toast.error()` 추가

---

### 🟡 로딩 스켈레톤 없음
- **현상**: 모든 로딩 상태가 "로딩 중..." 텍스트만 표시
- **해결**: Board, Dashboard 페이지에 Skeleton 컴포넌트 적용으로 체감 성능 개선

---

### ✅ 사이드바 user-role 동적화 — 완료
- `AppLayout.tsx` `"Developer"` 고정값 → `currentProject.myRole` 기반 `Owner` / `Member` / `—` 표시

---

## 6. 접근성 (Accessibility)

### ~~모달 ARIA 속성~~ — 미적용 (개발자 대상 도구로 실효성 없음)

### ~~닫기 버튼 aria-label~~ — 미적용 (동일 사유)

### 🟡 상태 구분이 색상만 사용
- **현상**: 카드 상태 badge(BACKLOG/IN_PROGRESS/DONE)가 색상으로만 구분됨
- **영향**: 색약 사용자 불리
- **해결**: 색상 + 텍스트 조합이 이미 있으므로, 추가로 아이콘 prefix 고려 (선택)

---

### 🟢 테마 토글 아이콘 유니코드 사용
- **현상**: `☀`, `◑` 유니코드 문자 사용 — 플랫폼/폰트마다 렌더 차이 발생 가능
- **해결**: SVG 아이콘으로 교체

---

## 7. 코드 품질 · 일관성

### 🟡 CSS 클래스 시맨틱 불일치
- **현상**: 설정/보드 모달 폼에서 `auth-field`, `auth-btn-primary` 등 인증 전용 클래스명 재사용
- **해결**: 공통 폼 클래스(`gm-field`, `gm-btn-primary`)로 이름 변경하고 auth-* 는 인증 페이지 전용으로 분리

---

### 🟢 `currentPage()` 함수 취약한 경로 매칭
- **현상**: `pathname.endsWith('/board')` 방식으로 현재 페이지 판단
- **해결**: React Router의 `useMatch` 훅 사용으로 교체

---

## 8. 디자인 시스템

### 🟡 shadcn 토큰 vs gm-\* 토큰 혼재
- **현상**: `index.css`에 shadcn 기본(`--background: oklch(1 0 0)`)과 gm-\* 변수가 병존
- **영향**: 라이트 모드 전환 시 일부 shadcn 컴포넌트가 gm-\* 테마를 따르지 않을 수 있음
- **해결**: shadcn 기본 변수(`--background` 등)를 gm-\* 값으로 오버라이드하여 단일 소스로 통합

---

## 잔여 개선 항목 요약

| 순위 | 항목 | 파일 | 난이도 |
|------|------|------|--------|
| 1 | 토스트 알림 도입 | 전역 | 중간 |
| 2 | CardDetailModal 인라인 스타일 정리 | `BoardPage.tsx` + `index.css` | 중간 |
| 3 | 비활성 GitHub 버튼 처리 | `LoginPage.tsx` | 낮음 |
| 4 | shadcn 토큰 통합 | `index.css` | 중간 |
| 5 | CSS 클래스 시맨틱 불일치 | 전역 | 중간 |
| 6 | 로딩 스켈레톤 | `BoardPage.tsx`, `DashboardPage.tsx` | 중간 |
| 7 | 완료 카드 mergedAt 표시 | `BoardPage.tsx` | 낮음 |
| 8 | 브랜치 입력 UX 개선 | `BoardPage.tsx` | 낮음 |