import React, { useCallback, useEffect, useState } from 'react';
import { Bot, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

const API = '/api/iot/v1/automations';
const EMPTY_RULE = {
  name: 'Cảnh báo nhiệt độ',
  sensorId: 'dht11-01',
  metric: 'TEMPERATURE',
  operator: 'GT',
  threshold: '32',
  targetDeviceId: 'esp32-room-01',
  target: 'LED',
  actionWhenTrue: 'ON',
  actionWhenFalse: 'OFF',
  enabled: true,
  cooldownSeconds: '10',
};

const inputStyle = {
  width: '100%',
  padding: '9px 10px',
  borderRadius: 8,
  border: '1px solid rgba(148,163,184,0.28)',
  background: 'rgba(15,23,42,0.75)',
  color: 'var(--text-primary)',
};
const labelStyle = { display: 'grid', gap: 6, color: 'var(--text-secondary)', fontSize: '0.8rem' };

export default function AutomationPanel({ selectedDeviceId }) {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState({ ...EMPTY_RULE, targetDeviceId: selectedDeviceId });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(API);
      if (!response.ok) throw new Error('Không tải được danh sách luật.');
      setRules(await response.json());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    setForm((previous) => ({ ...previous, targetDeviceId: selectedDeviceId }));
  }, [selectedDeviceId]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const createRule = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          threshold: Number(form.threshold),
          cooldownSeconds: Number(form.cooldownSeconds),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Không tạo được luật.');
      setForm((previous) => ({ ...EMPTY_RULE, targetDeviceId: previous.targetDeviceId }));
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (rule) => {
    setError('');
    try {
      const response = await fetch(`${API}/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rule, enabled: !rule.enabled }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Không cập nhật được luật.');
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteRule = async (id) => {
    setError('');
    try {
      const response = await fetch(`${API}/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Không xóa được luật.');
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="glass-panel" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Bot size={20} color="#a78bfa" />
        <div>
          <h2 style={{ fontSize: '1rem', margin: 0 }}>Tự động hóa</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0' }}>
            Tạo luật “nếu cảm biến đạt điều kiện thì điều khiển thiết bị”.
          </p>
        </div>
      </div>

      <form onSubmit={createRule} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <label style={labelStyle}>Tên luật<input style={inputStyle} name="name" value={form.name} onChange={updateField} required /></label>
        <label style={labelStyle}>Mã cảm biến<input style={inputStyle} name="sensorId" value={form.sensorId} onChange={updateField} required /></label>
        <label style={labelStyle}>Giá trị đo
          <input style={inputStyle} name="metric" value={form.metric} onChange={updateField}
            list="measurement-names" pattern="[A-Za-z][A-Za-z0-9_]*" required />
          <datalist id="measurement-names"><option value="TEMPERATURE" /><option value="HUMIDITY" /></datalist>
        </label>
        <label style={labelStyle}>Điều kiện
          <select style={inputStyle} name="operator" value={form.operator} onChange={updateField}>
            <option value="GT">lớn hơn (&gt;)</option><option value="GTE">lớn hơn hoặc bằng (≥)</option>
            <option value="LT">nhỏ hơn (&lt;)</option><option value="LTE">nhỏ hơn hoặc bằng (≤)</option>
            <option value="EQ">bằng (=)</option>
          </select>
        </label>
        <label style={labelStyle}>Ngưỡng<input style={inputStyle} name="threshold" type="number" step="any" value={form.threshold} onChange={updateField} required /></label>
        <label style={labelStyle}>Node điều khiển<input style={inputStyle} name="targetDeviceId" value={form.targetDeviceId} onChange={updateField} required /></label>
        <label style={labelStyle}>Thiết bị
          <select style={inputStyle} name="target" value={form.target} onChange={updateField}>
            <option value="LED">LED RGB</option><option value="BUZZER">Còi</option>
          </select>
        </label>
        <label style={labelStyle}>Hành động khi đúng
          <select style={inputStyle} name="actionWhenTrue" value={form.actionWhenTrue} onChange={updateField}>
            <option value="ON">Bật</option><option value="OFF">Tắt</option>
          </select>
        </label>
        <label style={labelStyle}>Hành động khi trở về bình thường
          <select style={inputStyle} name="actionWhenFalse" value={form.actionWhenFalse} onChange={updateField}>
            <option value="OFF">Tắt</option><option value="ON">Bật</option>
          </select>
        </label>
        <label style={labelStyle}>Thời gian nghỉ (giây)<input style={inputStyle} name="cooldownSeconds" type="number" min="0" max="86400" value={form.cooldownSeconds} onChange={updateField} required /></label>
        <div style={{ display: 'flex', alignItems: 'end' }}>
          <button className="btn btn-primary" type="submit" disabled={saving} style={{ width: '100%' }}>
            <Plus size={16} /> {saving ? 'Đang lưu…' : 'Tạo luật'}
          </button>
        </div>
      </form>

      {error && <p role="alert" style={{ color: '#fda4af', margin: '12px 0 0' }}>{error}</p>}

      <div style={{ display: 'grid', gap: 8, marginTop: 18 }}>
        {rules.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Chưa có luật tự động nào.</p>}
        {rules.map((rule) => (
          <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, background: 'rgba(15,23,42,0.42)' }}>
            <button type="button" onClick={() => toggleRule(rule)} aria-label={rule.enabled ? 'Tắt luật' : 'Bật luật'} className="btn btn-secondary" style={{ padding: 7 }}>
              {rule.enabled ? <ToggleRight size={20} color="#4ade80" /> : <ToggleLeft size={20} />}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ fontSize: '0.85rem' }}>{rule.name}</strong>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 3 }}>
                {rule.sensorId}: {rule.metric} {rule.operator} {rule.threshold} → {rule.targetDeviceId} / {rule.target} {rule.actionWhenTrue}
              </div>
            </div>
            <button type="button" onClick={() => deleteRule(rule.id)} aria-label="Xóa luật" className="btn btn-secondary" style={{ padding: 7 }}>
              <Trash2 size={16} color="#fda4af" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
