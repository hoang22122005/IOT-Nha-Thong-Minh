package com.iot.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iot.model.FireAlert;
import com.iot.model.TelemetryMessage;
import com.iot.service.AlertService;
import com.iot.service.DeviceStateService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

@Component
public class DeviceWebSocketHandler extends TextWebSocketHandler {
    private static final Logger log = LoggerFactory.getLogger(DeviceWebSocketHandler.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final WebSocketSessionRegistry sessionRegistry;
    private final DeviceStateService stateService;
    private final AlertService alertService;

    public DeviceWebSocketHandler(WebSocketSessionRegistry sessionRegistry,
                                  DeviceStateService stateService,
                                  AlertService alertService) {
        this.sessionRegistry = sessionRegistry;
        this.stateService = stateService;
        this.alertService = alertService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String deviceId = extractDeviceId(session);
        session.getAttributes().put("deviceId", deviceId);
        sessionRegistry.registerDevice(deviceId, session);

        // Đánh dấu thiết bị đã kết nối
        var state = stateService.getState(deviceId);
        state.setOnline(true);
        state.setLastSeenAt(System.currentTimeMillis());
        sessionRegistry.broadcastToDashboards(state);

        log.info("Device connected: {} from {}", deviceId, session.getRemoteAddress());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        JsonNode root = objectMapper.readTree(payload);

        String type = root.path("type").asText("TELEMETRY");
        String deviceId = (String) session.getAttributes().getOrDefault("deviceId", "esp32-room-01");

        if ("TELEMETRY".equalsIgnoreCase(type)) {
            TelemetryMessage telemetry = objectMapper.treeToValue(root, TelemetryMessage.class);
            telemetry.setDeviceId(deviceId);
            stateService.updateTelemetry(telemetry);
        } else if ("FIRE_ALERT".equalsIgnoreCase(type)) {
            FireAlert alert = objectMapper.treeToValue(root, FireAlert.class);
            alert.setDeviceId(deviceId);
            alertService.triggerAlert(alert);
        } else if ("PING".equalsIgnoreCase(type)) {
            // Trả về PONG theo chuẩn mục 4 của Plan IOT.txt
            Map<String, Object> pong = new HashMap<>();
            pong.put("type", "PONG");
            pong.put("serverTime", System.currentTimeMillis());
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(pong)));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String deviceId = (String) session.getAttributes().getOrDefault("deviceId", "esp32-room-01");
        sessionRegistry.unregisterDevice(deviceId);

        var state = stateService.getState(deviceId);
        state.setOnline(false);
        sessionRegistry.broadcastToDashboards(state);

        log.warn("Device disconnected: {} (Code: {})", deviceId, status.getCode());
    }

    private String extractDeviceId(WebSocketSession session) {
        URI uri = session.getUri();
        if (uri != null && uri.getQuery() != null) {
            for (String param : uri.getQuery().split("&")) {
                String[] pair = param.split("=");
                if (pair.length == 2 && "deviceId".equalsIgnoreCase(pair[0])) {
                    return pair[1];
                }
            }
        }
        return "esp32-room-01";
    }
}
