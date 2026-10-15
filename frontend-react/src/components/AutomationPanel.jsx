import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Save, SlidersHorizontal, Trash2, Zap } from 'lucide-react';
import { api } from '../lib/api';
import { deviceName, metricName, number, roomName } from '../lib/iot';
import { Badge, ConfirmDelete, EmptyState, SectionHeading } from './ui';

const OPERATORS = { GT: 'lớn hơn (>)', GTE: 'lớn hơn hoặc bằng (≥)', LT: 'nhỏ hơn (<)', LTE: 'nhỏ hơn hoặc bằng (≤)', EQ: 'bằng (=)' };
const freshRule = (device) => ({ name: '', sensorId: Object.keys(device.sensors || {})[0] || device.sensorId || '', metric: 'TEMPERATURE', operator: 'GT', threshold: '',
  targetDeviceId: device.deviceId || '', target: device.actuators?.includes('LED') ? 'LED' : device.actuators?.includes('BUZZER') ? 'BUZZER' : '', actionWhenTrue: 'ON', actionWhenFalse: '', enabled: true, cooldownSeconds: 10,
  homeId: device.homeId, roomId: device.roomId });

export default function AutomationPanel({ devices, selectedDeviceId, connected }) {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    try { const result = await api('/automations'); if (!Array.isArray(result)) throw new Error('Danh sách quy tắc không hợp lệ.'); setRules(result); setError(''); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { if (connected) refresh(); }, [refresh, connected]);
  const nodes = Object.values(devices);
  const sensors = [...new Set(nodes.flatMap((node) => Object.keys(node.sensors || {})))];
  const sensorMetrics = [...new Set(nodes.flatMap((node) => Object.values(node.sensors || {}).flatMap((sensor) => Object.keys(sensor.measurements || {}))))];
  const selected = devices[selectedDeviceId] || {};
  const targetNode = devices[form?.targetDeviceId];
  const targets = (targetNode?.actuators || []).filter((name) => ['LED', 'BUZZER'].includes(name));
  const edit = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const mutate = async (operation, success) => {
    setBusy(true); setError(''); setMessage('');
    try { await operation(); await refresh(); setMessage(success); return true; }
    catch (err) { setError(err.message); return false; } finally { setBusy(false); }
  };
  const save = async (event) => {
    event.preventDefault();
    const body = { ...form, metric: form.metric.toUpperCase(), threshold: Number(form.threshold), cooldownSeconds: Number(form.cooldownSeconds) };
    if (!Number.isFinite(body.threshold) || !targets.includes(body.target)) { setError('Kiểm tra ngưỡng và khả năng điều khiển của node đích.'); return; }
    const saved = await mutate(() => api(`/automations${form.id ? `/${encodeURIComponent(form.id)}` : ''}`, { method: form.id ? 'PUT' : 'POST', body: JSON.stringify(body) }), 'Đã lưu quy tắc.');
    if (saved) setForm(null);
  };
  return <div className="page-stack"><div className="row-between wrap"><p className="muted">Tự động phản hồi theo giá trị cảm biến</p><button className="btn btn-primary" disabled={!connected || busy} onClick={() => { setForm(freshRule(selected)); setMessage(''); }}><Plus size={17} /> Tạo quy tắc mới</button></div>
    {error && <div className="inline-notice danger" role="alert">{error} <button className="text-button" onClick={refresh}>Tải lại</button></div>}{message && <div className="inline-notice" role="status">{message}</div>}
    {form && <section className="panel"><SectionHeading title={form.id ? 'Chỉnh sửa quy tắc' : 'Tạo quy tắc mới'} icon={SlidersHorizontal} /><form onSubmit={save} className="form-stack">
      <label>Tên quy tắc<input required maxLength={120} value={form.name} onChange={(e) => edit('name', e.target.value)} placeholder="Ví dụ: Bật LED khi nhiệt độ cao" /></label>
      <fieldset><legend>Điều kiện kích hoạt</legend><div className="form-grid four">
        <label>Khi cảm biến<select required value={form.sensorId} onChange={(e) => edit('sensorId', e.target.value)}><option value="">Chọn cảm biến</option>{[...new Set([...sensors, form.sensorId].filter(Boolean))].map((id) => <option key={id}>{id}</option>)}</select></label>
        <label>Đại lượng<input required maxLength={32} pattern="[A-Za-z][A-Za-z0-9_]*" list="rule-metrics" value={form.metric} onChange={(e) => edit('metric', e.target.value)} /><datalist id="rule-metrics">{[...new Set(['temperature', 'humidity', ...sensorMetrics])].map((name) => <option key={name} value={name.toUpperCase()}>{metricName(name)}</option>)}</datalist></label>
        <label>Phép so sánh<select value={form.operator} onChange={(e) => edit('operator', e.target.value)}>{Object.entries(OPERATORS).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>
        <label>Ngưỡng<input required type="number" step="any" value={form.threshold} onChange={(e) => edit('threshold', e.target.value)} /></label>
      </div></fieldset>
      <div className="form-grid"><fieldset><legend>Hành động khi thỏa</legend><div className="form-stack">
        <label>Node đích<select required value={form.targetDeviceId} onChange={(e) => { const node = devices[e.target.value]; setForm((old) => ({ ...old, targetDeviceId: node.deviceId, target: node.actuators?.find((target) => ['LED', 'BUZZER'].includes(target)) || '' })); }}><option value="">Chọn node</option>
          {!devices[form.targetDeviceId] && form.targetDeviceId && <option value={form.targetDeviceId}>{form.targetDeviceId} (chưa có snapshot)</option>}{nodes.map((node) => <option key={node.deviceId} value={node.deviceId}>{roomName(node)} · {deviceName(node)}</option>)}</select></label>
        <div className="form-grid"><label>Thiết bị<select required value={form.target} onChange={(e) => edit('target', e.target.value)}><option value="">Chọn thiết bị</option>{[...new Set([...targets, form.target].filter(Boolean))].map((name) => <option key={name} value={name}>{name === 'LED' ? 'Đèn LED' : 'Còi báo động'}</option>)}</select></label>
          <label>Hành động<select value={form.actionWhenTrue} onChange={(e) => edit('actionWhenTrue', e.target.value)}><option value="ON">Bật (ON)</option><option value="OFF">Tắt (OFF)</option></select></label></div>
      </div></fieldset><fieldset><legend>Hành động khi không thỏa</legend><label>Khi không thỏa<select value={form.actionWhenFalse || ''} onChange={(e) => edit('actionWhenFalse', e.target.value)}><option value="">Không gửi lệnh</option><option value="OFF">Tắt (OFF)</option><option value="ON">Bật (ON)</option></select></label><p className="muted sample-footer">Quy tắc được đánh giá khi có dữ liệu cảm biến; đây không phải lịch chạy theo giờ.</p></fieldset></div>
      <div className="row-between wrap"><label>Khoảng chờ giữa các lần gửi lệnh (giây)<input required type="number" min="0" max="86400" step="1" value={form.cooldownSeconds} onChange={(e) => edit('cooldownSeconds', e.target.value)} /></label><label className="checkbox-label"><input type="checkbox" checked={form.enabled} onChange={(e) => edit('enabled', e.target.checked)} /> Đang bật quy tắc</label></div>
      <div className="rule-preview"><strong>Xem trước quy tắc</strong><p>Khi {metricName(form.metric.toLowerCase())} của {form.sensorId || 'cảm biến'} {OPERATORS[form.operator]}, ngưỡng {number(Number(form.threshold))}, {form.actionWhenTrue === 'ON' ? 'bật' : 'tắt'} {form.target || 'thiết bị'} trên {form.targetDeviceId || 'node'}. Khi không thỏa: {form.actionWhenFalse ? form.actionWhenFalse === 'ON' ? 'bật' : 'tắt' : 'không gửi lệnh'}.</p></div>
      {!targets.length && <p className="text-warning">Node đích chưa công bố LED hoặc BUZZER. Chọn node có khả năng phù hợp để lưu.</p>}
      <div className="action-group justify-end"><button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setForm(null)}>Hủy</button><button className="btn btn-primary" disabled={busy || !connected || !targets.length}><Save size={16} />{busy ? 'Đang lưu…' : 'Lưu quy tắc'}</button></div>
    </form></section>}
    <section className="panel flush"><div className="panel-padding"><SectionHeading title="Danh sách quy tắc đã lưu" icon={Zap}><Badge>{rules.length} quy tắc</Badge></SectionHeading></div>
      {loading ? <EmptyState title={connected ? 'Đang tải quy tắc…' : 'Chờ kết nối máy chủ'} /> : rules.length ? <div className="table-scroll"><table><thead><tr><th>Tên quy tắc</th><th>Điều kiện kích hoạt</th><th>Đích thực hiện</th><th>Khoảng chờ</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{rules.map((rule) => <tr key={rule.id}>
        <td><strong>{rule.name}</strong></td><td>{rule.sensorId} · {metricName(rule.metric.toLowerCase())} {OPERATORS[rule.operator]} {number(rule.threshold)}</td><td>{rule.targetDeviceId}<p>{rule.target} → {rule.actionWhenTrue}</p></td><td>{rule.cooldownSeconds} giây</td><td><button className="switch" role="switch" aria-label={`Bật/tắt quy tắc ${rule.name}`} aria-checked={rule.enabled} disabled={busy || !connected} onClick={() => mutate(() => api(`/automations/${encodeURIComponent(rule.id)}`, { method: 'PUT', body: JSON.stringify({ ...rule, enabled: !rule.enabled }) }), 'Đã cập nhật trạng thái quy tắc.')}><span /></button><p className="muted">{rule.enabled ? 'Đang bật' : 'Đang tắt'}</p></td>
        <td><div className="action-group"><button className="btn btn-secondary icon-button" disabled={busy} aria-label={`Sửa ${rule.name}`} onClick={() => setForm({ ...rule })}><Pencil size={16} /></button><button className="btn btn-danger icon-button" disabled={busy || !connected} aria-label={`Xóa ${rule.name}`} onClick={() => setDeleting(rule)}><Trash2 size={16} /></button></div></td>
      </tr>)}</tbody></table></div> : <EmptyState title="Chưa có quy tắc tự động">Tạo điều kiện dựa trên số đo để điều khiển LED hoặc còi.</EmptyState>}
      {deleting && <ConfirmDelete name={deleting.name} busy={busy} onCancel={() => setDeleting(null)} onConfirm={async () => { if (await mutate(() => api(`/automations/${encodeURIComponent(deleting.id)}`, { method: 'DELETE' }), 'Đã xóa quy tắc.')) setDeleting(null); }} />}
    </section>
  </div>;
}
