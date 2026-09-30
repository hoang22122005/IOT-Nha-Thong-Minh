import React from 'react';
import { Cpu, Wifi, WifiOff, Activity, ShieldCheck, Clock } from 'lucide-react';

export default function Header({ isConnected, deviceState, latency }) {
  return (
    <header className="glass-panel" style={{ padding: '20px 28px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        {/* Title & Hardware Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(14, 165, 233, 0.4)',
          }}>
            <Cpu size={28} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                letterSpacing: '-0.02em',
                background: 'linear-gradient(to right, #ffffff, #94a3b8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Smart IoT Control Center
              </h1>
              <span style={{
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.2)',
                color: '#a5b4fc',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                fontWeight: '600',
                fontFamily: 'var(--font-mono)',
              }}>
                ESP32-S3
              </span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              DHT11 Sensor &bull; Smart Actuator Relay &bull; Realtime Telemetry
            </p>
          </div>
        </div>

        {/* Status Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* WebSocket Server Status */}
          <div className={`badge ${isConnected ? 'badge-online' : 'badge-offline'}`}>
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>Server: {isConnected ? 'Online' : 'Disconnected'}</span>
          </div>

          {/* ESP32 Hardware Status */}
          <div className={`badge ${deviceState.online ? 'badge-online' : 'badge-warning'}`}>
            <span className={`status-dot ${deviceState.online ? 'online' : 'offline'}`} />
            <span>ESP32: {deviceState.online ? 'Connected' : 'Waiting...'}</span>
          </div>

          {/* Sync Time */}
          {deviceState.lastUpdate && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-muted)',
              fontSize: '0.8125rem',
              fontFamily: 'var(--font-mono)',
            }}>
              <Clock size={14} />
              <span>{deviceState.lastUpdate}</span>
            </div>
          )}
        </div>
      </div>
      {isConnected && !deviceState.online && (
        <div role="status" style={{
          marginTop: 14,
          padding: '10px 12px',
          borderRadius: 10,
          border: '1px solid rgba(245, 158, 11, 0.28)',
          background: 'rgba(245, 158, 11, 0.08)',
          color: 'var(--text-secondary)',
          fontSize: '0.8rem',
          lineHeight: 1.5,
        }}>
          Backend đang chạy nhưng ESP32 chưa gửi heartbeat. Kiểm tra nguồn/USB, điền Wi-Fi trong{' '}
          <code>PlatformIO/Projects/IOT/include/secrets.h</code>, rồi xem Serial Monitor ở 115200 baud.
          Cần thấy <code>Wi-Fi connected, IP: ...</code> rồi <code>MQTT connected</code>.
        </div>
      )}
    </header>
  );
}
