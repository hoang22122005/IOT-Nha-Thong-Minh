import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, Bell, CircleHelp, DoorOpen, History, House, Info, LayoutDashboard, Layers, Radio, Search, Server, Settings2, Wifi, WifiOff, Zap } from 'lucide-react';
import { useIoTWebSocket } from './hooks/useIoTWebSocket';
import RoomCards from './components/RoomCards';
import SensorMetrics from './components/SensorMetrics';
import ControlPanel from './components/ControlPanel';
import HistoryPanel from './components/HistoryPanel';
import AlertsPanel, { ActiveAlertBanner } from './components/AlertsPanel';
import AutomationPanel from './components/AutomationPanel';
import ScenePanel from './components/ScenePanel';
import VoiceCommandPanel from './components/VoiceCommandPanel';
import { Badge, EmptyState, SectionHeading } from './components/ui';
import { dateTime, deviceName, number, roomName } from './lib/iot';

const PAGES = [
  { id: 'tong-quan', title: 'Tổng quan', icon: LayoutDashboard }, { id: 'thiet-bi', title: 'Phòng & thiết bị', icon: DoorOpen },
  { id: 'ngu-canh', title: 'Ngữ cảnh', icon: Layers }, { id: 'tu-dong-hoa', title: 'Tự động hóa', icon: Zap },
  { id: 'lich-su', title: 'Lịch sử cảm biến', icon: History }, { id: 'canh-bao', title: 'Cảnh báo', icon: AlertTriangle },
  { id: 'he-thong', title: 'Thông tin hệ thống', icon: Info },
];
const readPage = () => typeof window !== 'undefined' && PAGES.some((page) => `#/${page.id}` === window.location.hash) ? window.location.hash.slice(2) : 'tong-quan';
export default function App() {
  const iot = useIoTWebSocket();
  const [page, setPage] = useState(readPage);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const mainRef = useRef(null);
  const { isConnected, hasSnapshot, deviceState: device, deviceStates, selectedDeviceId, selectedSensorId, selectDevice,
    selectSensor, alertHistory, latency, acknowledgeAlert } = iot;
  const nodes = Object.values(deviceStates);
  const active = alertHistory.filter((alert) => alert.active !== false);
  const activeDeviceIds = new Set([...active.map((alert) => alert.deviceId), ...nodes.filter((node) => ['CRITICAL', 'WARNING'].includes(node.fireDanger)).map((node) => node.deviceId)]);
  const currentPage = PAGES.find((item) => item.id === page) || PAGES[0];
  const navigate = (id) => { window.location.hash = `/${id}`; };
  useEffect(() => {
    const onHash = () => { setPage(readPage()); window.scrollTo({ top: 0 }); mainRef.current?.focus(); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => { document.title = `${currentPage.title} · Nhà của tôi`; }, [currentPage.title]);
  const openDevice = (id) => { if (deviceStates[id]) selectDevice(id); navigate('thiet-bi'); };
  const filtered = nodes.filter((node) => `${roomName(node)} ${deviceName(node)} ${node.homeId || ''}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))
    && (status === 'all' || (status === 'online' ? node.online : !node.online)));
  const controls = { deviceState: device, isConnected: isConnected && hasSnapshot, commandFeedback: iot.commandFeedback, sendLightCommand: iot.sendLightCommand, sendBuzzerCommand: iot.sendBuzzerCommand };
  return <div className="app-shell"><a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); mainRef.current?.focus(); }}>Đến nội dung chính</a>
    <aside className="sidebar"><a className="brand" href="#/tong-quan"><span className="brand-icon"><House size={27} strokeWidth={1.5} /></span><span><strong>Nhà của tôi</strong><small>Bảng điều khiển</small></span></a>
      <nav aria-label="Điều hướng chính">{PAGES.slice(0, 6).map(({ id, title, icon: Icon }) => <a key={id} href={`#/${id}`} aria-current={page === id ? 'page' : undefined} className={`nav-item ${page === id ? 'active' : ''}`}><Icon size={19} /><span>{title}</span>
        {id === 'canh-bao' && activeDeviceIds.size > 0 && <span className="nav-count">{activeDeviceIds.size}</span>}</a>)}</nav>
      <a href="#/he-thong" aria-current={page === 'he-thong' ? 'page' : undefined} className={`nav-item sidebar-info ${page === 'he-thong' ? 'active' : ''}`}><Info size={19} /><span>Thông tin hệ thống</span></a>
    </aside>
    <div className="workspace"><header className="topbar"><span>Bảng điều khiển</span><div className="action-group"><Badge tone={isConnected ? 'success' : 'warning'}><span className="status-dot" />{isConnected ? 'Đã kết nối máy chủ' : 'Đang kết nối lại'}</Badge>
      <a className="notification-button" href="#/canh-bao" aria-label={`Cảnh báo: ${activeDeviceIds.size} node đang cảnh báo`}><Bell size={19} />{activeDeviceIds.size > 0 && <span />}</a></div></header>
      <main id="main-content" ref={mainRef} tabIndex={-1} className="main-content"><div className="page-heading"><div><p className="eyebrow">Không gian sống của bạn</p><h1>{currentPage.title}</h1></div>
        <span className="header-meta">{page === 'tong-quan' ? new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long', day: 'numeric', month: 'long' }) : 'Nhà của tôi'}</span></div>
        {!isConnected && <div className="inline-notice" role="status"><WifiOff size={18} />Mất kết nối máy chủ. Đang thử kết nối lại; dữ liệu đã nhận được giữ nguyên.</div>}
        {isConnected && !hasSnapshot && <div className="inline-notice" role="status"><Radio size={18} />Đang đồng bộ trạng thái nhà…</div>}
        {['tong-quan', 'thiet-bi', 'canh-bao'].includes(page) && <ActiveAlertBanner alerts={alertHistory} devices={deviceStates} onAcknowledge={acknowledgeAlert} connected={isConnected} onDevice={openDevice} onAll={() => navigate('canh-bao')} />}
        {page === 'tong-quan' && <div className="page-stack"><div className="overview-stats">{[
          ['Khu vực kiểm soát', hasSnapshot ? new Set(nodes.map((node) => `${node.homeId}/${node.roomId}`)).size : '—', 'phòng', DoorOpen],
          ['Vi điều khiển kết nối', hasSnapshot ? isConnected ? `${nodes.filter((node) => node.online).length}/${nodes.length}` : '—' : '—', isConnected ? 'node online' : 'chưa cập nhật', Radio],
          ['Cảnh báo đang diễn ra', hasSnapshot ? activeDeviceIds.size : '—', 'node có cảnh báo', AlertTriangle],
        ].map(([label, value, suffix, Icon]) => <div className="stat-card" key={label}><div><p className="eyebrow">{label}</p><p className={`stat-value ${label.startsWith('Cảnh') && activeDeviceIds.size ? 'text-danger' : ''}`}>{value} <small>{suffix}</small></p></div><span className="stat-icon"><Icon size={25} strokeWidth={1.5} /></span></div>)}</div>
          <div className="overview-columns"><div className="page-stack"><SectionHeading title="Các phòng"><span className="muted">{nodes.length} điểm thu thập</span></SectionHeading>
            <RoomCards devices={nodes} selectedDeviceId={selectedDeviceId} onSelect={openDevice} connected={isConnected} alerts={alertHistory} />
            <HistoryPanel iot={iot} compact onMore={() => navigate('lich-su')} />
          </div><div className="page-stack"><ControlPanel {...controls} compact />
            <section className="panel threshold-card"><Settings2 size={21} /><div><h3>Ngưỡng tại thiết bị</h3><p className="muted">{Number.isFinite(device.alarmThresholdC) ? `> ${number(device.alarmThresholdC)} °C · ngưỡng demo` : 'Chưa nhận ngưỡng cấu hình'}</p></div><button className="text-button" onClick={() => navigate('he-thong')} aria-label="Thông tin cấu hình ngưỡng"><ArrowRight size={18} /></button></section>
            <div className="help-note"><CircleHelp size={18} /><p>Chọn một phòng để xem cảm biến và điều khiển thiết bị. Số đo offline là dữ liệu đã lưu.</p></div>
          </div></div>
        </div>}
        {page === 'thiet-bi' && <div className="page-stack"><section className="panel device-toolbar"><label className="search-field"><Search size={19} /><input type="search" placeholder="Tìm theo phòng hoặc ID…" aria-label="Tìm thiết bị" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
          <div className="segmented">{[['all', 'Tất cả'], ['online', 'Online'], ['offline', 'Offline']].map(([id, label]) => <button key={id} aria-pressed={status === id} className={status === id ? 'active' : ''} onClick={() => setStatus(id)}>{label} ({nodes.filter((node) => id === 'all' || (id === 'online' ? node.online : !node.online)).length})</button>)}</div></section>
          <div className="device-columns"><section><SectionHeading title="Thiết bị theo phòng" /><RoomCards devices={filtered} filtered={nodes.length > 0} compact selectedDeviceId={selectedDeviceId} onSelect={selectDevice} connected={isConnected} alerts={alertHistory} /></section>
            {device.deviceId ? <div className="page-stack"><section className="panel"><div className="row-between wrap"><h2>{roomName(device)} / {deviceName(device)}</h2><Badge tone={isConnected && device.online ? 'success' : 'neutral'}>{!isConnected ? 'Chưa cập nhật' : device.online ? 'Online' : 'Offline'}</Badge></div>
              <div className="node-meta"><span><Wifi size={15} /> RSSI: {device.wifiRssi == null ? '—' : `${device.wifiRssi} dBm`}</span><span>Uptime: {device.uptimeSeconds == null ? '—' : `${Math.floor(device.uptimeSeconds / 3600)} giờ ${Math.floor(device.uptimeSeconds % 3600 / 60)} phút`}</span></div></section>
              <SensorMetrics device={device} sensorId={selectedSensorId} onSensorChange={selectSensor} connected={isConnected} />
              <ControlPanel {...controls} />
              {(device.actuators || []).some((target) => ['LED', 'BUZZER'].includes(target)) && <VoiceCommandPanel key={selectedDeviceId} selectedDeviceId={selectedDeviceId} supportedActuators={device.actuators} disabled={!isConnected || !hasSnapshot || !device.online} sendLightCommand={iot.sendLightCommand} sendBuzzerCommand={iot.sendBuzzerCommand} />}
              <section className="panel flush"><div className="panel-padding"><SectionHeading title="Thông tin kỹ thuật" icon={Server} /></div><div className="table-scroll"><table><thead><tr><th>Thuộc tính</th><th>Giá trị thiết bị báo</th></tr></thead><tbody>{[
                ['homeId', device.homeId], ['roomId', device.roomId], ['deviceId', device.deviceId], ['sensors', Object.keys(device.sensors || {}).join(', ')], ['actuators', (device.actuators || []).join(', ')], ['Node được ghi nhận lúc', dateTime(device.lastSeenAt)],
              ].map(([label, value]) => <tr key={label}><td>{label}</td><td>{value || 'Chưa có dữ liệu'}</td></tr>)}</tbody></table></div></section>
            </div> : <section className="panel"><EmptyState title={hasSnapshot ? 'Chưa chọn thiết bị' : 'Đang chờ trạng thái nhà…'}>Chọn node trong danh sách để xem chi tiết.</EmptyState></section>}
          </div>
        </div>}
        {/* Keep editors mounted so navigation and realtime do not discard drafts. */}
        <div hidden={page !== 'ngu-canh'}><ScenePanel devices={deviceStates} selectedDeviceId={selectedDeviceId} connected={isConnected && hasSnapshot} /></div>
        <div hidden={page !== 'tu-dong-hoa'}><AutomationPanel devices={deviceStates} selectedDeviceId={selectedDeviceId} connected={isConnected && hasSnapshot} /></div>
        {page === 'lich-su' && <HistoryPanel iot={iot} />}
        {page === 'canh-bao' && <AlertsPanel alerts={alertHistory} devices={deviceStates} onAcknowledge={acknowledgeAlert} connected={isConnected} onDevice={openDevice} />}
        {page === 'he-thong' && <div className="page-stack"><section className="panel"><SectionHeading title="Kết nối và dữ liệu" icon={Server} /><dl className="system-details"><dt>Máy chủ dashboard</dt><dd>{isConnected ? 'Đã kết nối WebSocket' : 'Đang thử kết nối lại'}</dd><dt>Độ trễ trình duyệt ↔ máy chủ</dt><dd>{isConnected && latency != null ? `${latency} ms` : 'Chưa có phép đo'}</dd><dt>Thiết bị đã nhận diện</dt><dd>{nodes.length} node</dd><dt>Múi giờ hiển thị</dt><dd>Asia/Ho_Chi_Minh</dd></dl></section>
          <section className="panel"><SectionHeading title="Phạm vi hệ thống hiện tại" icon={Info} /><div className="prose"><p>Hệ thống nhận dữ liệu cảm biến qua ESP32 → MQTT → máy chủ và cập nhật dashboard qua WebSocket. Trạng thái kết nối máy chủ không xác nhận node đang online.</p><p>Cảnh báo nhiệt độ dùng ngưỡng demo do node báo; DHT11 đo nhiệt độ và độ ẩm. Cấu hình ngưỡng hiện cần cập nhật firmware; chưa có API thay đổi ngưỡng từ dashboard.</p><p>LED RGB, còi, ngữ cảnh và quy tắc cảm biến đã có API. Quản lý tên phòng, tài khoản, camera, điều hòa và lịch theo giờ nằm trong kế hoạch backend.</p><p>Lịch sử hiển thị tối đa 1.000 mẫu trong khoảng chọn; số liệu thống kê và CSV chỉ tính trên tập mẫu đã tải. Cảnh báo hiển thị tập gần nhất từ máy chủ, tối đa 50 bản ghi.</p></div></section>
        </div>}
        <footer className="app-footer"><span>Nhà của tôi · Theo dõi & điều khiển</span><span>{isConnected ? <Wifi size={14} /> : <WifiOff size={14} />} {isConnected ? latency == null ? 'Đang đo độ trễ' : `${latency} ms đến máy chủ` : 'Đang kết nối lại'}</span></footer>
      </main>
    </div>
  </div>;
}
