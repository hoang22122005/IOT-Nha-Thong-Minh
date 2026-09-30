package com.iot.model;

import java.util.LinkedHashMap;
import java.util.Map;

public class SensorState {
    private String sensorId;
    private Map<String, Double> measurements = new LinkedHashMap<>();
    private Map<String, String> units = new LinkedHashMap<>();
    private long lastSeenAt;

    public SensorState() {}
    public SensorState(String sensorId) { this.sensorId = sensorId; }
    public String getSensorId() { return sensorId; }
    public void setSensorId(String sensorId) { this.sensorId = sensorId; }
    public Map<String, Double> getMeasurements() { return measurements; }
    public void setMeasurements(Map<String, Double> measurements) { this.measurements = measurements; }
    public Map<String, String> getUnits() { return units; }
    public void setUnits(Map<String, String> units) { this.units = units; }
    public long getLastSeenAt() { return lastSeenAt; }
    public void setLastSeenAt(long lastSeenAt) { this.lastSeenAt = lastSeenAt; }
}
