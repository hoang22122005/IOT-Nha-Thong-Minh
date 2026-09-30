import React from 'react';
import { Cpu, DoorOpen, DoorClosed, Thermometer, Droplets } from 'lucide-react';

export default function DeviceOverview({ deviceStates, selectedDeviceId, onSelect }) {
  const devices = Object.values(deviceStates || {}).sort((a, b) => (a.deviceId || '').localeCompare(b.deviceId || ''));

  return (
    <section className="glass-panel" style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Cpu size={20} color="#38bdf8" />
        <div>
          <h2 style={{ fontSize: '1rem', margin: 0 }}>Các node trong nhà</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0' }}>
            Chọn một node để xem trạng thái và gửi lệnh tới node đó.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {devices.map((device) => {
          const selected = device.deviceId === selectedDeviceId;
          const online = Boolean(device.online);
          return (
            <button
              key={device.deviceId}
              type="button"
              onClick={() => onSelect(device.deviceId)}
              aria-pressed={selected}
              style={{
                textAlign: 'left',
                padding: 14,
                borderRadius: 12,
                border: selected ? '1px solid #38bdf8' : '1px solid rgba(148,163,184,0.22)',
                background: selected ? 'rgba(56,189,248,0.10)' : 'rgba(15,23,42,0.35)',
                color: 'inherit',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <strong style={{ fontSize: '0.9rem' }}>{device.deviceId}</strong>
                <span style={{ color: online ? '#4ade80' : '#fbbf24', fontSize: '0.75rem' }}>
                  {online ? 'Đang kết nối' : 'Ngoại tuyến'}
                </span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 5 }}>
                {device.homeId || 'home-01'} / {device.roomId || 'room-01'}
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: '0.8rem' }}>
                <span><Thermometer size={13} style={{ verticalAlign: 'middle' }} /> {device.temperature ?? '—'}°C</span>
                <span><Droplets size={13} style={{ verticalAlign: 'middle' }} /> {device.humidity ?? '—'}%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {device.buzzerState === true || device.buzzerState === 'ON'
                  ? <DoorOpen size={14} color="#fb7185" />
                  : <DoorClosed size={14} />}
                <span>Còi {device.buzzerState === true || device.buzzerState === 'ON' ? 'bật' : 'tắt'}</span>
                {selected && <span style={{ marginLeft: 'auto', color: '#38bdf8' }}>Đang chọn</span>}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
