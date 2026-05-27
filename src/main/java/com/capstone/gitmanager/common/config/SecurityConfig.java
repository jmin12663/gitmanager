package com.capstone.gitmanager.common.config;

import com.capstone.gitmanager.common.exception.ErrorCode;
import com.capstone.gitmanager.common.util.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.context.annotation.Bean;

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
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/api/auth/github/login",     // GitHub 로그인 URL 요청
                                "/api/auth/github/callback",  // GitHub OAuth 콜백 (GitHub이 직접 호출)
                                "/api/auth/logout",
                                "/api/auth/refresh",
                                "/api/webhook/**",
                                "/api/github/oauth/callback",
                                "/ws/**"
                        ).permitAll()
                        .requestMatchers(
                                "/",
                                "/index.html",
                                "/assets/**",
                                "/favicon.svg",
                                "/icons.svg",
                                "/{path:^(?!api)[^\\.]*}",
                                "/{path:^(?!api)[^\\.]*}/**"
                        ).permitAll()
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
                .addFilterBefore(new JwtAuthenticationFilter(jwtUtil, objectMapper),
                        UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}