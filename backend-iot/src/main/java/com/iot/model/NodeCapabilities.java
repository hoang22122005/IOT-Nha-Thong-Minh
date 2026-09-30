package com.iot.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class NodeCapabilities {
    private String deviceId;
    private String homeId;
    private String roomId;
    private List<String> actuators;

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }
    public String getHomeId() { return homeId; }
    public void setHomeId(String homeId) { this.homeId = homeId; }
    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }
    public List<String> getActuators() { return actuators; }
    public void setActuators(List<String> actuators) { this.actuators = actuators; }
}
