import React from 'react';
import { Thermometer, Droplets, Shield, Flame, AlertCircle } from 'lucide-react';

export default function MetricsGrid({ deviceState }) {
  const hasTemperature = typeof deviceState.temperature === 'number';
  const hasHumidity = typeof deviceState.humidity === 'number';
  const temp = hasTemperature ? deviceState.temperature.toFixed(1) : '--';
  const hum = hasHumidity ? deviceState.humidity.toFixed(1) : '--';
  const fireDanger = deviceState.fireDanger || 'NORMAL';
  const alarmThresholdC = deviceState.alarmThresholdC ?? 33;
  const sensors = Object.entries(deviceState.sensors || {});
  const temperatureSensorId = sensors.find(([, sensor]) => sensor?.measurements?.temperature != null)?.[0] || deviceState.sensorId;
  const humiditySensorId = sensors.find(([, sensor]) => sensor?.measurements?.humidity != null)?.[0] || deviceState.sensorId;

  // Status computation
  let tempStatus = hasTemperature
    ? { label: 'Bình thường', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' }
    : { label: 'Chưa có dữ liệu', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)' };
  if (hasTemperature && deviceState.temperature >= 40) {
    tempStatus = { label: 'Rất nóng', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
  } else if (hasTemperature && deviceState.temperature > alarmThresholdC) {
    tempStatus = { label: 'Nóng / Cảnh báo', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
  }

  let humStatus = hasHumidity
    ? { label: 'Dễ chịu', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)' }
    : { label: 'Chưa có dữ liệu', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)' };
  if (hasHumidity && deviceState.humidity > 80) {
    humStatus = { label: 'Rất ẩm', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' };
  } else if (hasHumidity && deviceState.humidity < 40) {
    humStatus = { label: 'Khô ráo', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)' };
  }

  let safetyStatus = deviceState.online && hasTemperature
    ? {
      label: 'BÌNH THƯỜNG',
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.15)',
      icon: <Shield size={28} color="#10b981" />,
      desc: 'Chưa vượt ngưỡng nhiệt độ demo; báo động cục bộ hiện dựa vào nhiệt độ',
    }
    : {
      label: deviceState.online ? 'CHỜ DỮ LIỆU' : 'NODE OFFLINE',
      color: '#94a3b8',
      bg: 'rgba(148, 163, 184, 0.12)',
      icon: <AlertCircle size={28} color="#94a3b8" />,
      desc: 'Chưa thể đánh giá nhiệt độ tại node',
    };
  if (fireDanger === 'CRITICAL') {
    safetyStatus = {
      label: 'NHIỆT ĐỘ CAO',
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.2)',
      icon: <Flame size={28} color="#ef4444" />,
      desc: 'Đã vượt ngưỡng nhiệt độ demo; còi và đèn tại node được bật',
    };
  } else if (fireDanger === 'WARNING') {
    safetyStatus = {
      label: 'NHIỆT ĐỘ TĂNG',
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.2)',
      icon: <AlertCircle size={28} color="#f59e0b" />,
      desc: 'Nhiệt độ đã vượt ngưỡng cảnh báo demo',
    };
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '20px',
    }}>
      {/* Temperature Card */}
      <div className="glass-panel" style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249, 115, 22, 0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
            Nhiệt độ phòng
          </span>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(249, 115, 22, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Thermometer size={22} color="#f97316" />
          </div>
        </div>

        <div style={{ margin: '16px 0 8px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{
              fontSize: '3.25rem',
              fontWeight: '800',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1,
              background: 'linear-gradient(135deg, #ffedd5 0%, #f97316 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {temp}
            </span>
            <span style={{ fontSize: '1.5rem', color: '#fdba74', fontWeight: '600' }}>°C</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border-glass)' }}>
          <span style={{
            fontSize: '0.8125rem',
            padding: '3px 10px',
            borderRadius: '6px',
            background: tempStatus.bg,
            color: tempStatus.color,
            fontWeight: '600',
          }}>
            {tempStatus.label}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{temperatureSensorId || 'Cảm biến chưa xác định'}</span>
        </div>
      </div>

      {/* Humidity Card */}
      <div className="glass-panel" style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
            Độ ẩm không khí
          </span>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(6, 182, 212, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Droplets size={22} color="#06b6d4" />
          </div>
        </div>

        <div style={{ margin: '16px 0 8px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{
              fontSize: '3.25rem',
              fontWeight: '800',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1,
              background: 'linear-gradient(135deg, #cffafe 0%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {hum}
            </span>
            <span style={{ fontSize: '1.5rem', color: '#67e8f9', fontWeight: '600' }}>%</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border-glass)' }}>
          <span style={{
            fontSize: '0.8125rem',
            padding: '3px 10px',
            borderRadius: '6px',
            background: humStatus.bg,
            color: humStatus.color,
            fontWeight: '600',
          }}>
            {humStatus.label}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{humiditySensorId || 'Cảm biến chưa xác định'}</span>
        </div>
      </div>

      {/* Temperature threshold alert; no smoke sensor is installed yet. */}
      <div className="glass-panel" style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
            Trạng thái nhiệt độ (demo)
          </span>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: safetyStatus.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {safetyStatus.icon}
          </div>
        </div>

        <div style={{ margin: '14px 0 6px' }}>
          <span style={{
            fontSize: '1.75rem',
            fontWeight: '800',
            letterSpacing: '0.03em',
            color: safetyStatus.color,
            textShadow: `0 0 20px ${safetyStatus.color}44`,
          }}>
            {safetyStatus.label}
          </span>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {safetyStatus.desc}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border-glass)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Báo động cục bộ: &gt;{alarmThresholdC}°C (ngưỡng demo)</span>
          <span style={{
            fontSize: '0.75rem',
            color: safetyStatus.color,
            fontWeight: '600',
          }}>
            Mục 3.1 & 3.2 Plan
          </span>
        </div>
      </div>
      {Object.entries(deviceState.sensors || {}).flatMap(([sensorId, sensor]) =>
        Object.entries(sensor?.measurements || {})
          .filter(([name, value]) => !['temperature', 'humidity'].includes(name) && typeof value === 'number')
          .map(([name, value]) => (
          <div key={`${sensorId}:${name}`} className="glass-panel" style={{ padding: 24 }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{name.replaceAll('_', ' ')}</div>
            <div style={{ marginTop: 16, fontSize: '2rem', fontWeight: 700 }}>
              {value.toLocaleString('vi-VN')} {sensor.units?.[name] || ''}
            </div>
            <div style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              {sensorId}
            </div>
          </div>
        )))}
    </div>
  );
}
