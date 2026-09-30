import React from 'react';
import { useIoTWebSocket } from './hooks/useIoTWebSocket';
import Header from './components/Header';
import FireAlertBanner from './components/FireAlertBanner';
import MetricsGrid from './components/MetricsGrid';
import ControlPanel from './components/ControlPanel';
import TelemetryChart from './components/TelemetryChart';
import ActivityLog from './components/ActivityLog';
import HomeDigitalTwin from './components/HomeDigitalTwin';
import AutomationPanel from './components/AutomationPanel';
import ScenePanel from './components/ScenePanel';
import VoiceCommandPanel from './components/VoiceCommandPanel';

export default function App() {
  const {
    isConnected,
    deviceState,
    deviceStates,
    selectedDeviceId,
    selectedSensorId,
    selectDevice,
    selectSensor,
    alertHistory,
    activeAlert,
    telemetryHistory,
    historyRange,
    changeHistoryRange,
    latency,
    sendLightCommand,
    sendAcCommand,
    sendBuzzerCommand,
    acknowledgeAlert,
  } = useIoTWebSocket();

  return (
    <div className="app-container">
      {/* 1. System Header */}
      <Header
        isConnected={isConnected}
        deviceState={deviceState}
        latency={latency}
      />

      <HomeDigitalTwin
        deviceStates={deviceStates}
        selectedDeviceId={selectedDeviceId}
        onSelect={selectDevice}
      />

      <AutomationPanel selectedDeviceId={selectedDeviceId} />

      <ScenePanel selectedDeviceId={selectedDeviceId} />

      {/* 2. Critical Fire Hazard Alert Banner (Appears if triggered) */}
      <FireAlertBanner
        activeAlert={activeAlert}
        fireDanger={deviceState.fireDanger}
        alarmThresholdC={deviceState.alarmThresholdC ?? 33}
        onAcknowledge={acknowledgeAlert}
      />

      {/* 3. Sensor metrics and the demo temperature-threshold alert */}
      <MetricsGrid deviceState={deviceState} />

      {/* 4. Actuator & Sensor Interactive Control Panel */}
      <ControlPanel
        deviceState={deviceState}
        sendLightCommand={sendLightCommand}
        sendAcCommand={sendAcCommand}
        sendBuzzerCommand={sendBuzzerCommand}
      />

      {(deviceState.actuators?.some((name) => ['LED', 'BUZZER'].includes(name))
        || (deviceState.deviceId === 'esp32-room-01' && !deviceState.actuators?.length)) && <VoiceCommandPanel
        selectedDeviceId={selectedDeviceId}
        supportedActuators={deviceState.actuators?.length ? deviceState.actuators : ['LED', 'BUZZER']}
        sendLightCommand={sendLightCommand}
        sendBuzzerCommand={sendBuzzerCommand}
      />}

      {/* 5. Realtime Telemetry Dual-Axis Chart */}
      <TelemetryChart telemetryHistory={telemetryHistory} historyRange={historyRange}
        onRangeChange={changeHistoryRange} sensors={deviceState.sensors || {}}
        selectedSensorId={selectedSensorId} onSensorChange={selectSensor} />

      {/* 6. Alert & Event Activity Log */}
      <ActivityLog
        alertHistory={alertHistory}
        telemetryHistory={telemetryHistory}
      />

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '16px 0',
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
      }}>
        Hệ Thống Smart Home IoT &bull; Nhiều ESP32 & MQTT & Redis & MongoDB & WebSocket
      </footer>
    </div>
  );
}
