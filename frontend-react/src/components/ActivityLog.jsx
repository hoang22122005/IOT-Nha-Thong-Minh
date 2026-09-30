import React from 'react';
import { History, ShieldAlert, CheckCircle, Info } from 'lucide-react';

export default function ActivityLog({ alertHistory, telemetryHistory }) {
  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <History size={20} color="#a855f7" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            Nhật Ký Cảnh Báo & Sự Kiện Hệ Thống
          </h3>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {alertHistory.length} sự kiện
        </span>
      </div>

      {alertHistory.length === 0 ? (
        <div style={{
          padding: '28px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.9rem',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '12px',
        }}>
          Chưa có sự kiện cảnh báo nào được ghi nhận. Hệ thống đang vận hành an toàn.
        </div>
      ) : (
        <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {alertHistory.map((item, idx) => {
            const isAck = item.acknowledged;
            const isCritical = item.dangerLevel === 'CRITICAL';

            return (
              <div
                key={item.alertId || idx}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: isCritical ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  border: isCritical ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border-glass)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {isCritical ? (
                    <ShieldAlert size={18} color="#ef4444" />
                  ) : isAck ? (
                    <CheckCircle size={18} color="#10b981" />
                  ) : (
                    <Info size={18} color="#f59e0b" />
                  )}
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: isCritical ? '#fca5a5' : 'var(--text-primary)' }}>
                      {item.message || `Cảnh báo ${item.dangerLevel || 'WARNING'}`}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Thiết bị: {item.deviceId || 'esp32-room-01'} &bull; Nhiệt độ: {item.temperature}°C &bull; Độ ẩm: {item.humidity}%
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: isAck ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: isAck ? '#34d399' : '#f87171',
                    fontWeight: '600',
                  }}>
                    {isAck ? 'Đã xử lý' : 'Chưa xử lý'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {item.timestamp ? new Date(item.timestamp).toLocaleTimeString('vi-VN') : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
