package com.capstone.gitmanager.common.config;

import com.capstone.gitmanager.common.exception.CustomException;
import com.capstone.gitmanager.common.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

// 토큰 검증
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        // 1. 헤더에서 토큰 추출
        String token = extractToken(request);

        if (token != null) {
            try {
                // 2. 토큰 서명/만료 검증 (실제 검증 핵심)
                jwtUtil.validate(token);
                // 3. 토큰에서 userId 추출
                Long userId = jwtUtil.getUserId(token);

                // 4. 검증 성공 → 로그인 유저로 등록 (이후 Controller에서 userId 사용 가능)
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(userId, null, List.of());
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (CustomException ignored) {
                // 5. 검증 실패 → 인증 없이 통과, SecurityConfig에서 403 처리
            }
        }

        // 6. 다음 필터 또는 Controller로 요청 전달
        filterChain.doFilter(request, response);
    }

    // 7. "Bearer {token}" 형식에서 토큰 값만 추출
    private String extractToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }
        return null;
    }
}