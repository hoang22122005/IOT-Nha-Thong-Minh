#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Adafruit_NeoPixel.h>
#include "HardwareConfig.h"
#include "Dht11Module.h"

#if defined(IOT_USE_LOCAL_SECRETS)
#if __has_include("secrets.local.h")
#include "secrets.local.h"
#else
#error "Copy include/secrets.local.h.example to include/secrets.local.h before building the local profile"
#endif
#elif __has_include("secrets.h")
#include "secrets.h"
#else
#define WIFI_SSID ""
#define WIFI_PASSWORD ""
#define MQTT_PORT 1883
#define MQTT_USERNAME ""
#define MQTT_PASSWORD ""
#define IOT_DEVICE_ID "esp32-room-01"
#define IOT_HOME_ID "home-01"
#define IOT_ROOM_ID "room-01"
#define IOT_SENSOR_ID "dht11-01"
#endif

#ifndef MQTT_HOST
#define MQTT_HOST ""
#endif

// Wiring: DHT11 DATA -> GPIO 4; buzzer signal -> GPIO 13; built-in RGB -> GPIO 48.
using namespace HardwareConfig;
constexpr char DEVICE_ID[] = IOT_DEVICE_ID;
constexpr char HOME_ID[] = IOT_HOME_ID;
constexpr char ROOM_ID[] = IOT_ROOM_ID;
constexpr char SENSOR_ID[] = IOT_SENSOR_ID;
constexpr uint8_t MAX_PENDING_FIRE_EVENTS = 8;

struct PendingFireEvent {
    float temperature;
    bool active;
};

Dht11Module dht;
Adafruit_NeoPixel pixel(1, RGB_PIN, NEO_GRB + NEO_KHZ800);
WiFiClient network;
PubSubClient mqtt(network);
unsigned long lastSampleAt = 0;
unsigned long lastHeartbeatAt = 0;
unsigned long lastWifiAttemptAt = 0;
unsigned long lastMqttAttemptAt = 0;
bool alarmActive = false;
bool mqttJustConnected = false;
bool wifiWasConnected = false;
IPAddress brokerIp;
uint8_t nextBrokerHost = 1;
unsigned long nextScanCycleAt = 0;
bool buzzerToneActive = false;
PendingFireEvent pendingFireEvents[MAX_PENDING_FIRE_EVENTS];
uint8_t pendingFireHead = 0;
uint8_t pendingFireCount = 0;
bool manualBuzzerOn = false;
bool manualLedOn = true;
uint8_t manualLedR = 0;
uint8_t manualLedG = 80;
uint8_t manualLedB = 0;

bool isPlaceholder(const char* value) {
    return value == nullptr || value[0] == '\0' || String(value).startsWith("YOUR_");
}

String telemetryTopic() {
    return String("home/") + HOME_ID + "/" + ROOM_ID + "/sensor/" + SENSOR_ID + "/telemetry";
}

String fireTopic() {
    return String("home/") + HOME_ID + "/" + ROOM_ID + "/alert/fire";
}

String commandTopic() {
    return String("home/") + HOME_ID + "/" + ROOM_ID + "/device/" + DEVICE_ID + "/set";
}

String deviceStateTopic() {
    return String("home/") + HOME_ID + "/" + ROOM_ID + "/device/" + DEVICE_ID + "/state";
}

String heartbeatTopic() {
    return String("home/") + HOME_ID + "/node/" + DEVICE_ID + "/heartbeat";
}

String nodeStatusTopic() {
    return String("home/") + HOME_ID + "/node/" + DEVICE_ID + "/status";
}

String capabilitiesTopic() {
    return String("home/") + HOME_ID + "/node/" + DEVICE_ID + "/capabilities";
}

void publishCapabilities() {
    if (!mqtt.connected()) return;
    StaticJsonDocument<256> message;
    message["deviceId"] = DEVICE_ID;
    message["homeId"] = HOME_ID;
    message["roomId"] = ROOM_ID;
    JsonArray actuators = message.createNestedArray("actuators");
    actuators.add("LED");
    actuators.add("BUZZER");
    char payload[256];
    const size_t length = serializeJson(message, payload, sizeof(payload));
    const String topic = capabilitiesTopic();
    mqtt.publish(topic.c_str(), (const uint8_t*)payload, length, true);
}

String currentLedColor() {
    if (alarmActive) return "#FF0000";
    if (!manualLedOn) return "#000000";
    char color[8];
    snprintf(color, sizeof(color), "#%02X%02X%02X", manualLedR, manualLedG, manualLedB);
    return String(color);
}

void publishNodeStatus(bool online) {
    if (!mqtt.connected()) return;
    StaticJsonDocument<192> status;
    status["type"] = "NODE_STATUS";
    status["deviceId"] = DEVICE_ID;
    status["online"] = online;
    status["timestamp"] = (uint64_t)time(nullptr) * 1000;
    char payload[192];
    const size_t length = serializeJson(status, payload, sizeof(payload));
    const String topic = nodeStatusTopic();
    mqtt.publish(topic.c_str(), (const uint8_t*)payload, length, true);
}

void applyOutputs() {
    const bool shouldSoundBuzzer = alarmActive || manualBuzzerOn;
    if (shouldSoundBuzzer && !buzzerToneActive) {
        tone(BUZZER_PIN, 2000);
        buzzerToneActive = true;
    } else if (!shouldSoundBuzzer && buzzerToneActive) {
        noTone(BUZZER_PIN);
        buzzerToneActive = false;
    }
    if (!shouldSoundBuzzer) {
        digitalWrite(BUZZER_PIN, LOW);
    }
    if (alarmActive) pixel.setPixelColor(0, pixel.Color(255, 0, 0));
    else if (manualLedOn) pixel.setPixelColor(0, pixel.Color(manualLedR, manualLedG, manualLedB));
    else pixel.setPixelColor(0, pixel.Color(0, 0, 0));
    pixel.show();
}

void publishDeviceState() {
    if (!mqtt.connected()) return;
    StaticJsonDocument<256> message;
    message["type"] = "DEVICE_STATE";
    message["deviceId"] = DEVICE_ID;
    message["ledState"] = alarmActive || manualLedOn;
    message["ledColor"] = currentLedColor();
    message["buzzerState"] = alarmActive || manualBuzzerOn;
    message["timestamp"] = (uint64_t)time(nullptr) * 1000;
    char payload[256];
    const size_t length = serializeJson(message, payload, sizeof(payload));
    const String topic = deviceStateTopic();
    mqtt.publish(topic.c_str(), (const uint8_t*)payload, length, true);
}

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
    StaticJsonDocument<256> command;
    if (deserializeJson(command, payload, length)) {
        Serial.println("Ignored invalid MQTT command JSON");
        return;
    }
    const char* target = command["target"] | "";
    const char* action = command["action"] | "";
    const String targetName(target);
    const String actionName(action);
    if (targetName == "LED") {
        if (actionName == "ON") manualLedOn = true;
        else if (actionName == "OFF") manualLedOn = false;
        else if (actionName == "TOGGLE") manualLedOn = !manualLedOn;
        else if (actionName == "SET_COLOR") {
            manualLedOn = true;
            manualLedR = command["r"] | 0;
            manualLedG = command["g"] | 80;
            manualLedB = command["b"] | 0;
        }
        else return;
    } else if (targetName == "BUZZER") {
        if (actionName == "ON") manualBuzzerOn = true;
        else if (actionName == "OFF") manualBuzzerOn = false;
        else if (actionName == "TOGGLE") manualBuzzerOn = !manualBuzzerOn;
        else return;
    } else {
        Serial.printf("Command target '%s' is not connected to this node yet\n", target);
        return;
    }

    // The local temperature alarm has priority over remote buzzer/LED commands.
    applyOutputs();
    Serial.printf("MQTT command applied: %s %s\n", target, action);
    publishDeviceState();
}

void setAlarm(bool active) {
    if (active == alarmActive) return;
    alarmActive = active;
    if (active) {
        Serial.println("LOCAL ALARM: buzzer ON, LED RED");
    } else {
        Serial.println("LOCAL ALARM CLEARED; applying manual output state");
    }
    applyOutputs();
}

bool discoverBroker(unsigned long now) {
    if (!isPlaceholder(MQTT_HOST)) return true;
    if (brokerIp != IPAddress()) return true;
    if (now < nextScanCycleAt) return false;

    const IPAddress own = WiFi.localIP();
    const IPAddress mask = WiFi.subnetMask();
    if (mask[0] != 255 || mask[1] != 255 || mask[2] != 255 || mask[3] != 0) {
        Serial.println("MQTT auto-discovery currently supports a /24 LAN");
        nextScanCycleAt = now + BROKER_DISCOVERY_MS;
        return false;
    }
    if (nextBrokerHost == 255) {
        nextBrokerHost = 1;
        nextScanCycleAt = now + BROKER_DISCOVERY_MS;
        Serial.println("MQTT broker not found on this LAN; retrying");
        return false;
    }

    // Probe one local address per loop so sensor/alarm updates keep running.
    const IPAddress candidate(own[0], own[1], own[2], nextBrokerHost++);
    if (candidate == own) return false;
    WiFiClient probe;
    if (probe.connect(candidate, MQTT_PORT, 50)) {
        probe.stop();
        brokerIp = candidate;
        Serial.printf("MQTT broker candidate at %s:%u\n",
                      brokerIp.toString().c_str(), MQTT_PORT);
        return true;
    }
    return false;
}

void maintainConnections(unsigned long now) {
    // The local alarm and sensor loop keep working even with no network.
    if (WiFi.status() != WL_CONNECTED) {
        brokerIp = IPAddress();
        nextBrokerHost = 1;
        nextScanCycleAt = 0;
        if (isPlaceholder(WIFI_SSID) || isPlaceholder(WIFI_PASSWORD)
                || now - lastWifiAttemptAt < 10000) return;
        lastWifiAttemptAt = now;
        Serial.printf("Connecting to Wi-Fi: %s\n", WIFI_SSID);
        WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
        return;
    }

    if (!mqtt.connected()) {
        if (isPlaceholder(MQTT_USERNAME) || isPlaceholder(MQTT_PASSWORD)) return;
        if (!discoverBroker(now)) return;
        if (now - lastMqttAttemptAt < 3000) return;
        lastMqttAttemptAt = now;
        if (!isPlaceholder(MQTT_HOST)) {
            mqtt.setServer(MQTT_HOST, MQTT_PORT);
            Serial.printf("Connecting to MQTT broker %s:%u...\n", MQTT_HOST, MQTT_PORT);
        } else {
            mqtt.setServer(brokerIp, MQTT_PORT);
            Serial.printf("Connecting to MQTT broker %s:%u...\n",
                          brokerIp.toString().c_str(), MQTT_PORT);
        }
        const String clientId = String(DEVICE_ID) + "-" + String((uint32_t)ESP.getEfuseMac(), HEX);
        const String status = nodeStatusTopic();
        StaticJsonDocument<128> will;
        will["type"] = "NODE_STATUS";
        will["deviceId"] = DEVICE_ID;
        will["online"] = false;
        will["timestamp"] = 0;
        char willPayload[128];
        serializeJson(will, willPayload, sizeof(willPayload));
        if (mqtt.connect(clientId.c_str(), MQTT_USERNAME, MQTT_PASSWORD,
                         status.c_str(), 1, true, willPayload)) {
            Serial.println("MQTT connected");
            const String topic = commandTopic();
            if (mqtt.subscribe(topic.c_str(), 1)) Serial.println("Subscribed to device commands");
            else Serial.println("Could not subscribe to device commands");
            publishNodeStatus(true);
            publishCapabilities();
            mqttJustConnected = true;
        } else {
            Serial.printf("MQTT connection failed, state=%d\n", mqtt.state());
            if (isPlaceholder(MQTT_HOST)) {
                brokerIp = IPAddress(); // Rediscover if the host changed its IP.
            }
        }
    }
    mqtt.loop();
}

void publishTelemetry(float temperature, float humidity) {
    if (!mqtt.connected()) return;
    StaticJsonDocument<512> message;
    message["type"] = "TELEMETRY";
    message["deviceId"] = DEVICE_ID;
    message["sensorId"] = SENSOR_ID;
    message["temperature"] = temperature;
    message["humidity"] = humidity;
    message["alarmThresholdC"] = ALARM_TEMP_C;
    JsonObject measurements = message.createNestedObject("measurements");
    measurements["temperature"] = temperature;
    measurements["humidity"] = humidity;
    JsonObject units = message.createNestedObject("units");
    units["temperature"] = "C";
    units["humidity"] = "%";
    message["alertState"] = alarmActive ? "CRITICAL" : "NORMAL";
    message["buzzerState"] = alarmActive || manualBuzzerOn;
    message["ledState"] = alarmActive || manualLedOn;
    message["ledColor"] = currentLedColor();
    message["wifiRssi"] = WiFi.RSSI();
    message["uptimeSeconds"] = millis() / 1000;
    message["timestamp"] = (uint64_t)time(nullptr) * 1000;
    char payload[512];
    const size_t length = serializeJson(message, payload, sizeof(payload));
    const String topic = telemetryTopic();
    if (mqtt.publish(topic.c_str(), (const uint8_t*)payload, length, false)) {
        Serial.println("MQTT telemetry published");
    } else {
        Serial.println("MQTT telemetry publish failed");
    }
}

bool publishFireEvent(float temperature, bool active) {
    if (!mqtt.connected()) return false;
    StaticJsonDocument<384> message;
    message["type"] = active ? "ALERT" : "ALERT_CLEARED";
    message["alertId"] = String(DEVICE_ID) + "-" + String((uint32_t)esp_random(), HEX);
    message["deviceId"] = DEVICE_ID;
    message["temperature"] = temperature;
    message["severity"] = active ? "CRITICAL" : "NORMAL";
    message["message"] = active
            ? String("Demo temperature exceeded ") + String(ALARM_TEMP_C, 1) + " C"
            : String("Demo temperature returned to normal");
    message["timestamp"] = (uint64_t)time(nullptr) * 1000;
    message["active"] = active;
    char payload[384];
    const size_t length = serializeJson(message, payload, sizeof(payload));
    const String topic = fireTopic();
    if (mqtt.publish(topic.c_str(), (const uint8_t*)payload, length, true)) {
        Serial.println(active ? "MQTT fire alert published" : "MQTT alert clear published");
        return true;
    }
    Serial.println("MQTT alert publish failed; event remains queued");
    return false;
}

void queueFireEvent(float temperature, bool active) {
    if (pendingFireCount < MAX_PENDING_FIRE_EVENTS) {
        const uint8_t index = (pendingFireHead + pendingFireCount) % MAX_PENDING_FIRE_EVENTS;
        pendingFireEvents[index] = {temperature, active};
        pendingFireCount++;
        return;
    }

    // Keep at least one alarm assertion and the newest state if the small RAM queue fills.
    PendingFireEvent firstAssertion = {temperature, active};
    bool foundAssertion = active;
    for (uint8_t i = 0; i < pendingFireCount && !foundAssertion; i++) {
        const uint8_t index = (pendingFireHead + i) % MAX_PENDING_FIRE_EVENTS;
        if (pendingFireEvents[index].active) {
            firstAssertion = pendingFireEvents[index];
            foundAssertion = true;
        }
    }
    pendingFireHead = 0;
    pendingFireEvents[0] = foundAssertion ? firstAssertion : PendingFireEvent{temperature, active};
    pendingFireCount = 1;
    if (pendingFireEvents[0].active != active) {
        pendingFireEvents[1] = {temperature, active};
        pendingFireCount = 2;
    }
    Serial.println("MQTT alert queue compacted while offline");
}

bool pendingFireState(bool& active) {
    if (pendingFireCount == 0) return false;
    const uint8_t index = (pendingFireHead + pendingFireCount - 1) % MAX_PENDING_FIRE_EVENTS;
    active = pendingFireEvents[index].active;
    return true;
}

void flushPendingFireEvents() {
    while (mqtt.connected() && pendingFireCount > 0) {
        const PendingFireEvent event = pendingFireEvents[pendingFireHead];
        if (!publishFireEvent(event.temperature, event.active)) return;
        pendingFireHead = (pendingFireHead + 1) % MAX_PENDING_FIRE_EVENTS;
        pendingFireCount--;
    }
}

void publishHeartbeat() {
    if (!mqtt.connected()) return;
    StaticJsonDocument<192> message;
    message["type"] = "HEARTBEAT";
    message["deviceId"] = DEVICE_ID;
    message["uptimeSeconds"] = millis() / 1000;
    message["wifiRssi"] = WiFi.RSSI();
    message["timestamp"] = (uint64_t)time(nullptr) * 1000;
    char payload[192];
    const size_t length = serializeJson(message, payload, sizeof(payload));
    const String topic = heartbeatTopic();
    mqtt.publish(topic.c_str(), (const uint8_t*)payload, length, false);
}

void setup() {
    Serial.begin(115200);
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);
    pixel.begin();
    pixel.setBrightness(30);
    pixel.setPixelColor(0, pixel.Color(0, 80, 0));
    pixel.show();
    dht.begin();
    mqtt.setBufferSize(768);
    mqtt.setCallback(onMqttMessage);
    WiFi.mode(WIFI_STA);
    Serial.println("DHT11 + local alarm + MQTT node starting");
    Serial.printf("Local alarm threshold >%.1f C; it does not depend on Wi-Fi/MQTT\n", ALARM_TEMP_C);
}

void loop() {
    const unsigned long now = millis();
    maintainConnections(now);
    const bool wifiConnected = WiFi.status() == WL_CONNECTED;
    if (wifiConnected != wifiWasConnected) {
        wifiWasConnected = wifiConnected;
        if (wifiConnected) {
            Serial.printf("Wi-Fi connected, IP: %s\n", WiFi.localIP().toString().c_str());
        } else {
            Serial.println("Wi-Fi disconnected");
        }
    }
    if (now - lastHeartbeatAt >= HEARTBEAT_MS) {
        lastHeartbeatAt = now;
        publishHeartbeat();
    }
    if (now - lastSampleAt < SAMPLE_MS) return;
    lastSampleAt = now;

    ClimateReading reading;
    if (!dht.read(reading)) {
        Serial.println("DHT11 read failed; check power, ground and GPIO 4");
        return; // Retain the previous safe alarm state until a valid sample.
    }

    const float temperature = reading.temperature;
    const float humidity = reading.humidity;

    Serial.printf("Temperature: %.1f C | Humidity: %.1f %% | MQTT: %s\n",
                  temperature, humidity, mqtt.connected() ? "connected" : "offline");
    const bool wasAlarmActive = alarmActive;
    setAlarm(temperature > ALARM_TEMP_C); // Local response first; network is optional.
    publishTelemetry(temperature, humidity);
    if (alarmActive != wasAlarmActive) {
        // Keep transitions observed offline so a short alarm is not lost on reconnect.
        queueFireEvent(temperature, alarmActive);
    }
    if (mqttJustConnected) {
        bool queuedState = false;
        if (!pendingFireState(queuedState) || queuedState != alarmActive) {
            // Re-publish the current state after reconnect, even if no transition was queued.
            queueFireEvent(temperature, alarmActive);
        }
        mqttJustConnected = false;
    }
    flushPendingFireEvents();
}
