package com.iot.service;

import com.iot.model.FireAlert;
import com.iot.websocket.WebSocketSessionRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class AlertService {
    private static final Logger log = LoggerFactory.getLogger(AlertService.class);

    private final WebSocketSessionRegistry sessionRegistry;
    private final StatePersistenceService persistenceService;
    private final List<FireAlert> alertHistory = new CopyOnWriteArrayList<>();

    public AlertService(WebSocketSessionRegistry sessionRegistry, StatePersistenceService persistenceService) {
        this.sessionRegistry = sessionRegistry;
        this.persistenceService = persistenceService;
        this.alertHistory.addAll(persistenceService.loadAlerts());
    }

    public void triggerAlert(FireAlert alert) {
        if (alert.getAlertId() == null || alert.getAlertId().isBlank()) {
            alert.setAlertId(UUID.randomUUID().toString());
        }
        if (alert.getTimestamp() == null || alert.getTimestamp() <= 0) {
            alert.setTimestamp(System.currentTimeMillis());
        }
        alert.setType("ALERT");
        alert.setActive(true);
        alert.setAcknowledged(false);

        for (FireAlert existing : alertHistory) {
            if (alert.getAlertId().equals(existing.getAlertId())) return;
        }
        if (persistenceService.alertExists(alert.getAlertId())) return;

        log.warn("FIRE ALERT TRIGGERED: {} - Temperature: {}°C", alert.getMessage(), alert.getTemperature());
        alertHistory.add(0, alert); // Thêm vào đầu danh sách
        persistenceService.saveAlert(alert);
        if (alertHistory.size() > 50) {
            alertHistory.remove(alertHistory.size() - 1);
        }
        // Phát cảnh báo đỏ khẩn cấp tới Web Dashboard
        sessionRegistry.broadcastToDashboards(alert);
    }

    public List<FireAlert> getAlertHistory() {
        return alertHistory;
    }

    public void acknowledgeAlert(String alertId) {
        for (FireAlert alert : alertHistory) {
            if (alert.getAlertId() != null && alert.getAlertId().equals(alertId)) {
                alert.setSeverity("ACKNOWLEDGED");
                alert.setAcknowledged(true);
                persistenceService.saveAlert(alert);
                break;
            }
        }
        // Thông báo đã xác nhận
        Map<String, Object> ack = Map.of(
                "type", "ALERT_ACK",
                "alertId", alertId,
                "acknowledged", true,
                "timestamp", System.currentTimeMillis());
        sessionRegistry.broadcastToDashboards(ack);
    }

    public void clearActiveAlertsForDevice(String deviceId) {
        boolean cleared = false;
        for (FireAlert alert : alertHistory) {
            if (deviceId.equals(alert.getDeviceId()) && Boolean.TRUE.equals(alert.getActive())) {
                alert.setActive(false);
                cleared = true;
            }
        }
        if (cleared) {
            alertHistory.stream()
                    .filter(alert -> deviceId.equals(alert.getDeviceId()) && Boolean.FALSE.equals(alert.getActive()))
                    .forEach(persistenceService::saveAlert);
            persistenceService.markDeviceAlertsCleared(deviceId);
            sessionRegistry.broadcastToDashboards(Map.of(
                    "type", "ALERT_CLEARED",
                    "deviceId", deviceId,
                    "timestamp", System.currentTimeMillis()));
        }
    }
}
