import React, { useCallback, useEffect, useState } from 'react';
import { Home, Plus, Play, Trash2 } from 'lucide-react';

const API = '/api/iot/v1/scenes';
const inputStyle = {
  width: '100%', padding: '9px 10px', borderRadius: 8,
  border: '1px solid rgba(148,163,184,0.28)',
  background: 'rgba(15,23,42,0.75)', color: 'var(--text-primary)',
};
const labelStyle = { display: 'grid', gap: 6, color: 'var(--text-secondary)', fontSize: '0.8rem' };

export default function ScenePanel({ selectedDeviceId }) {
  const [scenes, setScenes] = useState([]);
  const [name, setName] = useState('HOME');
  const [description, setDescription] = useState('');
  const [actions, setActions] = useState([{ targetDeviceId: selectedDeviceId, target: 'LED', action: 'ON' }]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(API);
      if (!response.ok) throw new Error('Không tải được danh sách scene.');
      setScenes(await response.json());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    setActions((previous) => previous.map((action, index) => (
      index === 0 && !action.targetDeviceId ? { ...action, targetDeviceId: selectedDeviceId } : action
    )));
  }, [selectedDeviceId]);

  const editAction = (index, key, value) => {
    setActions((previous) => previous.map((action, i) => i === index ? { ...action, [key]: value } : action));
  };

  const createScene = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const response = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, homeId: 'home-01', actions }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Không tạo được scene.');
      setName('SLEEP');
      setDescription('');
      setActions([{ targetDeviceId: selectedDeviceId, target: 'LED', action: 'OFF' }]);
      setMessage(`Đã lưu scene ${result.name}.`);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const activateScene = async (scene) => {
    setError('');
    setMessage('');
    try {
      const response = await fetch(`${API}/${scene.id}/activate`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Không kích hoạt được scene.');
      setMessage(`Scene ${result.sceneName}: đã gửi ${result.successfulActions} lệnh, lỗi ${result.failedActions}. Trạng thái hoàn tất sẽ về từ thiết bị qua MQTT.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteScene = async (scene) => {
    setError('');
    try {
      const response = await fetch(`${API}/${scene.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Không xóa được scene.');
      setMessage(`Đã xóa scene ${scene.name}.`);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="glass-panel" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Home size={20} color="#34d399" />
        <div>
          <h2 style={{ fontSize: '1rem', margin: 0 }}>Chế độ trong nhà</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0' }}>
            HOME, AWAY hoặc SLEEP là nhóm lệnh có thể kích hoạt cùng lúc.
          </p>
        </div>
      </div>

      <form onSubmit={createScene} style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <label style={labelStyle}>Tên scene<input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="HOME / AWAY / SLEEP" required /></label>
          <label style={labelStyle}>Mô tả<input style={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ví dụ: tắt đèn và còi" /></label>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          {actions.map((action, index) => (
            <div key={index} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 8, alignItems: 'end' }}>
              <label style={labelStyle}>Node<input style={inputStyle} value={action.targetDeviceId} onChange={(e) => editAction(index, 'targetDeviceId', e.target.value)} required /></label>
              <label style={labelStyle}>Thiết bị
                <select style={inputStyle} value={action.target} onChange={(e) => editAction(index, 'target', e.target.value)}>
                  <option value="LED">LED RGB</option><option value="BUZZER">Còi</option>
                </select>
              </label>
              <label style={labelStyle}>Hành động
                <select style={inputStyle} value={action.action} onChange={(e) => editAction(index, 'action', e.target.value)}>
                  <option value="ON">Bật</option><option value="OFF">Tắt</option>
                </select>
              </label>
              {actions.length > 1 && <button type="button" className="btn btn-secondary" onClick={() => setActions((previous) => previous.filter((_, i) => i !== index))}>Bỏ</button>}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={() => setActions((previous) => [...previous, { targetDeviceId: selectedDeviceId, target: 'LED', action: 'OFF' }])}>
            <Plus size={15} /> Thêm thiết bị
          </button>
          <button className="btn btn-primary" type="submit"><Plus size={15} /> Lưu scene</button>
        </div>
      </form>

      {error && <p role="alert" style={{ color: '#fda4af', margin: '12px 0 0' }}>{error}</p>}
      {message && <p role="status" style={{ color: '#86efac', margin: '12px 0 0' }}>{message}</p>}

      <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>
        {scenes.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Chưa tạo scene nào.</p>}
        {scenes.map((scene) => (
          <div key={scene.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, background: 'rgba(15,23,42,0.42)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ fontSize: '0.85rem' }}>{scene.name}</strong>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 3 }}>
                {scene.description || `${scene.actions?.length || 0} hành động`}
              </div>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => activateScene(scene)}><Play size={14} /> Kích hoạt</button>
            <button type="button" className="btn btn-secondary" aria-label="Xóa scene" onClick={() => deleteScene(scene)} style={{ padding: 8 }}><Trash2 size={15} color="#fda4af" /></button>
          </div>
        ))}
      </div>
    </section>
  );
}
