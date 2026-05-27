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

### ✅ CardDetailModal 인라인 스타일 정리 — 완료
- `index.css`에 `.card-detail-*`, `.assignee-chip`, `.branch-tag`, `.card-footer-meta` 등 클래스 추가
- `BoardPage.tsx`의 `style={{ ... }}` 인라인 스타일 전량 교체 (동적 avatar 색상만 유지)

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

## 4. 레이아웃

### ✅ 프로필 라우트 — 완료
- `App.tsx`에 `/profile` 라우트 이미 등록됨

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

### 🟡 상태 구분이 색상만 사용
- **현상**: 카드 상태 badge(BACKLOG/IN_PROGRESS/DONE)가 색상으로만 구분됨
- **영향**: 색약 사용자 불리
- **해결**: 색상 + 텍스트 조합이 이미 있으므로, 추가로 아이콘 prefix 고려 (선택)

---

## 7. 코드 품질 · 일관성

### 🟡 CSS 클래스 시맨틱 불일치
- **현상**: 설정/보드 모달 폼에서 `auth-field`, `auth-btn-primary` 등 인증 전용 클래스명 재사용
- **해결**: 공통 폼 클래스(`gm-field`, `gm-btn-primary`)로 이름 변경하고 auth-* 는 인증 페이지 전용으로 분리

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
| 2 | 비활성 GitHub 버튼 처리 | `LoginPage.tsx` | 낮음 |
| 3 | shadcn 토큰 통합 | `index.css` | 중간 |
| 4 | CSS 클래스 시맨틱 불일치 | 전역 | 중간 |
| 5 | 로딩 스켈레톤 | `BoardPage.tsx`, `DashboardPage.tsx` | 중간 |
| 6 | 완료 카드 mergedAt 표시 | `BoardPage.tsx` | 낮음 |
| 7 | 브랜치 입력 UX 개선 | `BoardPage.tsx` | 낮음 |