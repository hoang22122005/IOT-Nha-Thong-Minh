package com.iot.config;

import com.iot.websocket.DashboardWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final DashboardWebSocketHandler dashboardHandler;

    public WebSocketConfig(DashboardWebSocketHandler dashboardHandler) {
        this.dashboardHandler = dashboardHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // ESP32 uses MQTT. WebSocket is reserved for realtime browser updates.
        registry.addHandler(dashboardHandler, "/ws/iot/dashboard")
                .setAllowedOrigins("*");
    }
}
