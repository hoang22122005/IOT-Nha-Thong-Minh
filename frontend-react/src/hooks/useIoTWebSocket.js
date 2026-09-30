import { useState, useEffect, useRef, useCallback } from 'react';

const REST_BASE = '/api/iot/v1';
const DEFAULT_DEVICE_ID = 'esp32-room-01';
const HISTORY_RANGES = { '1h': 60 * 60 * 1000, '6h': 6 * 60 * 60 * 1000, '24h': 24 * 60 * 60 * 1000, '7d': 7 * 24 * 60 * 60 * 1000 };
const DEFAULT_DEVICE_STATE = {
  deviceId: DEFAULT_DEVICE_ID,
  sensorId: 'dht11-01',
  online: false,
  temperature: null,
  humidity: null,
  measurements: {},
  units: {},
  actuators: [],
  sensors: {},
  fireDanger: 'NORMAL',
  ledState: 'OFF',
  ledR: 0,
  ledG: 255,
  ledB: 0,
  acState: 'OFF',
  buzzerState: 'OFF',
  lastUpdate: null,
};

function normalizeDeviceState(raw, previous = {}) {
  const state = {
    ...previous,
    ...raw,
    lastUpdate: new Date().toLocaleTimeString('vi-VN'),
  };
  if (raw.alertState != null) state.fireDanger = raw.alertState;
  if (typeof raw.fireDanger === 'string') state.fireDanger = raw.fireDanger;
  if (typeof raw.ledState === 'boolean') state.ledState = raw.ledState ? 'ON' : 'OFF';
  if (typeof raw.buzzerState === 'boolean') state.buzzerState = raw.buzzerState ? 'ON' : 'OFF';
  state.measurements = { ...(previous.measurements || {}), ...(raw.measurements || {}) };
  state.units = { ...(previous.units || {}), ...(raw.units || {}) };
  state.sensors = { ...(previous.sensors || {}), ...(raw.sensors || {}) };
  if (typeof raw.temperature === 'number') state.measurements.temperature = raw.temperature;
  if (typeof raw.humidity === 'number') state.measurements.humidity = raw.humidity;
  if (typeof state.measurements.temperature === 'number') state.temperature = state.measurements.temperature;
  if (typeof state.measurements.humidity === 'number') state.humidity = state.measurements.humidity;
  return state;
}

export function useIoTWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [deviceState, setDeviceState] = useState(DEFAULT_DEVICE_STATE);
  const [deviceStates, setDeviceStates] = useState({ [DEFAULT_DEVICE_ID]: DEFAULT_DEVICE_STATE });
  const [selectedDeviceId, setSelectedDeviceId] = useState(DEFAULT_DEVICE_ID);
  const [selectedSensorId, setSelectedSensorId] = useState('dht11-01');
  const [alertHistory, setAlertHistory] = useState([]);
  const [activeAlert, setActiveAlert] = useState(null);
  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [historyRange, setHistoryRange] = useState('24h');
  const [latency, setLatency] = useState(0);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const deviceStatesRef = useRef({ [DEFAULT_DEVICE_ID]: DEFAULT_DEVICE_STATE });
  const selectedDeviceIdRef = useRef(DEFAULT_DEVICE_ID);
  const selectedSensorIdRef = useRef('dht11-01');
  const historyRangeRef = useRef('24h');
  const loadedHistoryKeyRef = useRef(null);
  const requestedHistorySensorsRef = useRef(new Set());

  const loadSensorHistory = useCallback(async (sensorId, deviceId, range = historyRangeRef.current) => {
    if (!sensorId || !deviceId) return;
    const requestKey = `${deviceId}:${sensorId}:${range}`;
    if (loadedHistoryKeyRef.current === requestKey || requestedHistorySensorsRef.current.has(requestKey)) return;
    requestedHistorySensorsRef.current.add(requestKey);
    const to = Date.now();
    const from = to - (HISTORY_RANGES[range] || HISTORY_RANGES['24h']);
    try {
      const response = await fetch(`${REST_BASE}/sensors/${encodeURIComponent(sensorId)}/history?deviceId=${encodeURIComponent(deviceId)}&from=${from}&to=${to}&limit=1000`);
      if (!response.ok) throw new Error(`Không tải được lịch sử cảm biến ${sensorId}.`);
      const rows = await response.json();
      requestedHistorySensorsRef.current.delete(requestKey);
      if (selectedDeviceIdRef.current !== deviceId || selectedSensorIdRef.current !== sensorId
          || historyRangeRef.current !== range) {
        return;
      }

      const historical = rows.slice().reverse().map((row) => {
        const timestamp = Number(row.timestamp) || Date.now();
        return {
          timestamp,
          time: new Date(timestamp).toLocaleString('vi-VN'),
          temperature: row.temperature ?? null,
          humidity: row.humidity ?? null,
          measurements: row.measurements || {},
          units: row.units || {},
        };
      });

      setTelemetryHistory((previous) => {
        const byTimestamp = new Map();
        [...historical, ...previous.filter((point) => point.timestamp >= from)].forEach((point) => byTimestamp.set(point.timestamp, point));
        return [...byTimestamp.values()]
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(-1000);
      });
      loadedHistoryKeyRef.current = requestKey;
    } catch (error) {
      requestedHistorySensorsRef.current.delete(requestKey);
      console.error('Could not load sensor history:', error);
    }
  }, []);

  const connect = useCallback(() => {
    // Protocol and host detection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/iot/dashboard`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected to IoT backend:', wsUrl);
        setIsConnected(true);

        // Periodic ping
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            const start = Date.now();
            ws.send(JSON.stringify({ type: 'PING', timestamp: start }));
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'INIT_STATE') {
            const initialDevices = Array.isArray(data.deviceStates) && data.deviceStates.length
              ? data.deviceStates
              : (data.deviceState ? [data.deviceState] : []);
            const nextDevices = {};
            initialDevices.forEach((raw) => {
              nextDevices[raw.deviceId] = normalizeDeviceState(raw, nextDevices[raw.deviceId] || {});
            });
            if (!nextDevices[selectedDeviceIdRef.current]) {
              const fallbackDeviceId = nextDevices[DEFAULT_DEVICE_ID]
                ? DEFAULT_DEVICE_ID
                : (Object.keys(nextDevices)[0] || DEFAULT_DEVICE_ID);
              selectedDeviceIdRef.current = fallbackDeviceId;
              setSelectedDeviceId(fallbackDeviceId);
            }
            deviceStatesRef.current = nextDevices;
            setDeviceStates(nextDevices);
            const selectedState = nextDevices[selectedDeviceIdRef.current];
            if (selectedState) {
              setDeviceState(selectedState);
              const sensorId = selectedState.sensors?.[selectedSensorIdRef.current]
                ? selectedSensorIdRef.current
                : Object.keys(selectedState.sensors || {})[0] || selectedState.sensorId;
              selectedSensorIdRef.current = sensorId;
              setSelectedSensorId(sensorId);
              const sensor = selectedState.sensors?.[sensorId];
              if (sensor?.measurements && Object.keys(sensor.measurements).length) {
                const timestamp = Number(selectedState.lastSeenAt) || Date.now();
                setTelemetryHistory((prev) => [
                  ...prev,
                  {
                    timestamp,
                    time: new Date(timestamp).toLocaleString('vi-VN'),
                    temperature: sensor.measurements.temperature ?? null,
                    humidity: sensor.measurements.humidity ?? null,
                    measurements: sensor.measurements,
                    units: sensor.units || {},
                  },
                ].slice(-200));
              }
              loadSensorHistory(sensorId, selectedState.deviceId);
            }
            if (Array.isArray(data.alertHistory)) {
              setAlertHistory(data.alertHistory);
              const unAcked = data.alertHistory.find((a) => !a.acknowledged && a.active !== false);
              if (unAcked) setActiveAlert(unAcked);
            }
          } else if (data.type === 'DEVICE_CAPABILITIES') {
            const deviceId = data.deviceId;
            if (deviceId) {
              const previous = deviceStatesRef.current[deviceId] || { ...DEFAULT_DEVICE_STATE, deviceId };
              const updated = normalizeDeviceState(data, previous);
              deviceStatesRef.current = { ...deviceStatesRef.current, [deviceId]: updated };
              setDeviceStates(deviceStatesRef.current);
              if (deviceId === selectedDeviceIdRef.current) setDeviceState(updated);
            }
          } else if (data.type === 'TELEMETRY') {
            const deviceId = data.deviceId || DEFAULT_DEVICE_ID;
            const previous = deviceStatesRef.current[deviceId] || { ...DEFAULT_DEVICE_STATE, deviceId };
            const reported = normalizeDeviceState({ ...data, online: true }, previous);
            deviceStatesRef.current = { ...deviceStatesRef.current, [deviceId]: reported };
            setDeviceStates(deviceStatesRef.current);
            if (deviceId === selectedDeviceIdRef.current) setDeviceState(reported);
            if (deviceId === selectedDeviceIdRef.current && data.sensorId
                && !reported.sensors?.[selectedSensorIdRef.current]) {
              selectedSensorIdRef.current = data.sensorId;
              setSelectedSensorId(data.sensorId);
              loadedHistoryKeyRef.current = null;
              setTelemetryHistory([]);
            }

            if (deviceId === selectedDeviceIdRef.current && data.sensorId === selectedSensorIdRef.current) {
              loadSensorHistory(data.sensorId, deviceId);
            }

            // Keep live points alongside MongoDB history for the selected node.
            if (deviceId === selectedDeviceIdRef.current && data.sensorId === selectedSensorIdRef.current
                && (data.temperature != null || data.humidity != null || Object.keys(data.measurements || {}).length)) setTelemetryHistory((prev) => {
              const timestamp = Number(data.timestamp) || Date.now();
              const updated = [
                ...prev,
                {
                  timestamp,
                  time: new Date(timestamp).toLocaleString('vi-VN'),
                  temperature: data.temperature ?? data.measurements?.temperature ?? null,
                  humidity: data.humidity ?? data.measurements?.humidity ?? null,
                  measurements: data.measurements || {},
                  units: data.units || {},
                },
              ];
              const byTimestamp = new Map(updated.map((point) => [point.timestamp, point]));
              return [...byTimestamp.values()].sort((a, b) => a.timestamp - b.timestamp).slice(-1000);
            });
          } else if (data.type === 'COMMAND') {
            setDeviceState((prev) => {
              const updated = { ...prev };
              if (data.target === 'LED') {
                updated.ledState = data.action;
                if (data.r !== undefined) updated.ledR = data.r;
                if (data.g !== undefined) updated.ledG = data.g;
                if (data.b !== undefined) updated.ledB = data.b;
              } else if (data.target === 'AC') {
                updated.acState = data.action;
              } else if (data.target === 'BUZZER') {
                updated.buzzerState = data.action;
              }
              return updated;
            });
          } else if (data.type === 'ALERT') {
            setActiveAlert(data);
            if (data.deviceId) {
              const previous = deviceStatesRef.current[data.deviceId] || { ...DEFAULT_DEVICE_STATE, deviceId: data.deviceId };
              const updated = { ...previous, fireDanger: data.dangerLevel ?? data.severity ?? 'CRITICAL' };
              deviceStatesRef.current = { ...deviceStatesRef.current, [data.deviceId]: updated };
              setDeviceStates(deviceStatesRef.current);
              if (data.deviceId === selectedDeviceIdRef.current) setDeviceState(updated);
            }
            setAlertHistory((prev) => [data, ...prev.slice(0, 49)]);
          } else if (data.type === 'ALERT_ACK') {
            setActiveAlert(null);
            setAlertHistory((prev) =>
              prev.map((a) => (a.alertId === data.alertId ? { ...a, acknowledged: true } : a))
            );
          } else if (data.type === 'ALERT_CLEARED') {
            setActiveAlert(null);
            const deviceId = data.deviceId;
            if (deviceId) {
              const previous = deviceStatesRef.current[deviceId] || { ...DEFAULT_DEVICE_STATE, deviceId };
              const updated = { ...previous, fireDanger: 'NORMAL' };
              deviceStatesRef.current = { ...deviceStatesRef.current, [deviceId]: updated };
              setDeviceStates(deviceStatesRef.current);
              if (deviceId === selectedDeviceIdRef.current) setDeviceState(updated);
            }
            setAlertHistory((prev) => prev.map((a) => (
              a.deviceId === data.deviceId ? { ...a, active: false } : a
            )));
          } else if (data.type === 'NODE_STATUS_CHANGED') {
            const deviceId = data.deviceId || DEFAULT_DEVICE_ID;
            const previous = deviceStatesRef.current[deviceId] || { ...DEFAULT_DEVICE_STATE, deviceId };
            const updated = normalizeDeviceState({ online: data.online }, previous);
            deviceStatesRef.current = { ...deviceStatesRef.current, [deviceId]: updated };
            setDeviceStates(deviceStatesRef.current);
            if (deviceId === selectedDeviceIdRef.current) setDeviceState(updated);
          } else if (data.type === 'PONG') {
            if (data.timestamp) {
              setLatency(Date.now() - data.timestamp);
            }
          }
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err);
        }
      };

      ws.onclose = () => {
        console.warn('[WebSocket] Connection closed. Reconnecting in 3s...');
        setIsConnected(false);
        clearInterval(pingIntervalRef.current);
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error('[WebSocket] Error occurred:', err);
        ws.close();
      };
    } catch (e) {
      console.error('[WebSocket] Initialization error:', e);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, [loadSensorHistory]);

  const selectDevice = (deviceId) => {
    selectedDeviceIdRef.current = deviceId;
    setSelectedDeviceId(deviceId);
    setDeviceState(deviceStatesRef.current[deviceId] || { ...DEFAULT_DEVICE_STATE, deviceId });
    setTelemetryHistory([]);
    loadedHistoryKeyRef.current = null;
    const selectedState = deviceStatesRef.current[deviceId];
    const sensorId = Object.keys(selectedState?.sensors || {})[0] || selectedState?.sensorId;
    selectedSensorIdRef.current = sensorId;
    setSelectedSensorId(sensorId);
    if (sensorId) loadSensorHistory(sensorId, deviceId, historyRangeRef.current);
  };

  const selectSensor = (sensorId) => {
    if (!sensorId || sensorId === selectedSensorIdRef.current) return;
    selectedSensorIdRef.current = sensorId;
    setSelectedSensorId(sensorId);
    loadedHistoryKeyRef.current = null;
    setTelemetryHistory([]);
    loadSensorHistory(sensorId, selectedDeviceIdRef.current, historyRangeRef.current);
  };

  const changeHistoryRange = (range) => {
    if (!HISTORY_RANGES[range] || range === historyRangeRef.current) return;
    historyRangeRef.current = range;
    setHistoryRange(range);
    loadedHistoryKeyRef.current = null;
    setTelemetryHistory([]);
    const deviceId = selectedDeviceIdRef.current;
    if (selectedSensorIdRef.current) loadSensorHistory(selectedSensorIdRef.current, deviceId, range);
  };

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, [connect]);

  // REST carries commands to Spring Boot; WebSocket only carries reported updates.
  const sendLightCommand = async (action, r = 0, g = 255, b = 0) => {
    try {
      const response = await fetch(`${REST_BASE}/devices/light`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, r, g, b, deviceId: selectedDeviceIdRef.current }),
      });
      // Wait for reported device state over MQTT -> Spring -> WebSocket.
      const result = await response.json();
      return response.ok && result.success === true;
    } catch (err) {
      console.error('Error sending light command:', err);
      return false;
    }
  };

  const sendAcCommand = async (state) => {
    try {
      const response = await fetch(`${REST_BASE}/devices/${encodeURIComponent(selectedDeviceIdRef.current)}/commands`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'AC', action: state }),
      });
      return response.ok;
    } catch (err) {
      console.error('Error sending AC command:', err);
      return false;
    }
  };

  const sendBuzzerCommand = async (state) => {
    try {
      const response = await fetch(`${REST_BASE}/devices/buzzer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, deviceId: selectedDeviceIdRef.current }),
      });
      // Wait for reported device state over MQTT -> Spring -> WebSocket.
      const result = await response.json();
      return response.ok && result.success === true;
    } catch (err) {
      console.error('Error sending buzzer command:', err);
      return false;
    }
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      await fetch(`${REST_BASE}/alerts/${alertId}/ack`, { method: 'POST' });

      setActiveAlert(null);
      setAlertHistory((prev) =>
        prev.map((a) => (a.alertId === alertId ? { ...a, acknowledged: true } : a))
      );
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  return {
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
  };
}
