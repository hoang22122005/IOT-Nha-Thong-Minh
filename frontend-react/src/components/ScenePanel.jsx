import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Layers, Pencil, Play, Plus, Power, Save, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { deviceName } from '../lib/iot';
import { Badge, ConfirmDelete, EmptyState, SectionHeading } from './ui';

const newAction = (device = {}) => ({ targetDeviceId: device.deviceId || '', target: device.actuators?.find((name) => ['LED', 'BUZZER'].includes(name)) || '', action: 'OFF' });
export default function ScenePanel({ devices, selectedDeviceId, connected }) {
  const [scenes, setScenes] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const selected = devices[selectedDeviceId] || {};
  const refresh = useCallback(async () => {
    setLoading(true);
    try { const result = await api('/scenes'); if (!Array.isArray(result)) throw new Error('Danh sách ngữ cảnh không hợp lệ.'); setScenes(result); setError(''); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { if (connected) refresh(); }, [refresh, connected]);
  const mutate = async (operation) => {
    setBusy(true); setError(''); setMessage('');
    try { return { ok: true, result: await operation() }; } catch (err) { setError(err.message); return { ok: false }; } finally { setBusy(false); }
  };
  const editAction = (index, patch) => setForm((old) => ({ ...old, actions: old.actions.map((action, i) => i === index ? { ...action, ...patch } : action) }));
  const save = async (event) => {
    event.preventDefault();
    if (form.actions.some((action) => !(devices[action.targetDeviceId]?.actuators || []).includes(action.target))) {
      setError('Mỗi hành động cần node đã công bố khả năng điều khiển tương ứng.'); return;
    }
    const { ok } = await mutate(() => api(`/scenes${form.id ? `/${encodeURIComponent(form.id)}` : ''}`, { method: form.id ? 'PUT' : 'POST', body: JSON.stringify(form) }));
    if (ok) { setForm(null); setMessage('Đã lưu ngữ cảnh.'); await refresh(); }
  };
  const activate = async (scene) => {
    const { ok, result } = await mutate(() => api(`/scenes/${encodeURIComponent(scene.id)}/activate`, { method: 'POST' }));
    if (ok) setMessage(`${scene.name}: ${result.successfulActions} hành động được chấp nhận hoặc đã đúng trạng thái; ${result.failedActions} hành động lỗi. Kiểm tra trạng thái node để biết kết quả thực tế. Các hành động đã gửi không được hoàn tác khi có lỗi một phần.`);
  };
  return <div className="page-stack"><div className="row-between wrap"><p className="muted">Nhóm lệnh LED và còi, kích hoạt bằng một thao tác</p><button className="btn btn-primary" disabled={busy || !connected} onClick={() => setForm({ name: '', description: '', homeId: selected.homeId || 'home-01', actions: [newAction(selected)] })}><Plus size={17} /> Tạo ngữ cảnh mới</button></div>
    {error && <div className="inline-notice danger" role="alert">{error} <button className="text-button" onClick={refresh}>Tải lại</button></div>}{message && <div className="inline-notice" role="status">{message}</div>}
    {form && <section className="panel"><SectionHeading title={form.id ? 'Chỉnh sửa ngữ cảnh' : 'Tạo ngữ cảnh mới'} icon={Layers} /><form className="form-stack" onSubmit={save}>
      <div className="form-grid"><label>Tên ngữ cảnh<input required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ví dụ: Tắt đèn khi đi ngủ" /></label>
        <label>Mô tả<input maxLength={300} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả các thao tác trong nhà" /></label></div>
      <fieldset><legend>Các hành động</legend><div className="form-stack">{form.actions.map((action, index) => {
        const node = devices[action.targetDeviceId];
        const targets = (node?.actuators || []).filter((name) => ['LED', 'BUZZER'].includes(name));
        return <div className="scene-action-form" key={index}><label>Node đích<select required value={action.targetDeviceId} onChange={(e) => editAction(index, newAction(devices[e.target.value]))}><option value="">Chọn node</option>
          {!node && action.targetDeviceId && <option value={action.targetDeviceId}>{action.targetDeviceId} (chưa có snapshot)</option>}{Object.values(devices).map((device) => <option key={device.deviceId} value={device.deviceId}>{deviceName(device)}</option>)}</select></label>
          <label>Thiết bị<select required value={action.target} onChange={(e) => editAction(index, { target: e.target.value })}><option value="">Chọn thiết bị</option>{[...new Set([...targets, action.target].filter(Boolean))].map((target) => <option key={target} value={target}>{target === 'LED' ? 'Đèn LED' : 'Còi báo động'}</option>)}</select></label>
          <label>Hành động<select value={action.action} onChange={(e) => editAction(index, { action: e.target.value })}><option value="OFF">Tắt (OFF)</option><option value="ON">Bật (ON)</option></select></label>
          <button type="button" className="btn btn-danger icon-button" aria-label={`Bỏ hành động ${index + 1}`} disabled={form.actions.length === 1 || busy} onClick={() => setForm({ ...form, actions: form.actions.filter((_, i) => i !== index) })}><Trash2 size={16} /></button>
        </div>;
      })}</div></fieldset>
      <div className="row-between wrap"><button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setForm({ ...form, actions: [...form.actions, newAction(selected)] })}><Plus size={16} /> Thêm hành động</button>
        <div className="action-group"><button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setForm(null)}>Hủy</button><button className="btn btn-primary" disabled={busy || !connected}><Save size={16} />{busy ? 'Đang lưu…' : 'Lưu ngữ cảnh'}</button></div></div>
    </form></section>}
    <SectionHeading title="Ngữ cảnh đã lưu" icon={Layers}><Badge>{scenes.length} ngữ cảnh</Badge></SectionHeading>
    {loading ? <section className="panel"><EmptyState title={connected ? 'Đang tải ngữ cảnh…' : 'Chờ kết nối máy chủ'} /></section> : scenes.length ? <div className="scene-grid">{scenes.map((scene) => <article className="panel scene-card" key={scene.id}>
      <div className="row-between"><span className="device-icon"><Power size={22} /></span><div className="action-group"><button className="btn btn-secondary icon-button" disabled={busy} aria-label={`Sửa ${scene.name}`} onClick={() => setForm({ ...scene, actions: scene.actions.map((action) => ({ ...action })) })}><Pencil size={16} /></button>
        <button className="btn btn-danger icon-button" disabled={busy || !connected} aria-label={`Xóa ${scene.name}`} onClick={() => setDeleting(scene)}><Trash2 size={16} /></button></div></div>
      <h2>{scene.name}</h2><p className="muted">{scene.description || 'Nhóm thao tác thiết bị'}</p><div className="scene-actions"><p className="eyebrow">Các hành động ({scene.actions.length})</p>
        {scene.actions.map((action, index) => <div className="scene-action" key={index}><span>{action.targetDeviceId}<small>{action.target === 'LED' ? 'Đèn LED' : 'Còi báo động'}</small></span><ArrowRight size={15} /><Badge tone={action.action === 'ON' ? 'success' : 'neutral'}>{action.action === 'ON' ? 'Bật' : 'Tắt'}</Badge></div>)}</div>
      <button className="btn btn-primary full-width" disabled={busy || !connected} onClick={() => activate(scene)}><Play size={16} />{busy ? 'Đang xử lý…' : 'Chạy ngữ cảnh'}</button>
    </article>)}</div> : <section className="panel"><EmptyState title="Chưa có ngữ cảnh" icon={Layers}>Tạo nhóm thao tác để chạy cùng lúc, ví dụ tắt LED và còi.</EmptyState></section>}
    {deleting && <section className="panel"><ConfirmDelete name={deleting.name} busy={busy} onCancel={() => setDeleting(null)} onConfirm={async () => {
      const { ok } = await mutate(() => api(`/scenes/${encodeURIComponent(deleting.id)}`, { method: 'DELETE' }));
      if (ok) { setDeleting(null); setMessage('Đã xóa ngữ cảnh.'); await refresh(); }
    }} /></section>}
    <p className="muted">Kết quả API phản ánh việc gửi lệnh, chưa phải xác nhận phần cứng. Theo dõi trạng thái thật trong Phòng & thiết bị.</p>
  </div>;
}
