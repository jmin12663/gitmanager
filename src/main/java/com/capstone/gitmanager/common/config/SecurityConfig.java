package com.capstone.gitmanager.common.config;

import com.capstone.gitmanager.common.exception.ErrorCode;
import com.capstone.gitmanager.common.util.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.Map;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtUtil jwtUtil;
    private final ObjectMapper objectMapper;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // REST API이므로 웹사이트 CSRF 비활성화 (JWT로 인증하기 때문에 불필요)
                .csrf(AbstractHttpConfigurer::disable)
                // CorsConfig(WebMvcConfigurer)의 설정을 Spring Security에 위임
                .cors(Customizer.withDefaults())
                // 세션 미사용 토큰으로만 인증 — JWT 기반 무상태(Stateless) 인증
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // 로그인 없이 접근 허용하는 경로
                        .requestMatchers(
                                "/api/auth/send-email-code",  // 이메일 인증코드 전송
                                "/api/auth/verify-email-code",// 이메일 인증코드 확인
                                "/api/auth/register",         // 회원가입
                                "/api/auth/verify-email",     // 이메일 인증 (레거시)
                                "/api/auth/login",            // 로그인
                                "/api/auth/logout",           // 로그아웃
                                "/api/auth/refresh",          // 토큰 재발급
                                "/api/webhook/**"             // GitHub Webhook
                        ).permitAll()
                        .requestMatchers(
                                "/",
                                "/assets/**",
                                "/favicon.svg",
                                "/icons.svg",
                                "/{path:^(?!api)[^\\.]*}",
                                "/{path:^(?!api)[^\\.]*}/**"
                        ).permitAll() // React SPA 라우팅
                        // 그 외 모든 요청은 로그인(토큰) 필요
                        .anyRequest().authenticated()
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, e) -> {
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.setCharacterEncoding("UTF-8");
                            objectMapper.writeValue(response.getWriter(),
                                    Map.of("success", false,
                                            "error", Map.of(
                                                    "code", ErrorCode.UNAUTHORIZED.getCode(),
                                                    "message", ErrorCode.UNAUTHORIZED.getMessage())));
                        })
                )
                // JwtAuthenticationFilter를 Spring Security 필터 체인에 등록
                // UsernamePasswordAuthenticationFilter 이전에 실행되도록 설정
                .addFilterBefore(new JwtAuthenticationFilter(jwtUtil, objectMapper),
                        UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // 비밀번호 암호화 등록
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}