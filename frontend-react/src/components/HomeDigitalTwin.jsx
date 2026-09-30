import React from 'react';
import { Droplets, Home, Lightbulb, ShieldAlert, Thermometer, Volume2, VolumeX } from 'lucide-react';

function isOn(value) {
  return value === true || value === 'ON';
}

function roomLabel(roomId) {
  return (roomId || 'room-01').replaceAll('-', ' ');
}

export default function HomeDigitalTwin({ deviceStates, selectedDeviceId, onSelect }) {
  const rooms = Object.values(deviceStates || {}).reduce((groups, device) => {
    const key = `${device.homeId || 'home-01'}/${device.roomId || 'room-01'}`;
    if (!groups[key]) groups[key] = { homeId: device.homeId || 'home-01', roomId: device.roomId || 'room-01', devices: [] };
    groups[key].devices.push(device);
    return groups;
  }, {});

  return (
    <section className="glass-panel" style={{ padding: 24 }} aria-labelledby="digital-twin-title">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Home size={20} color="#38bdf8" />
        <div>
          <h2 id="digital-twin-title" style={{ fontSize: '1rem', margin: 0 }}>Mô hình nhà theo thời gian thực</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0' }}>
            Mỗi ô là một phòng; chọn node để xem chi tiết và gửi lệnh.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(245px, 1fr))', gap: 12 }}>
        {Object.values(rooms).map((room) => (
          <article
            key={`${room.homeId}/${room.roomId}`}
            aria-label={`Nhà ${room.homeId}, ${roomLabel(room.roomId)}`}
            style={{
              minWidth: 0,
              padding: 14,
              borderRadius: 14,
              border: '1px solid rgba(56,189,248,0.25)',
              background: 'linear-gradient(145deg, rgba(56,189,248,0.07), rgba(15,23,42,0.35))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <strong style={{ textTransform: 'capitalize' }}>{roomLabel(room.roomId)}</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 3 }}>{room.homeId}</div>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{room.devices.length} node</span>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              {room.devices.map((device) => {
                const selected = device.deviceId === selectedDeviceId;
                const ledOn = isOn(device.ledState);
                const buzzerOn = isOn(device.buzzerState);
                const alarmActive = device.fireDanger === 'CRITICAL' || device.alertState === 'CRITICAL';
                return (
                  <button
                    key={device.deviceId}
                    type="button"
                    onClick={() => onSelect(device.deviceId)}
                    aria-pressed={selected}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: 11,
                      borderRadius: 10,
                      border: selected ? '1px solid #38bdf8' : '1px solid rgba(148,163,184,0.16)',
                      background: selected ? 'rgba(56,189,248,0.11)' : 'rgba(15,23,42,0.38)',
                      color: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <strong style={{ fontSize: '0.82rem' }}>{device.deviceId}</strong>
                      <span style={{ color: device.online ? '#4ade80' : '#fbbf24', fontSize: '0.7rem' }}>
                        {device.online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px', marginTop: 10, fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                      <span><Thermometer size={13} style={{ verticalAlign: 'middle' }} /> {device.temperature ?? '—'}°C</span>
                      <span><Droplets size={13} style={{ verticalAlign: 'middle' }} /> {device.humidity ?? '—'}%</span>
                      {Object.entries(device.sensors || {}).flatMap(([sensorId, sensor]) =>
                        Object.entries(sensor?.measurements || {})
                          .filter(([name, value]) => !['temperature', 'humidity'].includes(name) && typeof value === 'number')
                          .map(([name, value]) => (
                            <span key={`${sensorId}:${name}`}>{sensorId} · {name.replaceAll('_', ' ')}: {value} {sensor.units?.[name] || ''}</span>
                          )))}
                      <span>
                        <Lightbulb size={13} color={ledOn ? (device.ledColor || '#4ade80') : '#64748b'} style={{ verticalAlign: 'middle' }} />
                        {' '}LED {ledOn ? 'bật' : 'tắt'}
                      </span>
                      <span>
                        {buzzerOn ? <Volume2 size={13} color="#fb7185" style={{ verticalAlign: 'middle' }} /> : <VolumeX size={13} style={{ verticalAlign: 'middle' }} />}
                        {' '}Còi {buzzerOn ? 'bật' : 'tắt'}
                      </span>
                    </div>
                    {alarmActive && (
                      <div style={{ marginTop: 9, color: '#fca5a5', fontSize: '0.74rem' }}>
                        <ShieldAlert size={13} style={{ verticalAlign: 'middle' }} /> Cảnh báo đang hoạt động
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
