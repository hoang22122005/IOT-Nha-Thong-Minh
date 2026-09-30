package com.iot.model;

public class SceneActivationResult {
    private String sceneId;
    private String sceneName;
    private int successfulActions;
    private int failedActions;
    private long timestamp;

    public SceneActivationResult(String sceneId, String sceneName, int successfulActions, int failedActions, long timestamp) {
        this.sceneId = sceneId;
        this.sceneName = sceneName;
        this.successfulActions = successfulActions;
        this.failedActions = failedActions;
        this.timestamp = timestamp;
    }

    public String getSceneId() { return sceneId; }
    public String getSceneName() { return sceneName; }
    public int getSuccessfulActions() { return successfulActions; }
    public int getFailedActions() { return failedActions; }
    public long getTimestamp() { return timestamp; }
}
