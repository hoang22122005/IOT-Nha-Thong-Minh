package com.iot.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@JsonIgnoreProperties(ignoreUnknown = true)
@Document(collection = "alerts")
public class FireAlert {
    private String type = "ALERT";
    @Id
    private String alertId;
    private String deviceId;
    private String homeId;
    private String roomId;
    private Double temperature;
    private String severity; // WARNING, CRITICAL, ACKNOWLEDGED
    private String message;
    private Long timestamp;
    private Boolean active = true;
    private Boolean acknowledged = false;

    public FireAlert() {
    }

    public FireAlert(String alertId, String deviceId, Double temperature, String severity, String message) {
        this.alertId = alertId;
        this.deviceId = deviceId;
        this.temperature = temperature;
        this.severity = severity;
        this.message = message;
        this.timestamp = System.currentTimeMillis();
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getAlertId() {
        return alertId;
    }

    public void setAlertId(String alertId) {
        this.alertId = alertId;
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

    public Double getTemperature() {
        return temperature;
    }

    public void setTemperature(Double temperature) {
        this.temperature = temperature;
    }

    public String getSeverity() {
        return severity;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Long timestamp) {
        this.timestamp = timestamp;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public Boolean getAcknowledged() {
        return acknowledged;
    }

    public void setAcknowledged(Boolean acknowledged) {
        this.acknowledged = acknowledged;
    }

    public String getDangerLevel() {
        return severity;
    }
}
