package com.capstone.gitmanager.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendVerificationEmail(String to, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject("[GitManager] 이메일 인증");
        message.setText("아래 인증번호를 입력하여 이메일 인증을 완료하세요.\n\n인증번호: " + code +
                "\n\n인증번호는 30분간 유효합니다.");
        mailSender.send(message);
    }
}