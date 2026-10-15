import React, { useEffect, useState } from 'react';
import { CircleHelp, Radio, WifiOff } from 'lucide-react';
import { dateTime } from '../lib/iot';

export function Badge({ children, tone = 'neutral' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function EmptyState({ title, children, icon: Icon = Radio }) {
  return <div className="empty-state"><Icon size={28} strokeWidth={1.5} /><strong>{title}</strong>{children && <p>{children}</p>}</div>;
}
export function SectionHeading({ title, children, icon: Icon }) {
  return <div className="section-heading"><h2>{Icon && <Icon size={20} />}{title}</h2>{children}</div>;
}
export function DataAge({ timestamp, online, connected = true }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(timer); }, []);
  if (!Number(timestamp)) return <span className="data-age">Chưa nhận mẫu cảm biến</span>;
  const seconds = Math.max(0, Math.floor((now - Number(timestamp)) / 1000));
  const relative = seconds < 60 ? `${seconds} giây trước` : seconds < 3600 ? `${Math.floor(seconds / 60)} phút trước` : `${Math.floor(seconds / 3600)} giờ trước`;
  return <span className="data-age" title={dateTime(timestamp)}>
    {(!online || !connected || seconds > 20) && <WifiOff size={14} />}
    {!connected ? 'Chưa thể cập nhật' : !online ? 'Thiết bị offline' : seconds > 20 ? 'Mẫu đã cũ' : 'Mẫu cảm biến'} · {relative}
  </span>;
}
export function ConfirmDelete({ name, onConfirm, onCancel, busy }) {
  return <div className="delete-confirm" role="alert"><CircleHelp size={18} /><span>Xóa “{name}”?</span>
    <button className="btn btn-danger" disabled={busy} onClick={onConfirm}>Xóa</button>
    <button className="btn btn-secondary" disabled={busy} onClick={onCancel}>Hủy</button></div>;
}
