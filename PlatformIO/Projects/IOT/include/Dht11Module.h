#pragma once

#include <DHT.h>
#include <math.h>
#include "HardwareConfig.h"

struct ClimateReading {
    float temperature;
    float humidity;
};

class Dht11Module {
public:
    Dht11Module() : sensor_(HardwareConfig::DHT_PIN, DHT11) {}
    void begin() { sensor_.begin(); }
    bool read(ClimateReading& reading) {
        reading.humidity = sensor_.readHumidity();
        reading.temperature = sensor_.readTemperature();
        return !isnan(reading.humidity) && !isnan(reading.temperature);
    }

private:
    DHT sensor_;
};
