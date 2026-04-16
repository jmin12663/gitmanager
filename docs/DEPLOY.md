# 배포 가이드

## 배포 아키텍처

```
Postman / 브라우저
    ↓  HTTP :8080
AWS EC2 (Ubuntu 22.04, Java 21)
  └── Spring Boot JAR  (spring.profiles.active=prod)
    ↓  JDBC :3306
AWS RDS (MySQL 8.0)  ←  DB명: gitmanager
```

## 배포 전 체크리스트

- [ ] `./gradlew clean build -x test` 빌드 성공 확인
- [ ] AWS RDS 생성 (MySQL 8.0, db.t3.micro)
  - DB 이름: `gitmanager`
  - 보안그룹: EC2 → RDS 3306 인바운드 허용
- [ ] AWS EC2 생성 (Ubuntu 22.04, t2.micro)
  - 보안그룹 인바운드: 22(SSH), 8080(앱) 오픈
- [ ] EC2에 Java 21 설치: `sudo apt install -y openjdk-21-jre-headless`
- [ ] JAR 업로드: `scp -i key.pem build/libs/*.jar ubuntu@<EC2_IP>:/home/ubuntu/app.jar`
- [ ] EC2 환경변수 설정 후 앱 기동 (아래 참조)
- [ ] RefreshToken 쿠키에 `setSecure(true)`, `setSameSite("Strict")` 추가 (AuthService.java - setRefreshTokenCookie)
- [ ] `application.yaml` `show-sql: true` → `false` 로 변경 (또는 배포용 프로파일에서 override)

## EC2 기동 명령어

```bash
export DB_HOST=<RDS_ENDPOINT>
export DB_USERNAME=<RDS_USERNAME>
export DB_PASSWORD=<RDS_PASSWORD>
export JWT_SECRET=<JWT_SECRET>
export AES_SECRET_KEY=<AES_SECRET_KEY>
export MAIL_USERNAME=<GMAIL_ADDRESS>
export MAIL_PASSWORD=<GMAIL_APP_PASSWORD>

nohup java -Dspring.profiles.active=prod -jar app.jar > app.log 2>&1 &
tail -f app.log   # 기동 로그 확인
```

## 시연 순서

| # | 행동 | 확인 포인트 |
|---|------|-------------|
| 1 | `POST http://<EC2_IP>:8080/api/auth/register` 호출 | `{"success": true}` 응답 + 이메일 인증 메일 수신 |
| 2 | 이메일 인증 링크 클릭 (또는 토큰 직접 입력) | 인증 완료 응답 확인 |
| 3 | `POST http://<EC2_IP>:8080/api/auth/login` 호출 | `accessToken`, `refreshToken` 발급 확인 |
| 4 | MySQL Workbench로 RDS 접속 후 쿼리 실행 | `password` 컬럼이 `$2a$10$...` 형태(BCrypt) 확인 |

## RDS 암호화 확인 쿼리

```sql
SELECT login_id, email, password, email_verified
FROM users
ORDER BY created_at DESC
LIMIT 5;
```

→ `password` 값이 `$2a$10$` 로 시작하면 BCrypt 암호화 저장 증명 완료.