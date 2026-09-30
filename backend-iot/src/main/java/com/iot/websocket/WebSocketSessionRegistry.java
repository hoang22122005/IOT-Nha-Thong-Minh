package com.iot.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class WebSocketSessionRegistry {
    private static final Logger log = LoggerFactory.getLogger(WebSocketSessionRegistry.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Lưu các phiên kết nối của thiết bị ESP32 (deviceId -> WebSocketSession)
    private final Map<String, WebSocketSession> deviceSessions = new ConcurrentHashMap<>();

    // Lưu các phiên kết nối của Web Dashboard client
    private final Set<WebSocketSession> dashboardSessions = ConcurrentHashMap.newKeySet();

    public void registerDevice(String deviceId, WebSocketSession session) {
        deviceSessions.put(deviceId, session);
        log.info("ESP32 Device registered: {} (Session ID: {})", deviceId, session.getId());
    }

    public void unregisterDevice(String deviceId) {
        deviceSessions.remove(deviceId);
        log.info("ESP32 Device unregistered: {}", deviceId);
    }

    public WebSocketSession getDeviceSession(String deviceId) {
        return deviceSessions.get(deviceId);
    }

    public boolean isDeviceConnected(String deviceId) {
        WebSocketSession session = deviceSessions.get(deviceId);
        return session != null && session.isOpen();
    }

    public void registerDashboard(WebSocketSession session) {
        dashboardSessions.add(session);
        log.info("Dashboard client registered: {}", session.getId());
    }

    public void unregisterDashboard(WebSocketSession session) {
        dashboardSessions.remove(session);
        log.info("Dashboard client unregistered: {}", session.getId());
    }

    // Gửi dữ liệu xuống thiết bị ESP32
    public boolean sendToDevice(String deviceId, Object message) {
        WebSocketSession session = deviceSessions.get(deviceId);
        if (session != null && session.isOpen()) {
            try {
                String payload = (message instanceof String) ? (String) message : objectMapper.writeValueAsString(message);
                synchronized (session) {
                    session.sendMessage(new TextMessage(payload));
                }
                log.info("Sent command to device {}: {}", deviceId, payload);
                return true;
            } catch (IOException e) {
                log.error("Failed to send message to device: {}", deviceId, e);
            }
        } else {
            log.warn("Device {} is not connected via WebSocket!", deviceId);
        }
        return false;
    }

    // Phát quảng bá dữ liệu (Telemetry / Alert) tới tất cả Web Dashboard đang mở
    public void broadcastToDashboards(Object message) {
        if (dashboardSessions.isEmpty()) {
            return;
        }
        try {
            String payload = (message instanceof String) ? (String) message : objectMapper.writeValueAsString(message);
            TextMessage textMessage = new TextMessage(payload);

            for (WebSocketSession session : dashboardSessions) {
                if (session.isOpen()) {
                    try {
                        synchronized (session) {
                            session.sendMessage(textMessage);
                        }
                    } catch (IOException e) {
                        log.error("Failed to send to dashboard session: {}", session.getId(), e);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error broadcasting message to dashboards", e);
        }
    }
}
