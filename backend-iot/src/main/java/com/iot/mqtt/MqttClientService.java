package com.iot.mqtt;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.eclipse.paho.client.mqttv3.IMqttActionListener;
import org.eclipse.paho.client.mqttv3.MqttAsyncClient;
import org.eclipse.paho.client.mqttv3.MqttCallbackExtended;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class MqttClientService {
    private static final Logger log = LoggerFactory.getLogger(MqttClientService.class);
    private static final String[] SUBSCRIPTIONS = {
            "home/+/+/sensor/+/telemetry",
            "home/+/+/alert/fire",
            "home/+/+/device/+/state",
            "home/+/node/+/heartbeat",
            "home/+/node/+/status",
            "home/+/node/+/capabilities"
    };
    private static final int[] SUBSCRIPTION_QOS = {0, 1, 1, 0, 1, 1};

    private final ApplicationEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;
    private final String brokerUrl;
    private final String username;
    private final String password;
    private final AtomicBoolean connecting = new AtomicBoolean(false);

    private volatile MqttAsyncClient client;
    private volatile boolean disabled;

    public MqttClientService(
            ApplicationEventPublisher eventPublisher,
            ObjectMapper objectMapper,
            @Value("${iot.mqtt.broker-url}") String brokerUrl,
            @Value("${iot.mqtt.username}") String username,
            @Value("${iot.mqtt.password}") String password) {
        this.eventPublisher = eventPublisher;
        this.objectMapper = objectMapper;
        this.brokerUrl = brokerUrl;
        this.username = username;
        this.password = password;
    }

    @PostConstruct
    public void initialize() {
        if (password == null || password.isBlank()) {
            disabled = true;
            log.warn("MQTT is not configured: set the MQTT_PASSWORD environment variable.");
            return;
        }

        try {
            String clientId = "backend-iot-" + UUID.randomUUID();
            client = new MqttAsyncClient(brokerUrl, clientId, new MemoryPersistence());
            client.setCallback(new MqttCallbackExtended() {
                @Override
                public void connectComplete(boolean reconnect, String serverURI) {
                    log.info("Connected to MQTT broker {}{}", serverURI, reconnect ? " (reconnected)" : "");
                    subscribeToProjectTopics();
                }

                @Override
                public void connectionLost(Throwable cause) {
                    log.warn("MQTT connection lost; automatic reconnect is enabled", cause);
                }

                @Override
                public void messageArrived(String topic, MqttMessage message) {
                    String payload = new String(message.getPayload(), StandardCharsets.UTF_8);
                    eventPublisher.publishEvent(new MqttInboundMessageEvent(
                            topic, payload, message.getQos(), message.isRetained()));
                }

                @Override
                public void deliveryComplete(org.eclipse.paho.client.mqttv3.IMqttDeliveryToken token) {
                    // The broker has acknowledged a published message.
                }
            });
        } catch (MqttException e) {
            disabled = true;
            log.error("Could not initialize MQTT client", e);
        }
    }

    @Scheduled(fixedDelay = 5000, initialDelay = 0)
    public void connectIfNeeded() {
        MqttAsyncClient current = client;
        if (disabled || current == null || current.isConnected() || !connecting.compareAndSet(false, true)) {
            return;
        }

        MqttConnectOptions options = new MqttConnectOptions();
        options.setAutomaticReconnect(true);
        options.setCleanSession(true);
        options.setConnectionTimeout(10);
        options.setKeepAliveInterval(30);
        options.setUserName(username);
        options.setPassword(password.toCharArray());

        try {
            current.connect(options, null, new IMqttActionListener() {
                @Override
                public void onSuccess(org.eclipse.paho.client.mqttv3.IMqttToken token) {
                    connecting.set(false);
                }

                @Override
                public void onFailure(org.eclipse.paho.client.mqttv3.IMqttToken token, Throwable error) {
                    connecting.set(false);
                    log.warn("Could not connect to MQTT broker {}: {}", brokerUrl, error.getMessage());
                }
            });
        } catch (MqttException e) {
            connecting.set(false);
            log.warn("Could not start MQTT connection to {}: {}", brokerUrl, e.getMessage());
        }
    }

    private void subscribeToProjectTopics() {
        MqttAsyncClient current = client;
        if (current == null || !current.isConnected()) return;

        try {
            current.subscribe(SUBSCRIPTIONS, SUBSCRIPTION_QOS, null, new IMqttActionListener() {
                @Override
                public void onSuccess(org.eclipse.paho.client.mqttv3.IMqttToken token) {
                    log.info("Subscribed to project telemetry, alert, device-state and node-status topics");
                }

                @Override
                public void onFailure(org.eclipse.paho.client.mqttv3.IMqttToken token, Throwable error) {
                    log.error("MQTT topic subscription failed", error);
                }
            });
        } catch (MqttException e) {
            log.error("Could not subscribe to MQTT topics", e);
        }
    }

    public boolean publishJson(String topic, Object body, int qos, boolean retained) {
        MqttAsyncClient current = client;
        if (current == null || !current.isConnected()) {
            log.warn("MQTT publish skipped because the broker is disconnected: {}", topic);
            return false;
        }

        byte[] payload;
        try {
            payload = objectMapper.writeValueAsBytes(body);
        } catch (JsonProcessingException e) {
            log.error("Could not serialize MQTT payload for topic {}", topic, e);
            return false;
        }

        MqttMessage message = new MqttMessage(payload);
        message.setQos(qos);
        message.setRetained(retained);
        try {
            current.publish(topic, message);
            return true;
        } catch (MqttException e) {
            log.error("MQTT publish failed for topic {}", topic, e);
            return false;
        }
    }

    @PreDestroy
    public void close() {
        MqttAsyncClient current = client;
        if (current == null) return;
        try {
            if (current.isConnected()) current.disconnectForcibly(1000, 1000);
            current.close();
        } catch (MqttException e) {
            log.debug("Error while closing MQTT client", e);
        }
    }
}
