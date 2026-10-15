import { useCallback, useEffect, useRef, useState } from 'react';
import { HISTORY_RANGES, normalizeDevice, mergeHistory, updateAlerts, commandMatches } from '../lib/iot';

const API = '/api/iot/v1';

export function useIoTWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [hasSnapshot, setHasSnapshot] = useState(false);
  const [deviceStates, setDeviceStates] = useState({});
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [selectedSensorId, setSelectedSensorId] = useState('');
  const [alertHistory, setAlertHistory] = useState([]);
  const [historyRange, setHistoryRange] = useState('24h');
  const [history, setHistory] = useState({ key: '', rows: [], loading: false, error: '' });
  const [refreshKey, setRefreshKey] = useState(0);
  const [latency, setLatency] = useState(null);
  const [commandFeedback, setCommandFeedback] = useState({});
  const devicesRef = useRef({});
  const selectedRef = useRef({ deviceId: '', sensorId: '', range: '24h' });
  const readyRef = useRef(false);
  const pendingRef = useRef({});
  const timersRef = useRef({});

  const selectDevice = useCallback((deviceId) => {
    const device = devicesRef.current[deviceId];
    const sensorId = Object.keys(device?.sensors || {})[0] || device?.sensorId || '';
    selectedRef.current = { ...selectedRef.current, deviceId, sensorId };
    setSelectedDeviceId(deviceId);
    setSelectedSensorId(sensorId);
  }, []);
  const selectSensor = useCallback((sensorId) => {
    selectedRef.current.sensorId = sensorId;
    setSelectedSensorId(sensorId);
  }, []);
  const changeHistoryRange = useCallback((range) => {
    if (!HISTORY_RANGES[range]) return;
    selectedRef.current.range = range;
    setHistoryRange(range);
  }, []);
  const refreshHistory = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    let stopped = false;
    let socket;
    let reconnect;
    let ping;
    const connect = () => {
      socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/iot/dashboard`);
      socket.onopen = () => {
        if (stopped) return;
        setIsConnected(true);
        socket.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
        ping = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
        }, 15000);
      };
      socket.onmessage = ({ data: payload }) => {
        if (stopped) return;
        try {
          const data = JSON.parse(payload);
          if (data.type === 'INIT_STATE') {
            const rows = Array.isArray(data.deviceStates) ? data.deviceStates : data.deviceState ? [data.deviceState] : [];
            devicesRef.current = Object.fromEntries(rows.filter((row) => row.deviceId).map((row) => [row.deviceId, normalizeDevice(row)]));
            setDeviceStates(devicesRef.current);
            setAlertHistory(Array.isArray(data.alertHistory) ? data.alertHistory : []);
            readyRef.current = true;
            setHasSnapshot(true);
            if (!devicesRef.current[selectedRef.current.deviceId]) selectDevice(Object.keys(devicesRef.current)[0] || '');
            else {
              const current = selectedRef.current;
              if (!devicesRef.current[current.deviceId]?.sensors?.[current.sensorId]) selectDevice(current.deviceId);
            }
            refreshHistory();
          } else if (['TELEMETRY', 'DEVICE_CAPABILITIES', 'NODE_STATUS_CHANGED'].includes(data.type) && data.deviceId) {
            const next = normalizeDevice(data, devicesRef.current[data.deviceId]);
            devicesRef.current = { ...devicesRef.current, [data.deviceId]: next };
            setDeviceStates(devicesRef.current);
            if (!selectedRef.current.deviceId) selectDevice(data.deviceId);
            if (selectedRef.current.deviceId === data.deviceId && !next.sensors?.[selectedRef.current.sensorId]) {
              selectSensor(Object.keys(next.sensors || {})[0] || next.sensorId || '');
            }
            const current = selectedRef.current;
            if (data.type === 'TELEMETRY' && data.deviceId === current.deviceId && data.sensorId === current.sensorId) {
              const key = `${current.deviceId}/${current.sensorId}/${current.range}`;
              setHistory((old) => old.key === key ? { ...old, rows: mergeHistory([...old.rows, data], Date.now() - HISTORY_RANGES[current.range]) } : old);
            }
            for (const [key, command] of Object.entries(pendingRef.current)) {
              if (command.deviceId === data.deviceId && commandMatches(next, command)) {
                clearTimeout(timersRef.current[key]);
                delete pendingRef.current[key];
                setCommandFeedback((old) => ({ ...old, [key]: { phase: 'confirmed', message: 'Thiết bị đã báo trạng thái khớp lệnh.' } }));
              }
            }
          } else if (['ALERT', 'ALERT_ACK', 'ALERT_CLEARED'].includes(data.type)) {
            setAlertHistory((old) => updateAlerts(old, data));
            const previous = devicesRef.current[data.deviceId];
            if (previous && data.type !== 'ALERT_ACK') {
              const updated = normalizeDevice({ fireDanger: data.type === 'ALERT_CLEARED' ? 'NORMAL' : data.severity === 'WARNING' ? 'WARNING' : 'CRITICAL' }, previous);
              devicesRef.current = { ...devicesRef.current, [data.deviceId]: updated };
              setDeviceStates(devicesRef.current);
            }
          } else if (data.type === 'PONG' && data.timestamp) {
            setLatency(Math.max(0, Date.now() - data.timestamp));
          }
          // A COMMAND event describes intent, never hardware confirmation.
        } catch (error) {
          console.error('Bản tin WebSocket không hợp lệ:', error);
        }
      };
      socket.onerror = () => socket.close();
      socket.onclose = () => {
        clearInterval(ping);
        readyRef.current = false;
        if (stopped) return;
        setIsConnected(false);
        setHasSnapshot(false);
        setLatency(null);
        reconnect = setTimeout(connect, 3000);
      };
    };
    connect();
    return () => {
      stopped = true;
      readyRef.current = false;
      clearTimeout(reconnect);
      clearInterval(ping);
      socket?.close();
      Object.values(timersRef.current).forEach(clearTimeout);
      pendingRef.current = {};
    };
  }, [selectDevice, selectSensor, refreshHistory]);

  useEffect(() => {
    if (!selectedDeviceId || !selectedSensorId) return;
    const controller = new AbortController();
    const key = `${selectedDeviceId}/${selectedSensorId}/${historyRange}`;
    const to = Date.now();
    const from = to - HISTORY_RANGES[historyRange];
    const sensor = devicesRef.current[selectedDeviceId]?.sensors?.[selectedSensorId];
    const seed = sensor ? mergeHistory([{ ...sensor, timestamp: sensor.lastSeenAt }], from) : [];
    setHistory((old) => ({ key, rows: old.key === key ? old.rows : seed, loading: true, error: '' }));
    const query = new URLSearchParams({ deviceId: selectedDeviceId, from, to, limit: 1000 });
    fetch(`${API}/sensors/${encodeURIComponent(selectedSensorId)}/history?${query}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) })
      .then(async (response) => {
        if (!response.ok) throw new Error('Không tải được lịch sử cảm biến.');
        const rows = await response.json();
        if (!Array.isArray(rows)) throw new Error('Dữ liệu lịch sử không hợp lệ.');
        if (controller.signal.aborted) return;
        setHistory((old) => old.key === key ? { key, rows: mergeHistory([...rows, ...old.rows], from), loading: false, error: '' } : old);
      }).catch((error) => {
        if (!controller.signal.aborted) setHistory((old) => old.key === key ? { ...old, loading: false, error: error.message } : old);
      });
    return () => controller.abort();
  }, [selectedDeviceId, selectedSensorId, historyRange, refreshKey]);

  const sendCommand = useCallback(async (target, action, rgb) => {
    const deviceId = selectedRef.current.deviceId;
    const device = devicesRef.current[deviceId];
    const key = `${deviceId}:${target}`;
    if (pendingRef.current[key]) return false;
    if (!readyRef.current || !device?.online || !device.actuators?.includes(target)) {
      setCommandFeedback((old) => ({ ...old, [key]: { phase: 'error', message: 'Thiết bị chưa sẵn sàng hoặc không hỗ trợ thao tác.' } }));
      return false;
    }
    const command = { deviceId, target, action, rgb, reportVersion: device.reportVersion || 0 };
    pendingRef.current[key] = command;
    setCommandFeedback((old) => ({ ...old, [key]: { phase: 'sending', message: 'Đang gửi lệnh…' } }));
    timersRef.current[key] = setTimeout(() => {
      if (pendingRef.current[key] !== command) return;
      delete pendingRef.current[key];
      setCommandFeedback((old) => ({ ...old, [key]: { phase: 'error', message: 'Chưa nhận trạng thái khớp sau 12 giây. Kiểm tra thiết bị trước khi gửi lại.' } }));
    }, 12000);
    try {
      const body = target === 'LED'
        ? { deviceId, action, ...(rgb ? { r: rgb[0], g: rgb[1], b: rgb[2] } : {}) }
        : { deviceId, state: action };
      const response = await fetch(`${API}/devices/${target === 'LED' ? 'light' : 'buzzer'}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000),
      });
      const result = await response.json();
      if (!response.ok || result.success !== true) throw new Error(result.error || result.message || 'Máy chủ chưa chấp nhận lệnh.');
      if (pendingRef.current[key] === command) setCommandFeedback((old) => ({ ...old, [key]: { phase: 'waiting', message: 'Đã gửi lệnh. Đang chờ thiết bị báo trạng thái…' } }));
      return true;
    } catch (error) {
      if (pendingRef.current[key] === command) {
        clearTimeout(timersRef.current[key]);
        delete pendingRef.current[key];
        setCommandFeedback((old) => ({ ...old, [key]: { phase: 'error', message: error.message } }));
      }
      return false;
    }
  }, []);
  const sendLightCommand = useCallback((action, r = 0, g = 255, b = 0) => sendCommand('LED', action, action === 'ON' ? [r, g, b] : undefined), [sendCommand]);
  const sendBuzzerCommand = useCallback((action) => sendCommand('BUZZER', action), [sendCommand]);
  const acknowledgeAlert = useCallback(async (alertId) => {
    const response = await fetch(`${API}/alerts/${encodeURIComponent(alertId)}/ack`, { method: 'POST', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('Không đánh dấu được cảnh báo. Vui lòng thử lại.');
    setAlertHistory((old) => updateAlerts(old, { type: 'ALERT_ACK', alertId }));
  }, []);
  const historyKey = `${selectedDeviceId}/${selectedSensorId}/${historyRange}`;
  return { isConnected, hasSnapshot, deviceStates, deviceState: deviceStates[selectedDeviceId] || {}, selectedDeviceId, selectedSensorId,
    selectDevice, selectSensor, alertHistory, telemetryHistory: history.key === historyKey ? history.rows : [],
    historyLoading: history.key === historyKey && history.loading, historyError: history.key === historyKey ? history.error : '',
    historyRange, changeHistoryRange, refreshHistory, latency, commandFeedback, sendLightCommand, sendBuzzerCommand, acknowledgeAlert };
}
