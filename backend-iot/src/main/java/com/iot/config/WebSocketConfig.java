package com.iot.config;

import com.iot.websocket.DashboardWebSocketHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import java.util.Arrays;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final DashboardWebSocketHandler dashboardHandler;
    private final String[] allowedOrigins;

    public WebSocketConfig(DashboardWebSocketHandler dashboardHandler,
                           @Value("${iot.websocket.allowed-origins}") String allowedOrigins) {
        this.dashboardHandler = dashboardHandler;
        this.allowedOrigins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toArray(String[]::new);
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // ESP32 uses MQTT. WebSocket is reserved for realtime browser updates.
        registry.addHandler(dashboardHandler, "/ws/iot/dashboard")
                .setAllowedOrigins(allowedOrigins);
    }
}
