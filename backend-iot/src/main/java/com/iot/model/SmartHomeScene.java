package com.iot.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Document(collection = "scenes")
public class SmartHomeScene {
    @Id
    private String id;
    private String name;
    private String description;
    private String homeId = "home-01";
    private List<SceneAction> actions = new ArrayList<>();
    private long createdAt;
    private long updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getHomeId() { return homeId; }
    public void setHomeId(String homeId) { this.homeId = homeId; }
    public List<SceneAction> getActions() { return actions; }
    public void setActions(List<SceneAction> actions) { this.actions = actions; }
    public long getCreatedAt() { return createdAt; }
    public void setCreatedAt(long createdAt) { this.createdAt = createdAt; }
    public long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(long updatedAt) { this.updatedAt = updatedAt; }
}
