package com.iot.controller;

import com.iot.model.DeviceCommand;
import com.iot.model.DeviceState;
import com.iot.model.FireAlert;
import com.iot.model.SensorReading;
import com.iot.service.AlertService;
import com.iot.service.DeviceStateService;
import com.iot.service.StatePersistenceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/iot/v1")
@CrossOrigin(origins = "*")
public class DeviceActionController {

    private final DeviceStateService stateService;
    private final AlertService alertService;
    private final StatePersistenceService persistenceService;

    public DeviceActionController(DeviceStateService stateService, AlertService alertService,
                                  StatePersistenceService persistenceService) {
        this.stateService = stateService;
        this.alertService = alertService;
        this.persistenceService = persistenceService;
    }

    // Lấy trạng thái hiện tại của thiết bị
    @GetMapping("/devices/{deviceId}/state")
    public ResponseEntity<DeviceState> getDeviceState(@PathVariable String deviceId) {
        return ResponseEntity.ok(stateService.getState(deviceId));
    }

    // New actuators can use this route after the node advertises their target.
    @PutMapping("/devices/{deviceId}/commands")
    public ResponseEntity<Map<String, Object>> sendCommand(@PathVariable String deviceId,
                                                              @RequestBody DeviceCommand command) {
        if (command.getTarget() == null || command.getAction() == null
                || !command.getTarget().matches("[A-Z][A-Z0-9_]{0,31}")
                || !command.getAction().matches("[A-Z][A-Z0-9_]{0,31}")) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid target or action"));
        }
        DeviceState state = stateService.getState(deviceId);
        if (state.getActuators() == null || !state.getActuators().contains(command.getTarget())) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Actuator is not advertised by this node"));
        }
        if (!stateService.sendCommand(deviceId, command)) {
            return ResponseEntity.status(503).body(Map.of("success", false, "message", "MQTT broker unavailable"));
        }
        return ResponseEntity.accepted().body(Map.of("success", true, "status", "SENT",
                "message", "Wait for reported device state before showing the action as applied"));
    }

    // Điều khiển đèn LED (Bật/Tắt, đổi màu)
    @PutMapping("/devices/light")
    public ResponseEntity<Map<String, Object>> controlLight(@RequestBody Map<String, Object> body) {
        String action = (String) body.getOrDefault("action", "ON");
        String deviceId = (String) body.getOrDefault("deviceId", "esp32-room-01");

        // The ESP32 applies RGB values only for SET_COLOR. The dashboard sends ON
        // with RGB when a color preset is selected, so translate that request here.
        boolean hasRgb = body.containsKey("r") && body.containsKey("g") && body.containsKey("b");
        if ("ON".equalsIgnoreCase(action) && hasRgb) {
            action = "SET_COLOR";
        }

        DeviceCommand cmd = new DeviceCommand("LED", action);
        if (body.containsKey("r")) cmd.setR(((Number) body.get("r")).intValue());
        if (body.containsKey("g")) cmd.setG(((Number) body.get("g")).intValue());
        if (body.containsKey("b")) cmd.setB(((Number) body.get("b")).intValue());

        boolean success = stateService.sendCommand(deviceId, cmd);

        Map<String, Object> res = new HashMap<>();
        res.put("success", success);
        res.put("message", "Light command sent: " + action);
        return ResponseEntity.ok(res);
    }

    // Điều khiển điều hòa (Mục 3.1 của Plan IOT.txt)
    @PutMapping("/devices/air-conditioner")
    public ResponseEntity<Map<String, Object>> controlAc(@RequestBody Map<String, Object> body) {
        return ResponseEntity.status(501).body(Map.of("success", false,
                "message", "AC is not connected to the current ESP32 firmware"));
    }

    // Điều khiển còi buzzer
    @PutMapping("/devices/buzzer")
    public ResponseEntity<Map<String, Object>> controlBuzzer(@RequestBody Map<String, Object> body) {
        String state = (String) body.getOrDefault("state", "OFF");
        String deviceId = (String) body.getOrDefault("deviceId", "esp32-room-01");

        DeviceCommand cmd = new DeviceCommand("BUZZER", state);
        boolean success = stateService.sendCommand(deviceId, cmd);

        Map<String, Object> res = new HashMap<>();
        res.put("success", success);
        res.put("message", "Buzzer turned " + state);
        return ResponseEntity.ok(res);
    }

    // Danh sách cảnh báo
    @GetMapping("/alerts")
    public ResponseEntity<List<FireAlert>> getAlerts() {
        return ResponseEntity.ok(alertService.getAlertHistory());
    }

    @GetMapping("/sensors/{sensorId}/history")
    public ResponseEntity<List<SensorReading>> getSensorHistory(
            @PathVariable String sensorId,
            @RequestParam(required = false) String deviceId,
            @RequestParam(required = false) Long from,
            @RequestParam(required = false) Long to,
            @RequestParam(defaultValue = "200") int limit) {
        long now = System.currentTimeMillis();
        long end = to == null ? now : to;
        long start = from == null ? end - 24L * 60 * 60 * 1000 : from;
        if (start > end || limit < 1) return ResponseEntity.badRequest().build();
        return ResponseEntity.ok(persistenceService.findSensorReadings(sensorId, deviceId, start, end, limit));
    }

    // Xác nhận cảnh báo an toàn
    @PostMapping("/alerts/{alertId}/ack")
    public ResponseEntity<Map<String, Object>> acknowledgeAlert(@PathVariable String alertId) {
        alertService.acknowledgeAlert(alertId);
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("message", "Alert acknowledged");
        return ResponseEntity.ok(res);
    }
}
