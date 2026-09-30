package com.iot.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.Map;

@Document(collection = "sensor_readings")
public class SensorReading {
    @Id
    private String id;
    private String homeId;
    private String roomId;
    private String deviceId;
    private String sensorId;
    private Double temperature;
    private Double humidity;
    private Map<String, Double> measurements;
    private Map<String, String> units;
    private long timestamp;

    public SensorReading() {
    }

    public SensorReading(String homeId, String roomId, String deviceId, String sensorId,
                         Double temperature, Double humidity, Map<String, Double> measurements,
                         Map<String, String> units, long timestamp) {
        this.id = deviceId + ":" + sensorId + ":" + timestamp;
        this.homeId = homeId;
        this.roomId = roomId;
        this.deviceId = deviceId;
        this.sensorId = sensorId;
        this.temperature = temperature;
        this.humidity = humidity;
        this.measurements = measurements;
        this.units = units;
        this.timestamp = timestamp;
    }

    public String getId() { return id; }
    public String getHomeId() { return homeId; }
    public String getRoomId() { return roomId; }
    public String getDeviceId() { return deviceId; }
    public String getSensorId() { return sensorId; }
    public Double getTemperature() { return temperature; }
    public Double getHumidity() { return humidity; }
    public Map<String, Double> getMeasurements() { return measurements; }
    public Map<String, String> getUnits() { return units; }
    public long getTimestamp() { return timestamp; }
}
