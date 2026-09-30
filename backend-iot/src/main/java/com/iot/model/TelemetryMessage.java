package com.iot.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.LinkedHashMap;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class TelemetryMessage {
    private String type; // TELEMETRY, PING, FIRE_ALERT
    private String deviceId;
    private String sensorId;
    private String homeId;
    private String roomId;
    private Double temperature;
    private Double humidity;
    private Double alarmThresholdC;
    private Map<String, Double> measurements;
    private Map<String, String> units;
    private String acState;    // ON, OFF, AUTO
    private String alertState; // NORMAL, WARNING, CRITICAL
    private Boolean ledState;
    private Boolean buzzerState;
    private String ledColor;   // e.g. #FF0000
    private Integer wifiRssi;
    private Long uptimeSeconds;
    private Long timestamp;

    public TelemetryMessage() {
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(String deviceId) {
        this.deviceId = deviceId;
    }

    public String getSensorId() { return sensorId; }

    public void setSensorId(String sensorId) { this.sensorId = sensorId; }

    public String getHomeId() { return homeId; }

    public void setHomeId(String homeId) { this.homeId = homeId; }

    public String getRoomId() { return roomId; }

    public void setRoomId(String roomId) { this.roomId = roomId; }

    public Double getTemperature() {
        return temperature;
    }

    public void setTemperature(Double temperature) {
        this.temperature = temperature;
    }

    public Double getHumidity() {
        return humidity;
    }

    public void setHumidity(Double humidity) {
        this.humidity = humidity;
    }
    public Double getAlarmThresholdC() { return alarmThresholdC; }
    public void setAlarmThresholdC(Double alarmThresholdC) { this.alarmThresholdC = alarmThresholdC; }

    public Map<String, Double> getMeasurements() { return measurements; }
    public void setMeasurements(Map<String, Double> measurements) { this.measurements = measurements; }
    public Map<String, String> getUnits() { return units; }
    public void setUnits(Map<String, String> units) { this.units = units; }

    // The current DHT11 payload remains valid while new modules use measurements.
    @JsonIgnore
    public Map<String, Double> resolvedMeasurements() {
        Map<String, Double> result = new LinkedHashMap<>();
        if (measurements != null) {
            measurements.forEach((key, value) -> {
                if (result.size() < 32 && key != null && key.matches("[a-z][a-z0-9_]{0,31}")
                        && value != null && Double.isFinite(value)) result.put(key, value);
            });
        }
        if (temperature != null && Double.isFinite(temperature)) result.putIfAbsent("temperature", temperature);
        if (humidity != null && Double.isFinite(humidity)) result.putIfAbsent("humidity", humidity);
        return result;
    }

    public String getAcState() {
        return acState;
    }

    public void setAcState(String acState) {
        this.acState = acState;
    }

    public String getAlertState() {
        return alertState;
    }

    public void setAlertState(String alertState) {
        this.alertState = alertState;
    }

    public Boolean getLedState() {
        return ledState;
    }

    public void setLedState(Boolean ledState) {
        this.ledState = ledState;
    }

    public Boolean getBuzzerState() {
        return buzzerState;
    }

    public void setBuzzerState(Boolean buzzerState) {
        this.buzzerState = buzzerState;
    }

    public String getLedColor() {
        return ledColor;
    }

    public void setLedColor(String ledColor) {
        this.ledColor = ledColor;
    }

    public Integer getWifiRssi() {
        return wifiRssi;
    }

    public void setWifiRssi(Integer wifiRssi) {
        this.wifiRssi = wifiRssi;
    }

    public Long getUptimeSeconds() {
        return uptimeSeconds;
    }

    public void setUptimeSeconds(Long uptimeSeconds) {
        this.uptimeSeconds = uptimeSeconds;
    }

    public Long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Long timestamp) {
        this.timestamp = timestamp;
    }
}
