package com.iot.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.iot.model.DeviceState;
import com.iot.model.FireAlert;
import com.iot.model.AutomationRule;
import com.iot.model.SensorReading;
import com.iot.model.TelemetryMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.index.Index;
import jakarta.annotation.PostConstruct;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class StatePersistenceService {
    private static final Logger log = LoggerFactory.getLogger(StatePersistenceService.class);
    private static final Duration HEARTBEAT_TTL = Duration.ofSeconds(15);
    private static final Duration SENSOR_STATE_TTL = Duration.ofMinutes(10);
    private static final long HISTORY_INTERVAL_MS = 10_000;
    private static final String KNOWN_DEVICES_KEY = "devices:known";

    private final StringRedisTemplate redis;
    private final MongoTemplate mongo;
    private final ObjectMapper objectMapper;
    private final ConcurrentMap<String, Long> lastHistoryWrite = new ConcurrentHashMap<>();

    public StatePersistenceService(StringRedisTemplate redis, MongoTemplate mongo, ObjectMapper objectMapper) {
        this.redis = redis;
        this.mongo = mongo;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void ensureIndexes() {
        try {
            // Existing collections do not automatically acquire annotation indexes.
            mongo.indexOps(SensorReading.class).ensureIndex(new Index()
                    .on("sensorId", Sort.Direction.ASC)
                    .on("deviceId", Sort.Direction.ASC)
                    .on("timestamp", Sort.Direction.DESC)
                    .named("sensor_device_time_idx"));
            mongo.indexOps(FireAlert.class).ensureIndex(new Index()
                    .on("timestamp", Sort.Direction.DESC).named("alert_time_idx"));
            mongo.indexOps(AutomationRule.class).ensureIndex(new Index()
                    .on("enabled", Sort.Direction.ASC)
                    .on("sensorId", Sort.Direction.ASC).named("enabled_sensor_idx"));
        } catch (Exception e) {
            log.warn("Could not ensure MongoDB indexes: {}", e.getMessage());
        }
    }

    public DeviceState loadDeviceState(String deviceId) {
        try {
            String json = redis.opsForValue().get("device:" + deviceId + ":state");
            if (json != null) {
                DeviceState state = objectMapper.readValue(json, DeviceState.class);
                Long heartbeatTtl = redis.getExpire("node:" + deviceId + ":heartbeat");
                // Redis heartbeat TTL is authoritative after a backend restart.
                state.setOnline(heartbeatTtl != null && heartbeatTtl > 0);
                return state;
            }
        } catch (Exception e) {
            log.warn("Could not load device {} from Redis: {}", deviceId, e.getMessage());
        }
        return null;
    }

    public List<DeviceState> loadAllDeviceStates() {
        try {
            redis.opsForSet().add(KNOWN_DEVICES_KEY, "esp32-room-01");
            Set<String> deviceIds = redis.opsForSet().members(KNOWN_DEVICES_KEY);
            if (deviceIds == null || deviceIds.isEmpty()) return List.of();

            List<DeviceState> states = new java.util.ArrayList<>();
            for (String deviceId : deviceIds) {
                DeviceState state = loadDeviceState(deviceId);
                if (state != null) states.add(state);
            }
            return states;
        } catch (Exception e) {
            log.warn("Could not load known IoT devices from Redis: {}", e.getMessage());
            return List.of();
        }
    }

    public void persistTelemetry(DeviceState state, TelemetryMessage message,
                                 String homeId, String roomId, String fallbackSensorId) {
        long now = state.getLastSeenAt();
        String sensorId = message.getSensorId() == null || message.getSensorId().isBlank()
                ? fallbackSensorId : message.getSensorId();
        Map<String, Double> measurements = message.resolvedMeasurements();
        try {
            redis.opsForSet().add(KNOWN_DEVICES_KEY, state.getDeviceId());
            redis.opsForValue().set("device:" + state.getDeviceId() + ":state",
                    objectMapper.writeValueAsString(state));
            redis.opsForValue().set("node:" + state.getDeviceId() + ":heartbeat",
                    Long.toString(now), HEARTBEAT_TTL);
            if (!measurements.isEmpty()) {
                redis.opsForValue().set("sensor:" + state.getDeviceId() + ":" + sensorId + ":current",
                        objectMapper.writeValueAsString(message), SENSOR_STATE_TTL);
            }
        } catch (Exception e) {
            log.warn("Could not update current IoT state in Redis: {}", e.getMessage());
        }

        if (measurements.isEmpty()) return;
        String historyKey = state.getDeviceId() + ":" + sensorId;
        // Advance the timer only when a sample is actually due. Updating it on
        // every 2-second packet would prevent all later 10-second writes.
        java.util.concurrent.atomic.AtomicBoolean due = new java.util.concurrent.atomic.AtomicBoolean();
        lastHistoryWrite.compute(historyKey, (key, previous) -> {
            if (previous == null || now - previous >= HISTORY_INTERVAL_MS) {
                due.set(true);
                return now;
            }
            return previous;
        });
        if (!due.get()) return;
        try {
            mongo.save(new SensorReading(homeId, roomId, state.getDeviceId(), sensorId,
                    measurements.get("temperature"), measurements.get("humidity"),
                    measurements, message.getUnits(), now));
        } catch (Exception e) {
            log.warn("Could not save sensor history to MongoDB: {}", e.getMessage());
            // Let the next telemetry attempt retry if MongoDB was temporarily unavailable.
            lastHistoryWrite.remove(historyKey, now);
        }
    }

    public List<SensorReading> findSensorReadings(String sensorId, String deviceId, long from, long to, int limit) {
        try {
            Criteria criteria = Criteria.where("sensorId").is(sensorId)
                    .and("timestamp").gte(from).lte(to);
            if (deviceId != null && !deviceId.isBlank()) criteria.and("deviceId").is(deviceId);
            int maxPoints = Math.max(1, Math.min(limit, 1000));
            Query query = Query.query(criteria)
                    .with(Sort.by(Sort.Direction.DESC, "timestamp"))
                    .limit(maxPoints);
            List<SensorReading> readings = mongo.find(query, SensorReading.class);
            return readings;
        } catch (Exception e) {
            log.warn("Could not query history for sensor {}: {}", sensorId, e.getMessage());
            return List.of();
        }
    }

    public void persistDeviceState(DeviceState state) {
        try {
            redis.opsForSet().add(KNOWN_DEVICES_KEY, state.getDeviceId());
            redis.opsForValue().set("device:" + state.getDeviceId() + ":state",
                    objectMapper.writeValueAsString(state));
        } catch (Exception e) {
            log.warn("Could not update device {} state in Redis: {}", state.getDeviceId(), e.getMessage());
        }
    }

    public void persistNodeStatus(DeviceState state, boolean online) {
        try {
            String key = "node:" + state.getDeviceId() + ":heartbeat";
            if (online) redis.opsForValue().set(key, Long.toString(state.getLastSeenAt()), HEARTBEAT_TTL);
            else redis.delete(key);
        } catch (Exception e) {
            log.warn("Could not update node heartbeat in Redis: {}", e.getMessage());
        }
        persistDeviceState(state);
    }

    public boolean alertExists(String alertId) {
        try {
            return mongo.exists(Query.query(org.springframework.data.mongodb.core.query.Criteria.where("_id").is(alertId)), FireAlert.class);
        } catch (Exception e) {
            log.warn("Could not check alert history in MongoDB: {}", e.getMessage());
            return false;
        }
    }

    public void saveAlert(FireAlert alert) {
        try {
            mongo.save(alert);
        } catch (Exception e) {
            log.warn("Could not save alert to MongoDB: {}", e.getMessage());
        }
    }

    public List<FireAlert> loadAlerts() {
        try {
            Query query = new Query().with(Sort.by(Sort.Direction.DESC, "timestamp")).limit(100);
            return mongo.find(query, FireAlert.class);
        } catch (Exception e) {
            log.warn("Could not load alert history from MongoDB: {}", e.getMessage());
            return List.of();
        }
    }

    public void markDeviceAlertsCleared(String deviceId) {
        try {
            mongo.updateMulti(
                    Query.query(org.springframework.data.mongodb.core.query.Criteria.where("deviceId").is(deviceId)
                            .and("active").is(true)),
                    new org.springframework.data.mongodb.core.query.Update().set("active", false),
                    FireAlert.class);
        } catch (Exception e) {
            log.warn("Could not clear device alerts in MongoDB: {}", e.getMessage());
        }
    }
}
