package com.capstone.gitmanager.common.config;

import com.capstone.gitmanager.common.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtUtil jwtUtil;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // REST API이므로 웹사이트 CSRF 비활성화 (JWT로 인증하기 때문에 불필요)
                .csrf(AbstractHttpConfigurer::disable)
                // 세션 미사용 토큰으로만 인증 — JWT 기반 무상태(Stateless) 인증
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // 로그인 없이 접근 허용하는 경로
                        .requestMatchers(
                                "/api/auth/register",    // 회원가입
                                "/api/auth/verify-email",// 이메일 인증
                                "/api/auth/login",       // 로그인
                                "/api/auth/refresh",     // 토큰 재발급
                                "/api/webhook/**"        // GitHub Webhook (JWT 대신 GitHub Secret으로 검증)
                        ).permitAll()
                        // 그 외 모든 요청은 로그인(토큰) 필요
                        .anyRequest().authenticated()
                )
                // JwtAuthenticationFilter를 Spring Security 필터 체인에 등록
                // UsernamePasswordAuthenticationFilter 이전에 실행되도록 설정
                .addFilterBefore(new JwtAuthenticationFilter(jwtUtil),
                        UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // 비밀번호 암호화 등록
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}