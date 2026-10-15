import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, Check, Download, ShieldCheck } from 'lucide-react';
import { Badge, EmptyState, SectionHeading } from './ui';
import { dateTime, downloadCsv, number, roomName } from '../lib/iot';

export function AlertActions({ alert, onAcknowledge, connected, onDevice }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <div><div className="action-group">{!alert.acknowledged && <button className="btn btn-primary" disabled={!connected || busy} onClick={async () => {
    setBusy(true); setError('');
    try { await onAcknowledge(alert.alertId); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }}><Check size={15} />{busy ? 'Đang lưu…' : 'Đã xem (ACK)'}</button>}
    {onDevice && <button className="btn btn-secondary" onClick={() => onDevice(alert.deviceId)}>Xem thiết bị <ArrowRight size={15} /></button>}</div>
    {error && <p className="text-danger" role="alert">{error}</p>}</div>;
}
export function ActiveAlertBanner({ alerts, devices, onAcknowledge, connected, onDevice, onAll }) {
  const active = alerts.filter((alert) => alert.active !== false);
  const missing = Object.values(devices).filter((device) => ['CRITICAL', 'WARNING'].includes(device.fireDanger)
    && !active.some((alert) => alert.deviceId === device.deviceId));
  if (!active.length && !missing.length) return null;
  return <div className="alert-banners">{active.slice(0, 2).map((alert) => <section className="alert-banner" key={alert.alertId} role="alert">
    <AlertTriangle size={24} /><div className="grow"><h2>{alert.message || 'Nhiệt độ vượt ngưỡng'} · {roomName(devices[alert.deviceId] || { roomId: alert.roomId })}</h2>
      <p>{alert.deviceId} · {number(alert.temperature)} °C · {alert.acknowledged ? 'Đã xem · Cảnh báo vẫn đang diễn ra' : 'Chưa xem'}</p></div>
    <AlertActions alert={alert} onAcknowledge={onAcknowledge} connected={connected} onDevice={onDevice} /></section>)}
    {missing.map((device) => <section className="alert-banner" key={device.deviceId}><AlertTriangle size={24} /><div className="grow"><h2>Cảnh báo nhiệt độ · {roomName(device)}</h2>
      <p>{device.deviceId} đang báo {device.fireDanger}. Chưa có bản ghi cảnh báo tương ứng trong tập đã tải.</p></div><button className="btn btn-secondary" onClick={() => onDevice(device.deviceId)}>Xem thiết bị</button></section>)}
    {active.length > 2 && <button className="text-button" onClick={onAll}>Xem tất cả {active.length} cảnh báo đang diễn ra <ArrowRight size={15} /></button>}
  </div>;
}
export default function AlertsPanel({ alerts, devices, onAcknowledge, connected, onDevice }) {
  const [filter, setFilter] = useState('all');
  const filtered = alerts.filter((alert) => filter === 'all' || (filter === 'active' ? alert.active !== false : filter === 'seen' ? alert.acknowledged : alert.active === false));
  const filters = [['all', 'Tất cả', alerts.length], ['active', 'Đang diễn ra', alerts.filter((a) => a.active !== false).length],
    ['seen', 'Đã xem', alerts.filter((a) => a.acknowledged).length], ['cleared', 'Đã kết thúc', alerts.filter((a) => a.active === false).length]];
  return <div className="page-stack"><div className="row-between wrap"><div className="segmented" aria-label="Lọc cảnh báo">{filters.map(([key, label, count]) =>
    <button key={key} aria-pressed={filter === key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{label} <span>{count}</span></button>)}</div>
    <button className="btn btn-secondary" disabled={!filtered.length} onClick={() => downloadCsv('canh-bao.csv', ['Thời gian', 'Node', 'Nội dung', 'Nhiệt độ', 'Đang diễn ra', 'Đã xem'],
      filtered.map((a) => [dateTime(a.timestamp), a.deviceId, a.message, a.temperature, a.active !== false, a.acknowledged]))}><Download size={16} /> Xuất CSV</button></div>
    <section className="panel flush"><div className="panel-padding"><SectionHeading title="Theo dõi và xử lý cảnh báo" icon={ShieldCheck} /><p className="muted">“Đã xem” chỉ ghi nhận bạn đã đọc cảnh báo. Trạng thái đang diễn ra độc lập với trạng thái đã xem.</p></div>
      {filtered.length ? <div className="table-scroll"><table><thead><tr><th>Thời gian</th><th>Vị trí & node</th><th>Nội dung</th><th>Diễn ra</th><th>Đã xem</th><th>Thao tác</th></tr></thead><tbody>{filtered.map((alert) =>
        <tr key={alert.alertId} className={alert.active !== false ? 'alert-row' : ''}><td>{dateTime(alert.timestamp)}</td><td><strong>{roomName(devices[alert.deviceId] || { roomId: alert.roomId })}</strong><p className="device-id">{alert.deviceId}</p></td>
          <td>{alert.message || 'Cảnh báo nhiệt độ'}<p>{number(alert.temperature)} °C</p></td><td><Badge tone={alert.active === false ? 'neutral' : 'danger'}>{alert.active === false ? 'Đã kết thúc' : 'Đang diễn ra'}</Badge></td>
          <td><Badge tone={alert.acknowledged ? 'success' : 'warning'}>{alert.acknowledged ? 'Đã xem' : 'Chưa xem'}</Badge></td><td><AlertActions alert={alert} onAcknowledge={onAcknowledge} connected={connected} onDevice={onDevice} /></td></tr>
      )}</tbody></table></div> : <EmptyState title="Không có cảnh báo trong dữ liệu đã tải" icon={ShieldCheck}>Bộ lọc hiện tại không có bản ghi phù hợp.</EmptyState>}
      <div className="table-footer">Hiển thị {filtered.length} / {alerts.length} bản ghi đã tải · Snapshot hiện giới hạn 50 cảnh báo gần nhất.</div>
    </section>
  </div>;
}
