import React from 'react';
import { AlertTriangle, BellRing, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function FireAlertBanner({ activeAlert, fireDanger, alarmThresholdC = 33, onAcknowledge }) {
  const isTriggered = activeAlert || fireDanger === 'WARNING' || fireDanger === 'CRITICAL';

  if (!isTriggered) return null;

  const isCritical = fireDanger === 'CRITICAL' || activeAlert?.dangerLevel === 'CRITICAL';

  return (
    <div
      className="glass-panel fire-alert-box"
      style={{
        padding: '18px 24px',
        background: isCritical
          ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.22), rgba(153, 27, 27, 0.35))'
          : 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(180, 83, 9, 0.3))',
        borderColor: isCritical ? '#ef4444' : '#f59e0b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: isCritical ? '#ef4444' : '#f59e0b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isCritical ? '0 0 20px rgba(239, 68, 68, 0.6)' : '0 0 15px rgba(245, 158, 11, 0.5)',
        }}>
          {isCritical ? <ShieldAlert size={26} color="#fff" /> : <AlertTriangle size={26} color="#fff" />}
        </div>
        <div>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '700',
            color: isCritical ? '#fca5a5' : '#fde68a',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <BellRing size={18} className="pulse-dot" />
            CẢNH BÁO NHIỆT ĐỘ: VƯỢT NGƯỠNG THỬ NGHIỆM
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#e2e8f0', marginTop: '2px' }}>
            {activeAlert?.message || `Nhiệt độ vượt ngưỡng demo ${alarmThresholdC}°C. Đây chưa phải kết luận có cháy.`}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '6px' }}>
            Xác nhận chỉ ghi nhận bạn đã thấy cảnh báo. Còi và đèn tại ESP32 sẽ tự tắt khi nhiệt độ trở xuống ngưỡng.
          </p>
        </div>
      </div>

      <div>
        <button
          className="btn btn-danger"
          onClick={() => {
            if (activeAlert?.alertId) {
              onAcknowledge(activeAlert.alertId);
            } else {
              onAcknowledge('temp-ack');
            }
          }}
          style={{
            background: isCritical ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #d97706, #b45309)',
            border: 'none',
          }}
        >
          <CheckCircle2 size={16} />
          Tôi đã nhận cảnh báo
        </button>
      </div>
    </div>
  );
}
