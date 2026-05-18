package com.capstone.gitmanager.board.service;

import com.capstone.gitmanager.board.dto.BoardEventMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class BoardWebSocketService {

    private final SimpMessagingTemplate messagingTemplate;

    public void broadcast(Long projectId, BoardEventMessage message) {
        messagingTemplate.convertAndSend("/topic/projects/" + projectId + "/board", message);
    }
}