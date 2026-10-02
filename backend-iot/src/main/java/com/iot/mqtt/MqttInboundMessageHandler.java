package com.iot.mqtt;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.iot.model.FireAlert;
import com.iot.model.TelemetryMessage;
import com.iot.model.NodeCapabilities;
import com.iot.service.AlertService;
import com.iot.service.AutomationRuleService;
import com.iot.service.DeviceStateService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class MqttInboundMessageHandler {
    private static final Logger log = LoggerFactory.getLogger(MqttInboundMessageHandler.class);
    private final ObjectMapper objectMapper;
    private final DeviceStateService deviceStateService;
    private final AlertService alertService;
    private final AutomationRuleService automationRuleService;

    public MqttInboundMessageHandler(ObjectMapper objectMapper,
                                     DeviceStateService deviceStateService,
                                     AlertService alertService,
                                     AutomationRuleService automationRuleService) {
        this.objectMapper = objectMapper;
        this.deviceStateService = deviceStateService;
        this.alertService = alertService;
        this.automationRuleService = automationRuleService;
    }

    @EventListener
    public void handle(MqttInboundMessageEvent event) {
        try {
            if (event.topic().endsWith("/telemetry")) {
                TelemetryMessage telemetry = objectMapper.readValue(event.payload(), TelemetryMessage.class);
                applyTelemetryTopicContext(telemetry, event.topic());
                deviceStateService.updateTelemetry(telemetry);
                automationRuleService.evaluate(telemetry);
                log.debug("Accepted MQTT telemetry from {}", telemetry.getDeviceId());
            } else if (event.topic().endsWith("/state") && event.topic().contains("/device/")) {
                TelemetryMessage state = objectMapper.readValue(event.payload(), TelemetryMessage.class);
                applyTelemetryTopicContext(state, event.topic());
                deviceStateService.updateTelemetry(state);
                log.debug("Accepted MQTT reported state from {}", state.getDeviceId());
            } else if (event.topic().endsWith("/heartbeat")) {
                TelemetryMessage state = objectMapper.readValue(event.payload(), TelemetryMessage.class);
                applyTelemetryTopicContext(state, event.topic());
                deviceStateService.updateTelemetry(state);
                log.debug("Accepted MQTT heartbeat from {}", state.getDeviceId());
            } else if (event.topic().endsWith("/capabilities") && event.topic().contains("/node/")) {
                NodeCapabilities capabilities = objectMapper.readValue(event.payload(), NodeCapabilities.class);
                String[] parts = event.topic().split("/");
                if (parts.length == 5) {
                    capabilities.setDeviceId(parts[3]);
                    capabilities.setHomeId(parts[1]);
                    deviceStateService.updateCapabilities(capabilities);
                }
            } else if (event.topic().endsWith("/status")) {
                com.fasterxml.jackson.databind.JsonNode status = objectMapper.readTree(event.payload());
                String[] topicParts = event.topic().split("/");
                String deviceId = status.path("deviceId").asText(topicParts.length >= 5 ? topicParts[3] : "");
                String homeId = topicParts.length >= 5 ? topicParts[1] : null;
                if (!deviceId.isBlank() && status.has("online")) {
                    boolean online = status.path("online").asBoolean();
                    // A retained "online" message only describes the node's last
                    // connection. It can outlive the ESP32 and must not refresh its
                    // heartbeat when the backend subscribes or reconnects.
                    if (event.retained() && online) {
                        log.debug("Ignoring stale retained online status for {}", deviceId);
                        return;
                    }
                    deviceStateService.updateNodeStatus(deviceId, homeId, online);
                }
            } else if (event.topic().endsWith("/alert/fire")) {
                FireAlert alert = objectMapper.readValue(event.payload(), FireAlert.class);
                String[] topicParts = event.topic().split("/");
                if (topicParts.length >= 5) {
                    if (alert.getHomeId() == null) alert.setHomeId(topicParts[1]);
                    if (alert.getRoomId() == null) alert.setRoomId(topicParts[2]);
                }
                if (Boolean.FALSE.equals(alert.getActive())) {
                    if (alert.getDeviceId() != null && !alert.getDeviceId().isBlank()) {
                        alertService.clearActiveAlertsForDevice(alert.getDeviceId());
                    } else {
                        log.warn("Ignoring fire-alert clear without deviceId");
                    }
                } else {
                    alertService.triggerAlert(alert);
                }
            } else {
                log.debug("Received MQTT project message on {}", event.topic());
            }
        } catch (Exception e) {
            log.warn("Ignoring invalid MQTT payload on topic {}: {}", event.topic(), e.getMessage());
        }
    }

    private void applyTelemetryTopicContext(TelemetryMessage message, String topic) {
        String[] parts = topic.split("/");
        if (parts.length < 5) return;
        message.setHomeId(parts[1]);
        if (topic.contains("/sensor/") && parts.length >= 6) {
            message.setRoomId(parts[2]);
            message.setSensorId(parts[4]);
        } else if (topic.contains("/node/")) {
            message.setDeviceId(parts[3]);
        } else if (topic.contains("/device/")) {
            message.setDeviceId(parts[4]);
        }
    }
}
