import React, { useState } from 'react';
import { Lightbulb, Fan, Volume2, VolumeX, Flame, Zap, Check } from 'lucide-react';

const PRESET_COLORS = [
  { name: 'Xanh lá (Chuẩn)', r: 0, g: 255, b: 0, hex: '#00ff00' },
  { name: 'Vàng ấm', r: 255, g: 190, b: 0, hex: '#ffbe00' },
  { name: 'Đỏ cảnh báo', r: 255, g: 0, b: 0, hex: '#ff0000' },
  { name: 'Xanh dương', r: 0, g: 150, b: 255, hex: '#0096ff' },
  { name: 'Tím Neon', r: 180, g: 0, b: 255, hex: '#b400ff' },
  { name: 'Trắng sáng', r: 255, g: 255, b: 255, hex: '#ffffff' },
];

export default function ControlPanel({
  deviceState,
  sendLightCommand,
  sendAcCommand,
  sendBuzzerCommand,
}) {
  const isLightOn = deviceState.ledState === 'ON';
  const isAcOn = deviceState.acState === 'ON';
  const isAcAuto = deviceState.acState === 'AUTO';
  const isBuzzerOn = deviceState.buzzerState === 'ON';
  const legacyControls = deviceState.deviceId === 'esp32-room-01' && !deviceState.actuators?.length;
  const showLed = legacyControls || deviceState.actuators?.includes('LED');
  const showBuzzer = legacyControls || deviceState.actuators?.includes('BUZZER');

  const [customHex, setCustomHex] = useState('#00ff00');

  const currentColorRgb = `rgb(${deviceState.ledR || 0}, ${deviceState.ledG || 255}, ${deviceState.ledB || 0})`;

  const handleHexChange = (e) => {
    const hex = e.target.value;
    setCustomHex(hex);
    // Convert hex to rgb
    const r = parseInt(hex.slice(1, 3), 16) || 0;
    const g = parseInt(hex.slice(3, 5), 16) || 0;
    const b = parseInt(hex.slice(5, 7), 16) || 0;
    sendLightCommand('ON', r, g, b);
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
      gap: '20px',
    }}>
      {/* 1. LED RGB Control Card */}
      {showLed && <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: isLightOn ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isLightOn ? `0 0 20px ${currentColorRgb}66` : 'none',
              transition: 'all 0.3s ease',
            }}>
              <Lightbulb size={24} color={isLightOn ? currentColorRgb : '#94a3b8'} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                Đèn LED RGB (GPIO 48)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Trạng thái: {isLightOn ? 'ĐANG BẬT' : 'ĐANG TẮT'}
              </p>
            </div>
          </div>

          <button
            className={`btn ${isLightOn ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              if (isLightOn) {
                sendLightCommand('OFF', deviceState.ledR, deviceState.ledG, deviceState.ledB);
              } else {
                sendLightCommand('ON', deviceState.ledR || 0, deviceState.ledG || 255, deviceState.ledB || 0);
              }
            }}
          >
            <Zap size={16} />
            {isLightOn ? 'Tắt đèn' : 'Bật đèn'}
          </button>
        </div>

        {/* Color Presets */}
        <div style={{ marginTop: '16px' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
            Chọn màu hiển thị:
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {PRESET_COLORS.map((c) => {
              const isSelected =
                isLightOn &&
                deviceState.ledR === c.r &&
                deviceState.ledG === c.g &&
                deviceState.ledB === c.b;

              return (
                <button
                  key={c.name}
                  onClick={() => sendLightCommand('ON', c.r, c.g, c.b)}
                  title={c.name}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: c.hex,
                    border: isSelected ? '2px solid #ffffff' : '2px solid transparent',
                    boxShadow: isSelected ? `0 0 15px ${c.hex}` : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isSelected && <Check size={16} color={c.r + c.g + c.b > 400 ? '#000' : '#fff'} />}
                </button>
              );
            })}

            {/* Custom color input */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="color"
                value={customHex}
                onChange={handleHexChange}
                title="Chọn màu tuỳ chỉnh"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-glass)',
                  cursor: 'pointer',
                  backgroundColor: 'transparent',
                }}
              />
            </div>
          </div>
        </div>
      </div>}

      {/* 2. Air Conditioner / Fan Card */}
      {deviceState.actuators?.includes('AC') && <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: (isAcOn || isAcAuto) ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: (isAcOn || isAcAuto) ? '0 0 20px rgba(6, 182, 212, 0.4)' : 'none',
            }}>
              <Fan
                size={24}
                color={(isAcOn || isAcAuto) ? '#06b6d4' : '#94a3b8'}
                className={isAcOn || (isAcAuto && deviceState.temperature > 33) ? 'fan-spinning' : ''}
              />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                Điều Hoà / Quạt Làm Mát
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Chế độ: <strong style={{ color: '#38bdf8' }}>{deviceState.acState || 'OFF'}</strong>
                {isAcAuto && ' (Tự bật khi > 33°C)'}
              </p>
            </div>
          </div>
        </div>

        {/* Mode Selector Buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '8px',
          marginTop: '16px',
        }}>
          <button
            className={`btn ${isAcAuto ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => sendAcCommand('AUTO')}
            style={{ fontSize: '0.85rem', padding: '10px 4px' }}
          >
            TỰ ĐỘNG
          </button>
          <button
            className={`btn ${isAcOn ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => sendAcCommand('ON')}
            style={{ fontSize: '0.85rem', padding: '10px 4px' }}
          >
            BẬT (ON)
          </button>
          <button
            className={`btn ${!isAcOn && !isAcAuto ? 'btn-secondary' : 'btn-secondary'}`}
            onClick={() => sendAcCommand('OFF')}
            style={{
              fontSize: '0.85rem',
              padding: '10px 4px',
              borderColor: (!isAcOn && !isAcAuto) ? '#ef4444' : 'var(--border-glass)',
              color: (!isAcOn && !isAcAuto) ? '#f87171' : 'var(--text-primary)',
            }}
          >
            TẮT (OFF)
          </button>
        </div>
      </div>}

      {/* 3. Buzzer / Safety Action Card */}
      {showBuzzer && <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: isBuzzerOn ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isBuzzerOn ? '0 0 20px rgba(239, 68, 68, 0.5)' : 'none',
            }}>
              {isBuzzerOn ? <Volume2 size={24} color="#ef4444" /> : <VolumeX size={24} color="#94a3b8" />}
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                Còi Báo Động (Buzzer)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Trạng thái: {isBuzzerOn ? 'ĐANG HÚ CÒI' : 'TẮT'}
              </p>
            </div>
          </div>

          <button
            className={`btn ${isBuzzerOn ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => sendBuzzerCommand(isBuzzerOn ? 'OFF' : 'ON')}
          >
            {isBuzzerOn ? <VolumeX size={16} /> : <Volume2 size={16} />}
            {isBuzzerOn ? 'Tắt còi' : 'Bật còi'}
          </button>
        </div>

        {/* Quick Test Action */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginTop: '16px',
        }}>
          <button
            className="btn btn-secondary"
            style={{ flex: 1, fontSize: '0.85rem', padding: '10px 8px' }}
            onClick={() => {
              sendBuzzerCommand('ON');
              setTimeout(() => sendBuzzerCommand('OFF'), 2000);
            }}
          >
            Thử còi 2 giây
          </button>
          {showLed && <button
            className="btn btn-secondary"
            style={{ flex: 1, fontSize: '0.85rem', padding: '10px 8px', borderColor: 'rgba(239, 68, 68, 0.4)' }}
            onClick={() => {
              sendLightCommand('ON', 255, 0, 0);
              sendBuzzerCommand('ON');
              setTimeout(() => {
                sendLightCommand('OFF');
                sendBuzzerCommand('OFF');
              }, 2000);
            }}
          >
            <Flame size={15} color="#ef4444" />
            Thử LED + còi 2 giây
          </button>}
        </div>
      </div>}
    </div>
  );
}
