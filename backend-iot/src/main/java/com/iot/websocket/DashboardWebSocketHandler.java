package com.iot.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iot.model.DeviceState;
import com.iot.service.AlertService;
import com.iot.service.DeviceStateService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.HashMap;
import java.util.Map;

@Component
public class DashboardWebSocketHandler extends TextWebSocketHandler {
    private static final Logger log = LoggerFactory.getLogger(DashboardWebSocketHandler.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final WebSocketSessionRegistry sessionRegistry;
    private final DeviceStateService stateService;
    private final AlertService alertService;

    public DashboardWebSocketHandler(WebSocketSessionRegistry sessionRegistry,
                                     DeviceStateService stateService,
                                     AlertService alertService) {
        this.sessionRegistry = sessionRegistry;
        this.stateService = stateService;
        this.alertService = alertService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sessionRegistry.registerDashboard(session);

        // Gửi trạng thái hiện tại ngay khi Web vừa mở
        DeviceState state = stateService.getState("esp32-room-01");
        Map<String, Object> initPayload = new HashMap<>();
        initPayload.put("type", "INIT_STATE");
        initPayload.put("deviceState", state);
        initPayload.put("deviceStates", stateService.getAllStates());
        initPayload.put("alertHistory", alertService.getAlertHistory());

        synchronized (session) {
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(initPayload)));
        }
        log.info("Sent initial state to dashboard session {}", session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        JsonNode root = objectMapper.readTree(payload);
        String type = root.path("type").asText("");

        // Commands and alert acknowledgements use REST; this socket only
        // streams reported state and handles the browser's latency ping.
        if ("PING".equalsIgnoreCase(type)) {
            synchronized (session) {
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(Map.of(
                        "type", "PONG", "timestamp", root.path("timestamp").asLong()))));
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessionRegistry.unregisterDashboard(session);
        log.info("Dashboard session {} closed", session.getId());
    }
}
