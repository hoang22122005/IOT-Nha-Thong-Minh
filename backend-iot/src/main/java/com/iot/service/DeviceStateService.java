package com.iot.service;

import com.iot.model.DeviceCommand;
import com.iot.model.DeviceState;
import com.iot.model.TelemetryMessage;
import com.iot.model.NodeCapabilities;
import com.iot.model.SensorState;
import com.iot.mqtt.MqttClientService;
import com.iot.websocket.WebSocketSessionRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class DeviceStateService {
    private static final Logger log = LoggerFactory.getLogger(DeviceStateService.class);

    private final WebSocketSessionRegistry sessionRegistry;
    private final MqttClientService mqttClientService;
    private final String homeId;
    private final String roomId;
    private final StatePersistenceService persistenceService;
    private final Map<String, DeviceState> stateStore = new ConcurrentHashMap<>();

    public DeviceStateService(WebSocketSessionRegistry sessionRegistry,
                              MqttClientService mqttClientService,
                              StatePersistenceService persistenceService,
                              @Value("${iot.mqtt.home-id}") String homeId,
                              @Value("${iot.mqtt.room-id}") String roomId) {
        this.sessionRegistry = sessionRegistry;
        this.mqttClientService = mqttClientService;
        this.persistenceService = persistenceService;
        this.homeId = homeId;
        this.roomId = roomId;
        // Nạp cả node đang online lẫn offline để dashboard vẫn biết các node đã đăng ký.
        for (DeviceState savedState : persistenceService.loadAllDeviceStates()) {
            stateStore.put(savedState.getDeviceId(), savedState);
        }
        stateStore.putIfAbsent("esp32-room-01", new DeviceState("esp32-room-01"));
    }

    public DeviceState getState(String deviceId) {
        return stateStore.computeIfAbsent(deviceId, id -> {
            DeviceState savedState = persistenceService.loadDeviceState(id);
            return savedState != null ? savedState : new DeviceState(id);
        });
    }

    public List<DeviceState> getAllStates() {
        return new ArrayList<>(stateStore.values());
    }

    public void updateCapabilities(NodeCapabilities capabilities) {
        if (capabilities.getDeviceId() == null || capabilities.getDeviceId().isBlank()) return;
        DeviceState state = getState(capabilities.getDeviceId());
        if (capabilities.getHomeId() != null) state.setHomeId(capabilities.getHomeId());
        if (capabilities.getRoomId() != null) state.setRoomId(capabilities.getRoomId());
        if (capabilities.getActuators() != null) {
            state.setActuators(capabilities.getActuators().stream()
                    .filter(value -> value != null && value.matches("[A-Z][A-Z0-9_]{0,31}"))
                    .distinct().limit(16).toList());
        }
        persistenceService.persistDeviceState(state);
        Map<String, Object> event = new HashMap<>();
        event.put("type", "DEVICE_CAPABILITIES");
        event.put("deviceId", state.getDeviceId());
        event.put("homeId", state.getHomeId());
        event.put("roomId", state.getRoomId());
        event.put("actuators", state.getActuators());
        sessionRegistry.broadcastToDashboards(event);
    }

    public void updateTelemetry(TelemetryMessage msg) {
        String deviceId = msg.getDeviceId() != null ? msg.getDeviceId() : "esp32-room-01";
        DeviceState state = getState(deviceId);

        if (msg.getHomeId() != null) state.setHomeId(msg.getHomeId());
        if (msg.getRoomId() != null) state.setRoomId(msg.getRoomId());
        if (msg.getSensorId() != null) state.setSensorId(msg.getSensorId());
        if (msg.getTemperature() != null) state.setTemperature(msg.getTemperature());
        if (msg.getHumidity() != null) state.setHumidity(msg.getHumidity());
        if (msg.getAlarmThresholdC() != null) state.setAlarmThresholdC(msg.getAlarmThresholdC());
        Map<String, Double> measurements = msg.resolvedMeasurements();
        if (!measurements.isEmpty()) {
            Map<String, Double> current = new LinkedHashMap<>(
                    state.getMeasurements() == null ? Map.of() : state.getMeasurements());
            current.putAll(measurements);
            state.setMeasurements(current);
            if (measurements.containsKey("temperature")) state.setTemperature(measurements.get("temperature"));
            if (measurements.containsKey("humidity")) state.setHumidity(measurements.get("humidity"));
        }
        if (msg.getUnits() != null) {
            Map<String, String> units = new LinkedHashMap<>(state.getUnits() == null ? Map.of() : state.getUnits());
            msg.getUnits().forEach((key, unit) -> {
                if (measurements.containsKey(key) && unit != null && unit.length() <= 16) units.put(key, unit);
            });
            state.setUnits(units);
        }
        if (!measurements.isEmpty() && msg.getSensorId() != null && !msg.getSensorId().isBlank()) {
            Map<String, SensorState> sensors = new LinkedHashMap<>(
                    state.getSensors() == null ? Map.of() : state.getSensors());
            SensorState sensor = sensors.getOrDefault(msg.getSensorId(), new SensorState(msg.getSensorId()));
            Map<String, Double> sensorMeasurements = new LinkedHashMap<>(
                    sensor.getMeasurements() == null ? Map.of() : sensor.getMeasurements());
            sensorMeasurements.putAll(measurements);
            sensor.setMeasurements(sensorMeasurements);
            if (msg.getUnits() != null) {
                Map<String, String> sensorUnits = new LinkedHashMap<>(sensor.getUnits() == null ? Map.of() : sensor.getUnits());
                msg.getUnits().forEach((key, unit) -> {
                    if (measurements.containsKey(key) && unit != null && unit.length() <= 16) sensorUnits.put(key, unit);
                });
                sensor.setUnits(sensorUnits);
            }
            sensor.setLastSeenAt(System.currentTimeMillis());
            sensors.put(msg.getSensorId(), sensor);
            state.setSensors(sensors);
        }
        if (msg.getAcState() != null) state.setAcState(msg.getAcState());
        if (msg.getAlertState() != null) state.setAlertState(msg.getAlertState());
        if (msg.getLedState() != null) state.setLedState(msg.getLedState());
        if (msg.getBuzzerState() != null) state.setBuzzerState(msg.getBuzzerState());
        if (msg.getLedColor() != null) state.setLedColor(msg.getLedColor());
        if (msg.getWifiRssi() != null) state.setWifiRssi(msg.getWifiRssi());
        if (msg.getUptimeSeconds() != null) state.setUptimeSeconds(msg.getUptimeSeconds());

        state.setOnline(true);
        state.setLastSeenAt(System.currentTimeMillis());
        persistenceService.persistTelemetry(state, msg,
                state.getHomeId() != null ? state.getHomeId() : homeId,
                state.getRoomId() != null ? state.getRoomId() : roomId,
                msg.getSensorId() != null ? msg.getSensorId() : "dht11-01");

        // Backend-to-browser realtime remains WebSocket; the ESP32 talks MQTT.
        Map<String, Object> event = new HashMap<>();
        event.put("type", "TELEMETRY");
        event.put("deviceId", deviceId);
        event.put("sensorId", msg.getSensorId() != null ? msg.getSensorId() : state.getSensorId());
        event.put("online", state.getOnline());
        event.put("temperature", measurements.get("temperature"));
        event.put("humidity", measurements.get("humidity"));
        event.put("alarmThresholdC", state.getAlarmThresholdC());
        event.put("measurements", measurements);
        event.put("units", msg.getUnits() == null ? Map.of() : msg.getUnits());
        event.put("sensors", state.getSensors());
        event.put("fireDanger", state.getAlertState());
        event.put("ledState", Boolean.TRUE.equals(state.getLedState()) ? "ON" : "OFF");
        event.put("ledColor", state.getLedColor());
        event.put("acState", state.getAcState());
        event.put("buzzerState", Boolean.TRUE.equals(state.getBuzzerState()) ? "ON" : "OFF");
        event.put("wifiRssi", state.getWifiRssi());
        event.put("uptimeSeconds", state.getUptimeSeconds());
        event.put("timestamp", state.getLastSeenAt());
        sessionRegistry.broadcastToDashboards(event);
    }

    public void updateNodeStatus(String deviceId, String nodeHomeId, boolean online) {
        DeviceState state = getState(deviceId);
        if (nodeHomeId != null && !nodeHomeId.isBlank()) state.setHomeId(nodeHomeId);
        boolean changed = !Boolean.valueOf(online).equals(state.getOnline());
        state.setOnline(online);
        state.setLastSeenAt(System.currentTimeMillis());
        persistenceService.persistNodeStatus(state, online);
        if (changed) {
            sessionRegistry.broadcastToDashboards(Map.of(
                    "type", "NODE_STATUS_CHANGED",
                    "deviceId", deviceId,
                    "online", online,
                    "timestamp", state.getLastSeenAt()));
        }
    }

    public boolean sendCommand(String deviceId, DeviceCommand cmd) {
        DeviceState state = getState(deviceId);
        String topic = "home/" + (state.getHomeId() != null ? state.getHomeId() : homeId)
                + "/" + (state.getRoomId() != null ? state.getRoomId() : roomId)
                + "/device/" + deviceId + "/set";
        // This is a desired-state command. Reported state changes only when the device
        // publishes its next telemetry/state message back over MQTT.
        return mqttClientService.publishJson(topic, cmd, 1, false);
    }

    // Định kỳ 3 giây kiểm tra xem thiết bị có bị mất kết nối (Offline) không
    @Scheduled(fixedRate = 3000)
    public void checkHeartbeat() {
        long now = System.currentTimeMillis();
        for (DeviceState state : stateStore.values()) {
            if (state.getOnline() && (now - state.getLastSeenAt() > 10000)) {
                // Quá 10 giây không có tin nhắn -> đánh dấu Offline
                state.setOnline(false);
                persistenceService.persistDeviceState(state);
                log.warn("Device {} timeout. Marked as OFFLINE.", state.getDeviceId());
                sessionRegistry.broadcastToDashboards(Map.of(
                        "type", "NODE_STATUS_CHANGED",
                        "deviceId", state.getDeviceId(),
                        "online", false,
                        "timestamp", now));
            }
        }
    }
}
