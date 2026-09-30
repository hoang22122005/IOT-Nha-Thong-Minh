package com.iot.model;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.List;

public class DeviceState {
    private String deviceId = "esp32-room-01";
    private String homeId = "home-01";
    private String roomId = "room-01";
    private String sensorId;
    private Double temperature;
    private Double humidity;
    private Double alarmThresholdC;
    private Map<String, Double> measurements = new LinkedHashMap<>();
    private Map<String, String> units = new LinkedHashMap<>();
    private Map<String, SensorState> sensors = new LinkedHashMap<>();
    private List<String> actuators = List.of();
    private String acState = "OFF";
    private String alertState = "NORMAL";
    private Boolean ledState = true;
    private String ledColor = "#00FF00";
    private Boolean buzzerState = false;
    private Boolean online = false;
    private Long lastSeenAt = 0L;
    private Integer wifiRssi = -60;
    private Long uptimeSeconds = 0L;

    public DeviceState() {
    }

    public DeviceState(String deviceId) {
        this.deviceId = deviceId;
    }

    public String getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(String deviceId) {
        this.deviceId = deviceId;
    }

    public String getHomeId() { return homeId; }

    public void setHomeId(String homeId) { this.homeId = homeId; }

    public String getRoomId() { return roomId; }

    public void setRoomId(String roomId) { this.roomId = roomId; }

    public String getSensorId() { return sensorId; }

    public void setSensorId(String sensorId) { this.sensorId = sensorId; }

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
    public Map<String, SensorState> getSensors() { return sensors; }
    public void setSensors(Map<String, SensorState> sensors) { this.sensors = sensors; }
    public List<String> getActuators() { return actuators; }
    public void setActuators(List<String> actuators) { this.actuators = actuators; }

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

    public String getLedColor() {
        return ledColor;
    }

    public void setLedColor(String ledColor) {
        this.ledColor = ledColor;
    }

    public Boolean getBuzzerState() {
        return buzzerState;
    }

    public void setBuzzerState(Boolean buzzerState) {
        this.buzzerState = buzzerState;
    }

    public Boolean getOnline() {
        return online;
    }

    public void setOnline(Boolean online) {
        this.online = online;
    }

    public Long getLastSeenAt() {
        return lastSeenAt;
    }

    public void setLastSeenAt(Long lastSeenAt) {
        this.lastSeenAt = lastSeenAt;
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
}
