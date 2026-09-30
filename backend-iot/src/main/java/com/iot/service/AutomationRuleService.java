package com.iot.service;

import com.iot.model.AutomationRule;
import com.iot.model.DeviceCommand;
import com.iot.model.DeviceState;
import com.iot.model.TelemetryMessage;
import com.iot.repository.AutomationRuleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class AutomationRuleService {
    private static final Logger log = LoggerFactory.getLogger(AutomationRuleService.class);

    private final AutomationRuleRepository repository;
    private final DeviceStateService deviceStateService;
    private final ConcurrentMap<String, Boolean> lastConditions = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Long> lastActions = new ConcurrentHashMap<>();

    public AutomationRuleService(AutomationRuleRepository repository, DeviceStateService deviceStateService) {
        this.repository = repository;
        this.deviceStateService = deviceStateService;
    }

    public List<AutomationRule> listRules() {
        return repository.findAll();
    }

    public AutomationRule saveRule(AutomationRule rule) {
        validate(rule);
        long now = System.currentTimeMillis();
        if (rule.getId() == null || rule.getId().isBlank()) {
            rule.setId(UUID.randomUUID().toString());
            rule.setCreatedAt(now);
        } else if (repository.existsById(rule.getId())) {
            AutomationRule old = repository.findById(rule.getId()).orElseThrow();
            rule.setCreatedAt(old.getCreatedAt());
        } else {
            rule.setCreatedAt(now);
        }
        rule.setUpdatedAt(now);
        lastConditions.remove(rule.getId());
        lastActions.remove(rule.getId());
        return repository.save(rule);
    }

    public boolean deleteRule(String id) {
        if (!repository.existsById(id)) return false;
        repository.deleteById(id);
        lastConditions.remove(id);
        lastActions.remove(id);
        return true;
    }

    public void evaluate(TelemetryMessage message) {
        if (message.getSensorId() == null || message.getSensorId().isBlank()) return;
        for (AutomationRule rule : repository.findByEnabledTrueAndSensorId(message.getSensorId())) {
            Double value = metricValue(rule.getMetric(), message);
            if (value == null) continue;
            boolean condition = compare(value, rule.getOperator(), rule.getThreshold());
            Boolean previous = lastConditions.get(rule.getId());
            if (previous != null && previous == condition) continue;

            String action = condition ? rule.getActionWhenTrue() : rule.getActionWhenFalse();
            if (action == null || action.isBlank()) {
                lastConditions.put(rule.getId(), condition);
                continue;
            }

            long now = System.currentTimeMillis();
            long cooldownMs = Math.max(0, rule.getCooldownSeconds()) * 1000L;
            Long lastAction = lastActions.get(rule.getId());
            if (lastAction != null && now - lastAction < cooldownMs) continue;
            if (alreadyReported(rule, action)) {
                lastConditions.put(rule.getId(), condition);
                continue;
            }

            DeviceCommand command = new DeviceCommand(rule.getTarget(), action.toUpperCase(Locale.ROOT));
            if (deviceStateService.sendCommand(rule.getTargetDeviceId(), command)) {
                lastConditions.put(rule.getId(), condition);
                lastActions.put(rule.getId(), now);
                log.info("Automation '{}' sent {} {} to {}", rule.getName(), rule.getTarget(), action,
                        rule.getTargetDeviceId());
            }
        }
    }

    private boolean alreadyReported(AutomationRule rule, String action) {
        DeviceState state = deviceStateService.getState(rule.getTargetDeviceId());
        boolean desired = "ON".equalsIgnoreCase(action);
        return switch (rule.getTarget().toUpperCase(Locale.ROOT)) {
            case "LED" -> Boolean.valueOf(desired).equals(state.getLedState());
            case "BUZZER" -> Boolean.valueOf(desired).equals(state.getBuzzerState());
            default -> false;
        };
    }

    private Double metricValue(String metric, TelemetryMessage message) {
        return message.resolvedMeasurements().get(metric.toLowerCase(Locale.ROOT));
    }

    private boolean compare(double value, String operator, double threshold) {
        return switch (operator.toUpperCase(Locale.ROOT)) {
            case "GT" -> value > threshold;
            case "GTE" -> value >= threshold;
            case "LT" -> value < threshold;
            case "LTE" -> value <= threshold;
            case "EQ" -> Double.compare(value, threshold) == 0;
            default -> false;
        };
    }

    private void validate(AutomationRule rule) {
        if (rule.getName() == null || rule.getName().isBlank()) throw new IllegalArgumentException("Rule name is required");
        if (rule.getSensorId() == null || rule.getSensorId().isBlank()) throw new IllegalArgumentException("Sensor ID is required");
        if (rule.getTargetDeviceId() == null || rule.getTargetDeviceId().isBlank()) throw new IllegalArgumentException("Target device ID is required");
        if (rule.getMetric() == null || !rule.getMetric().matches("[A-Za-z][A-Za-z0-9_]{0,31}"))
            throw new IllegalArgumentException("Metric must be a measurement name such as TEMPERATURE or HUMIDITY");
        if (!List.of("GT", "GTE", "LT", "LTE", "EQ").contains(upper(rule.getOperator()))) throw new IllegalArgumentException("Unsupported comparison operator");
        if (!List.of("LED", "BUZZER").contains(upper(rule.getTarget()))) throw new IllegalArgumentException("Target must be LED or BUZZER on this ESP32 firmware");
        validateAction(rule.getActionWhenTrue());
        if (rule.getActionWhenFalse() != null && !rule.getActionWhenFalse().isBlank()) validateAction(rule.getActionWhenFalse());
        if (rule.getCooldownSeconds() < 0 || rule.getCooldownSeconds() > 86400) throw new IllegalArgumentException("Cooldown must be 0..86400 seconds");
    }

    private void validateAction(String action) {
        if (action == null || !List.of("ON", "OFF").contains(upper(action))) throw new IllegalArgumentException("Rule actions must be ON or OFF");
    }

    private String upper(String value) {
        return value == null ? "" : value.toUpperCase(Locale.ROOT);
    }
}
