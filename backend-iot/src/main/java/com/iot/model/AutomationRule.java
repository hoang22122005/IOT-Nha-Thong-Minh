package com.iot.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "automation_rules")
@CompoundIndex(name = "enabled_sensor_idx", def = "{'enabled': 1, 'sensorId': 1}")
public class AutomationRule {
    @Id
    private String id;
    private String name;
    private String homeId;
    private String roomId;
    private String sensorId;
    private String metric;
    private String operator;
    private double threshold;
    private String targetDeviceId;
    private String target;
    private String actionWhenTrue;
    private String actionWhenFalse;
    private boolean enabled = true;
    private int cooldownSeconds = 10;
    private long createdAt;
    private long updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getHomeId() { return homeId; }
    public void setHomeId(String homeId) { this.homeId = homeId; }
    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }
    public String getSensorId() { return sensorId; }
    public void setSensorId(String sensorId) { this.sensorId = sensorId; }
    public String getMetric() { return metric; }
    public void setMetric(String metric) { this.metric = metric; }
    public String getOperator() { return operator; }
    public void setOperator(String operator) { this.operator = operator; }
    public double getThreshold() { return threshold; }
    public void setThreshold(double threshold) { this.threshold = threshold; }
    public String getTargetDeviceId() { return targetDeviceId; }
    public void setTargetDeviceId(String targetDeviceId) { this.targetDeviceId = targetDeviceId; }
    public String getTarget() { return target; }
    public void setTarget(String target) { this.target = target; }
    public String getActionWhenTrue() { return actionWhenTrue; }
    public void setActionWhenTrue(String actionWhenTrue) { this.actionWhenTrue = actionWhenTrue; }
    public String getActionWhenFalse() { return actionWhenFalse; }
    public void setActionWhenFalse(String actionWhenFalse) { this.actionWhenFalse = actionWhenFalse; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public int getCooldownSeconds() { return cooldownSeconds; }
    public void setCooldownSeconds(int cooldownSeconds) { this.cooldownSeconds = cooldownSeconds; }
    public long getCreatedAt() { return createdAt; }
    public void setCreatedAt(long createdAt) { this.createdAt = createdAt; }
    public long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(long updatedAt) { this.updatedAt = updatedAt; }
}
