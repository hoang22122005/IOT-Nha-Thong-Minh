#pragma once

#include <Arduino.h>

namespace HardwareConfig {
constexpr uint8_t DHT_PIN = 4;
constexpr uint8_t BUZZER_PIN = 13;
constexpr uint8_t RGB_PIN = 48;
constexpr float ALARM_TEMP_C = 39.0f;
constexpr unsigned long SAMPLE_MS = 2000;
constexpr unsigned long HEARTBEAT_MS = 5000;
constexpr unsigned long BROKER_DISCOVERY_MS = 10000;
}
