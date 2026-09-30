package com.iot.model;

public class SceneAction {
    private String targetDeviceId;
    private String target;
    private String action;

    public SceneAction() {
    }

    public String getTargetDeviceId() { return targetDeviceId; }
    public void setTargetDeviceId(String targetDeviceId) { this.targetDeviceId = targetDeviceId; }
    public String getTarget() { return target; }
    public void setTarget(String target) { this.target = target; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
}
