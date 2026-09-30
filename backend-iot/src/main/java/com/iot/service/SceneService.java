package com.iot.service;

import com.iot.model.DeviceCommand;
import com.iot.model.DeviceState;
import com.iot.model.SceneAction;
import com.iot.model.SceneActivationResult;
import com.iot.model.SmartHomeScene;
import com.iot.repository.SceneRepository;
import com.iot.websocket.WebSocketSessionRegistry;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class SceneService {
    private final SceneRepository repository;
    private final DeviceStateService deviceStateService;
    private final WebSocketSessionRegistry sessionRegistry;

    public SceneService(SceneRepository repository, DeviceStateService deviceStateService,
                        WebSocketSessionRegistry sessionRegistry) {
        this.repository = repository;
        this.deviceStateService = deviceStateService;
        this.sessionRegistry = sessionRegistry;
    }

    public List<SmartHomeScene> list() {
        return repository.findAll();
    }

    public SmartHomeScene save(SmartHomeScene scene) {
        validate(scene);
        long now = System.currentTimeMillis();
        if (scene.getId() == null || scene.getId().isBlank()) {
            scene.setId(UUID.randomUUID().toString());
            scene.setCreatedAt(now);
        } else if (repository.existsById(scene.getId())) {
            scene.setCreatedAt(repository.findById(scene.getId()).orElseThrow().getCreatedAt());
        } else {
            scene.setCreatedAt(now);
        }
        scene.setUpdatedAt(now);
        return repository.save(scene);
    }

    public boolean delete(String id) {
        if (!repository.existsById(id)) return false;
        repository.deleteById(id);
        return true;
    }

    public SceneActivationResult activate(String id) {
        SmartHomeScene scene = repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Scene not found"));
        int successful = 0;
        int failed = 0;
        for (SceneAction action : scene.getActions()) {
            DeviceState reported = deviceStateService.getState(action.getTargetDeviceId());
            boolean desiredOn = "ON".equalsIgnoreCase(action.getAction());
            boolean alreadyReported = reported.getOnline() && switch (action.getTarget().toUpperCase(Locale.ROOT)) {
                case "LED" -> Boolean.valueOf(desiredOn).equals(reported.getLedState());
                case "BUZZER" -> Boolean.valueOf(desiredOn).equals(reported.getBuzzerState());
                default -> false;
            };
            if (alreadyReported) {
                successful++;
                continue;
            }
            if (deviceStateService.sendCommand(action.getTargetDeviceId(),
                    new DeviceCommand(action.getTarget().toUpperCase(Locale.ROOT), action.getAction().toUpperCase(Locale.ROOT)))) {
                successful++;
            } else {
                failed++;
            }
        }

        long now = System.currentTimeMillis();
        SceneActivationResult result = new SceneActivationResult(scene.getId(), scene.getName(), successful, failed, now);
        sessionRegistry.broadcastToDashboards(Map.of(
                "type", "SCENE_ACTIVATED",
                "sceneId", scene.getId(),
                "sceneName", scene.getName(),
                "successfulActions", successful,
                "failedActions", failed,
                "timestamp", now));
        return result;
    }

    private void validate(SmartHomeScene scene) {
        if (scene.getName() == null || scene.getName().isBlank()) throw new IllegalArgumentException("Scene name is required");
        if (scene.getHomeId() == null || scene.getHomeId().isBlank()) scene.setHomeId("home-01");
        if (scene.getActions() == null) scene.setActions(List.of());
        for (SceneAction action : scene.getActions()) {
            if (action.getTargetDeviceId() == null || action.getTargetDeviceId().isBlank()) throw new IllegalArgumentException("Every scene action needs a target device");
            String target = action.getTarget() == null ? "" : action.getTarget().toUpperCase(Locale.ROOT);
            if (!List.of("LED", "BUZZER").contains(target)) throw new IllegalArgumentException("Scenes currently support LED and BUZZER actions");
            String value = action.getAction() == null ? "" : action.getAction().toUpperCase(Locale.ROOT);
            if (!List.of("ON", "OFF").contains(value)) throw new IllegalArgumentException("Scene actions must be ON or OFF");
            action.setTarget(target);
            action.setAction(value);
        }
    }
}
