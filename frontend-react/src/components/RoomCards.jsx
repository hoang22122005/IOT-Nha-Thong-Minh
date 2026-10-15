import React from 'react';
import { ArrowRight, DoorOpen, Thermometer, Droplets } from 'lucide-react';
import { Badge, DataAge, EmptyState } from './ui';
import { roomName, deviceName, number } from '../lib/iot';

export default function RoomCards({ devices, selectedDeviceId, onSelect, connected, alerts = [], compact = false, filtered = false }) {
  if (!devices.length) return <EmptyState title={filtered ? 'Không có thiết bị phù hợp' : 'Chưa nhận được thiết bị'}>{filtered ? 'Thử tên, ID hoặc bộ lọc trạng thái khác.' : 'Kết nối ESP32 để bắt đầu theo dõi nhà.'}</EmptyState>;
  return <div className={compact ? 'node-list' : 'room-grid'}>{devices.map((device) => {
    const active = alerts.some((alert) => alert.deviceId === device.deviceId && alert.active !== false)
      || ['CRITICAL', 'WARNING'].includes(device.fireDanger);
    const hasData = Object.keys(device.sensors || {}).length > 0;
    return <article key={device.deviceId} className={`room-card ${compact && selectedDeviceId === device.deviceId ? 'selected' : ''} ${active ? 'has-alert' : ''}`}>
      <div className="room-card-heading"><DoorOpen size={21} /><Badge tone={active ? 'danger' : connected && device.online ? 'success' : 'neutral'}>
        {active ? 'Có cảnh báo' : !connected ? 'Chưa cập nhật' : device.online ? 'Online' : 'Offline'}</Badge></div>
      <h3>{roomName(device)}</h3><p className="device-id">{deviceName(device)}</p>
      {hasData ? <div className="room-readings"><span><Thermometer size={15} /> <strong className="temperature">{number(device.temperature)} °C</strong></span>
        <span><Droplets size={15} /> <strong className="humidity">{number(device.humidity)} %</strong></span></div>
        : <p className="subtle-block">Chưa có dữ liệu cảm biến</p>}
      <DataAge timestamp={Math.max(0, ...Object.values(device.sensors || {}).map((sensor) => Number(sensor.lastSeenAt) || 0))} online={device.online} connected={connected} />
      <button className="btn btn-secondary room-action" aria-pressed={selectedDeviceId === device.deviceId} onClick={() => onSelect(device.deviceId)}>
        {compact && selectedDeviceId === device.deviceId ? 'Đang chọn' : 'Xem thiết bị'}<ArrowRight size={15} /></button>
    </article>;
  })}</div>;
}
