import React, { useState } from 'react';
import { Check, Lightbulb, ToggleRight, Volume2 } from 'lucide-react';
import { SectionHeading, EmptyState } from './ui';
import { isOn } from '../lib/iot';

const COLORS = [
  { name: 'Trắng', hex: '#ffffff', rgb: [255, 255, 255] },
  { name: 'Đỏ', hex: '#ff0000', rgb: [255, 0, 0] },
  { name: 'Xanh lá', hex: '#00ff00', rgb: [0, 255, 0] },
  { name: 'Xanh dương', hex: '#0000ff', rgb: [0, 0, 255] },
];
function CustomColor({ initialColor, disabled, onApply }) {
  const [draft, setDraft] = useState(initialColor || '#00ff00');
  return <div className="action-group"><label className="custom-color">Tùy chọn<input type="color" aria-label="Soạn màu LED tùy chỉnh" value={draft} disabled={disabled} onChange={(event) => setDraft(event.target.value)} /></label>
    <button className="color-option" disabled={disabled} onClick={() => onApply('ON', ...[1, 3, 5].map((start) => parseInt(draft.slice(start, start + 2), 16)))}>Áp dụng màu</button></div>;
}
export default function ControlPanel({ deviceState: device, isConnected, commandFeedback, sendLightCommand, sendBuzzerCommand, compact = false }) {
  const supported = (device.actuators || []).filter((target) => ['LED', 'BUZZER'].includes(target));
  const ready = isConnected && device.online;
  const rgb = /^#[0-9a-f]{6}$/i.test(device.ledColor || '')
    ? [1, 3, 5].map((start) => parseInt(device.ledColor.slice(start, start + 2), 16)) : [0, 255, 0];
  return <section className="panel"><SectionHeading title={compact ? 'Điều khiển nhanh' : 'Điều khiển thiết bị'} icon={ToggleRight} />
    {device.deviceId && <p className="control-node device-id">Lệnh áp dụng cho: {device.deviceId}</p>}
    {!ready && <p className="inline-notice">{!isConnected ? 'Chờ kết nối máy chủ để điều khiển.' : 'Thiết bị offline. Điều khiển sẽ khả dụng khi node kết nối lại.'}</p>}
    {!supported.length && <EmptyState title="Chưa có thiết bị có thể điều khiển">Chờ node công bố khả năng điều khiển.</EmptyState>}
    <div className={compact ? 'actuator-stack' : 'actuator-grid'}>{supported.map((target) => {
      const led = target === 'LED';
      const on = isOn(led ? device.ledState : device.buzzerState);
      const Icon = led ? Lightbulb : Volume2;
      const feedback = commandFeedback[`${device.deviceId}:${target}`];
      const busy = ['sending', 'waiting'].includes(feedback?.phase);
      return <div className="actuator-tile" key={target}><div className="actuator-heading"><span className="device-icon"><Icon size={21} /></span>
        <div className="grow"><h3>{led ? 'Đèn LED RGB' : 'Còi báo động'}</h3><p className={on ? 'text-success' : 'muted'}>{on ? 'Đang bật' : 'Đang tắt'}</p></div>
        <button className="switch" role="switch" aria-checked={on} aria-label={led ? 'Bật/tắt đèn LED' : 'Bật/tắt còi báo'} disabled={!ready || busy}
          onClick={() => led ? sendLightCommand(on ? 'OFF' : 'ON', ...rgb) : sendBuzzerCommand(on ? 'OFF' : 'ON')}><span /></button></div>
        {led && <div className="color-section"><p className="muted">Chọn màu phát sáng</p><div className="color-options" aria-label="Màu đèn LED">
          {COLORS.map((color) => {
            const selected = on && device.ledColor?.toLowerCase() === color.hex;
            return <button key={color.hex} className={`color-option ${selected ? 'selected' : ''}`} disabled={!ready || busy} aria-pressed={selected}
              onClick={() => sendLightCommand('ON', ...color.rgb)}>{selected ? <Check size={13} /> : <span className="color-dot" style={{ background: color.hex }} />}{color.name}</button>;
          })}
          <CustomColor key={device.deviceId} initialColor={device.ledColor} disabled={!ready || busy} onApply={sendLightCommand} />
        </div></div>}
        {feedback && <p className={`command-feedback ${feedback.phase === 'error' ? 'text-danger' : ''}`} role={feedback.phase === 'error' ? 'alert' : 'status'}>{feedback.message}</p>}
      </div>;
    })}</div>
    {(device.actuators || []).some((target) => !['LED', 'BUZZER'].includes(target)) && <p className="muted sample-footer">Một số khả năng của node chưa có giao thức điều khiển được hỗ trợ trong phiên bản này.</p>}
  </section>;
}
