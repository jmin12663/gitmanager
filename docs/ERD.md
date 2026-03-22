# ERD — Git 연동 협업 관리 플랫폼

---

## 테이블 관계 요약

```
users (1) ─────────────── (N) refresh_tokens
users (1) ─────────────── (N) email_verification_tokens
users (1) ─────────────── (N) todos
users (N) ─────────────── (N) projects  →  user_project (중간 테이블)
projects (1) ──────────── (1) project_github
projects (1) ──────────── (N) cards
projects (1) ──────────── (N) schedules
cards (1) ──────────────── (N) card_branch
cards (1) ──────────────── (N) commit_logs
cards (1) ──────────────── (N) comments
cards (1) ──────────────── (0..1) schedules  (due_date 연동)
```

---

## DDL

```sql
-- 회원 (created_at, updated_at 은 BaseEntity 자동 관리)
CREATE TABLE users (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    email          VARCHAR(255) NOT NULL UNIQUE,
    password       VARCHAR(255) NOT NULL,
    name           VARCHAR(100) NOT NULL,
    email_verified BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at     DATETIME(6)  NOT NULL,
    updated_at     DATETIME(6)  NOT NULL,
    PRIMARY KEY (id)
);

-- 이메일 인증 토큰 (인증 완료 후 삭제)
CREATE TABLE email_verification_tokens (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    user_id    BIGINT       NOT NULL,
    token      VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME(6)  NOT NULL,
    created_at DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Refresh Token
-- is_used: 1차 구현에서는 미사용, 8주차 RTR 적용 시 활성화
CREATE TABLE refresh_tokens (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    user_id    BIGINT       NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    is_used    BOOLEAN      NOT NULL DEFAULT FALSE,
    expires_at DATETIME(6)  NOT NULL,
    created_at DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 프로젝트
CREATE TABLE projects (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    start_date  DATE,
    end_date    DATE,
    created_by  BIGINT       NOT NULL,
    invite_code VARCHAR(6)   NOT NULL UNIQUE,
    created_at  DATETIME(6)  NOT NULL,
    updated_at  DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (created_by) REFERENCES users (id)
);

-- 유저-프로젝트 (다대다, 복합 PK)
-- role: OWNER(생성자) / MEMBER(초대된 팀원)
CREATE TABLE user_project (
    user_id    BIGINT      NOT NULL,
    project_id BIGINT      NOT NULL,
    role       VARCHAR(10) NOT NULL,
    PRIMARY KEY (user_id, project_id),
    FOREIGN KEY (user_id)    REFERENCES users    (id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);

-- GitHub 연동 (project_id 가 PK 이자 FK → 프로젝트당 1개)
-- pat_encrypted: AES-256-CBC 암호화, 키는 환경변수 AES_SECRET_KEY
CREATE TABLE project_github (
    project_id     BIGINT       NOT NULL,
    repo_url       VARCHAR(255) NOT NULL,
    repo_name      VARCHAR(255) NOT NULL,
    pat_encrypted  VARCHAR(500) NOT NULL,
    webhook_secret VARCHAR(255) NOT NULL,
    created_at     DATETIME(6)  NOT NULL,
    updated_at     DATETIME(6)  NOT NULL,
    PRIMARY KEY (project_id),
    FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);

-- Board 카드
-- status: TODO / IN_PROGRESS / DONE
-- is_deleted: Soft Delete (JPA @SQLRestriction 으로 자동 필터링)
-- merged_at: main merge 시 기록
CREATE TABLE cards (
    id          BIGINT        NOT NULL AUTO_INCREMENT,
    project_id  BIGINT        NOT NULL,
    title       VARCHAR(255)  NOT NULL,
    status      VARCHAR(20)   NOT NULL DEFAULT 'TODO',
    assignee_id BIGINT,
    due_date    DATE,
    memo        VARCHAR(1000),
    image_url   VARCHAR(500),
    is_deleted  BOOLEAN       NOT NULL DEFAULT FALSE,
    created_by  BIGINT        NOT NULL,
    merged_at   DATETIME(6),
    created_at  DATETIME(6)   NOT NULL,
    updated_at  DATETIME(6)   NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (project_id)  REFERENCES projects (id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES users    (id) ON DELETE SET NULL,
    FOREIGN KEY (created_by)  REFERENCES users    (id)
);

-- 카드-branch 연결 (1카드 : N브랜치, 복합 PK)
CREATE TABLE card_branch (
    card_id     BIGINT       NOT NULL,
    branch_name VARCHAR(255) NOT NULL,
    repo_name   VARCHAR(255) NOT NULL,
    created_at  DATETIME(6)  NOT NULL,
    PRIMARY KEY (card_id, branch_name),
    FOREIGN KEY (card_id) REFERENCES cards (id) ON DELETE CASCADE
);

-- commit 이력
-- commit_sha UNIQUE → 동일 Webhook 중복 수신 방지 (멱등성)
CREATE TABLE commit_logs (
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    card_id      BIGINT       NOT NULL,
    commit_sha   VARCHAR(40)  NOT NULL UNIQUE,
    message      VARCHAR(500) NOT NULL,
    author       VARCHAR(100) NOT NULL,
    committed_at DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (card_id) REFERENCES cards (id) ON DELETE CASCADE
);

-- 댓글 (is_deleted: Soft Delete, 수정 기능 없음)
CREATE TABLE comments (
    id         BIGINT        NOT NULL AUTO_INCREMENT,
    card_id    BIGINT        NOT NULL,
    user_id    BIGINT        NOT NULL,
    content    VARCHAR(1000) NOT NULL,
    is_deleted BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at DATETIME(6)   NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (card_id) REFERENCES cards (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 일정 (card_id nullable → 카드 마감일 자동 연동 또는 독립 일정)
CREATE TABLE schedules (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    project_id BIGINT       NOT NULL,
    title      VARCHAR(255) NOT NULL,
    start_date DATE         NOT NULL,
    end_date   DATE         NOT NULL,
    created_by BIGINT       NOT NULL,
    card_id    BIGINT,
    created_at DATETIME(6)  NOT NULL,
    updated_at DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users    (id),
    FOREIGN KEY (card_id)    REFERENCES cards    (id) ON DELETE SET NULL
);

-- 개인 ToDo (수정 기능 있으나 수정 시점 추적 불필요)
CREATE TABLE todos (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    user_id    BIGINT       NOT NULL,
    content    VARCHAR(500) NOT NULL,
    is_done    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
```

---

## 핵심 설계 결정 사항

| 결정 | 이유 |
|------|------|
| `card_branch` 복합 PK `(card_id, branch_name)` | 1카드에 N브랜치 허용, 동일 카드+브랜치 중복 등록 방지 |
| `commit_logs.commit_sha` UNIQUE | Webhook 중복 수신 시 멱등성 보장 |
| `cards.is_deleted`, `comments.is_deleted` | Soft Delete — commit_logs, comments 연쇄 삭제 방지 |
| `comments` 에 `updated_at` 없음 | 댓글 수정 API 없음, 등록·삭제만 존재 |
| `todos` 에 `updated_at` 없음 | 개인 일정, 수정 시점 추적 불필요 |
| `project_github` PK = project_id | 프로젝트당 GitHub repo 1개 고정 |
| `project_github` 에 `created_at`, `updated_at` | PAT 암호화 데이터, 등록·수정 시점 감사 필요 |
| `user_project.role` OWNER/MEMBER | 초대 코드 조회·재발급, 팀원 강퇴 권한 분리 |
| `schedules.card_id` nullable | 카드 마감일 자동 연동 + 독립 일정 모두 수용 |
| `refresh_tokens.is_used` | 1차 미사용, 8주차 RTR 적용 시 활성화 |
| `pat_encrypted` AES-256-CBC | PAT 평문 저장 금지, 키는 환경변수 `AES_SECRET_KEY` |