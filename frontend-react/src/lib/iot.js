export const HISTORY_RANGES = { '1h': 3_600_000, '6h': 21_600_000, '24h': 86_400_000, '7d': 604_800_000 };
export const TIME_ZONE = 'Asia/Ho_Chi_Minh';
export const isOn = (value) => value === true || value === 'ON';
export const number = (value, digits = 1) => typeof value === 'number' && Number.isFinite(value)
  ? value.toLocaleString('vi-VN', { maximumFractionDigits: digits }) : '—';
export const dateTime = (value) => Number(value) > 0
  ? new Date(Number(value)).toLocaleString('vi-VN', { timeZone: TIME_ZONE }) : 'Chưa có dữ liệu';
export const roomName = (device) => device?.roomName || (device?.roomId ? `Phòng ${device.roomId}` : 'Chưa gán phòng');
export const deviceName = (device) => device?.displayName || device?.deviceId || 'Chưa chọn thiết bị';
export const metricName = (metric) => ({ temperature: 'Nhiệt độ', humidity: 'Độ ẩm' })[metric] || metric.replaceAll('_', ' ');
export const metricUnit = (metric, units = {}) => units[metric] || ({ temperature: '°C', humidity: '%' })[metric] || '';

// A heartbeat is not a new sensor sample. Preserve each sensor's timestamp.
export function normalizeDevice(raw, previous = {}) {
  const sensors = { ...(previous.sensors || {}) };
  for (const [id, sensor] of Object.entries(raw.sensors || {})) {
    sensors[id] = { ...sensors[id], ...sensor,
      measurements: { ...sensors[id]?.measurements, ...sensor.measurements },
      units: { ...sensors[id]?.units, ...sensor.units } };
  }
  const measurements = { ...raw.measurements };
  for (const name of ['temperature', 'humidity']) if (typeof raw[name] === 'number') measurements[name] = raw[name];
  if (raw.sensorId && Object.keys(measurements).length && (raw.type === 'TELEMETRY' || !raw.sensors?.[raw.sensorId])) {
    const sensor = sensors[raw.sensorId] || {};
    sensors[raw.sensorId] = { ...sensor, sensorId: raw.sensorId,
      measurements: { ...sensor.measurements, ...measurements },
      units: { ...sensor.units, ...raw.units },
      lastSeenAt: raw.timestamp || sensor.lastSeenAt || raw.lastSeenAt || 0 };
  }
  const next = { ...previous, ...raw, sensors,
    measurements: { ...previous.measurements, ...measurements }, units: { ...previous.units, ...raw.units } };
  for (const name of ['temperature', 'humidity']) next[name] = measurements[name] ?? raw[name] ?? previous[name] ?? null;
  for (const key of ['ledState', 'buzzerState']) if (typeof next[key] === 'boolean') next[key] = next[key] ? 'ON' : 'OFF';
  if (raw.timestamp && raw.type === 'TELEMETRY') next.lastSeenAt = raw.timestamp;
  next.fireDanger = raw.alertState ?? raw.fireDanger ?? previous.fireDanger ?? 'NORMAL';
  next.reportVersion = (previous.reportVersion || 0) + (raw.type === 'TELEMETRY' ? 1 : 0);
  return next;
}
export const sensorFor = (device, sensorId) => device?.sensors?.[sensorId] || { sensorId, measurements: {}, units: {}, lastSeenAt: 0 };

export function mergeHistory(rows, from) {
  const points = new Map();
  for (const row of rows) {
    const timestamp = Number(row.timestamp);
    const measurements = { ...row.measurements };
    for (const name of ['temperature', 'humidity']) if (typeof row[name] === 'number') measurements[name] = row[name];
    if (!Number.isFinite(timestamp) || timestamp < from || !Object.values(measurements).some(Number.isFinite)) continue;
    points.set(timestamp, { ...row, timestamp, measurements });
  }
  return [...points.values()].sort((a, b) => a.timestamp - b.timestamp).slice(-1000);
}
export function updateAlerts(alerts, event) {
  if (event.type === 'ALERT') return [event, ...alerts.filter((row) => row.alertId !== event.alertId)].slice(0, 50);
  if (event.type === 'ALERT_ACK') return alerts.map((row) => row.alertId === event.alertId ? { ...row, acknowledged: true } : row);
  if (event.type === 'ALERT_CLEARED') return alerts.map((row) => row.deviceId === event.deviceId ? { ...row, active: false } : row);
  return alerts;
}
export function commandMatches(device, command) {
  if (!device || device.reportVersion <= command.reportVersion) return false;
  if (isOn(command.target === 'LED' ? device.ledState : device.buzzerState) !== (command.action === 'ON')) return false;
  if (command.target === 'LED' && command.action === 'ON' && command.rgb) {
    const hex = `#${command.rgb.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
    return device.ledColor?.toLowerCase() === hex;
  }
  return true;
}
export function csvText(headers, rows) {
  const escape = (value) => `"${String(value ?? '').replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""')}"`;
  return '\uFEFF' + [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
}
export function downloadCsv(filename, headers, rows) {
  const url = URL.createObjectURL(new Blob([csvText(headers, rows)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
