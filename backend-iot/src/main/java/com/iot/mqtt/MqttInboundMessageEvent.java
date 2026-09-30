package com.iot.mqtt;

public record MqttInboundMessageEvent(String topic, String payload, int qos, boolean retained) {
}
