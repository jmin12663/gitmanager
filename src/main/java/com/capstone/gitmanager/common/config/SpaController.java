package com.capstone.gitmanager.common.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * React SPA 라우팅 지원 — /login, /board 등 직접 접근·새로고침 시 index.html 반환
 * /api/** 는 제외 (REST API 그대로 처리)
 */
@Controller
public class SpaController {

    @GetMapping(value = {
            "/",
            "/{path:^(?!api|static)[^\\.]*}",
            "/{path:^(?!api|static)[^\\.]*}/**"
    })
    public String forward() {
        return "forward:/index.html";
    }
}