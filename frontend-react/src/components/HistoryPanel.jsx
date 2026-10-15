import React, { useState } from 'react';
import { ArrowDown, ArrowUp, ChartLine, ChevronLeft, ChevronRight, Download, RefreshCw } from 'lucide-react';
import TelemetryChart from './TelemetryChart';
import { Badge, DataAge, EmptyState, SectionHeading } from './ui';
import { dateTime, deviceName, downloadCsv, metricName, metricUnit, number, roomName, sensorFor } from '../lib/iot';

const RANGES = [['1h', '1 giờ'], ['6h', '6 giờ'], ['24h', '24 giờ'], ['7d', '7 ngày']];
export default function HistoryPanel({ iot, compact = false, onMore }) {
  const { deviceState: device, deviceStates, telemetryHistory: rows, selectedDeviceId, selectedSensorId, selectDevice, selectSensor,
    historyRange, changeHistoryRange, historyLoading, historyError, refreshHistory } = iot;
  const [metricChoice, setMetricChoice] = useState('temperature');
  const [page, setPage] = useState(0);
  const sensor = sensorFor(device, selectedSensorId);
  const metrics = [...new Set([...Object.keys(sensor.measurements), ...rows.flatMap((row) => Object.keys(row.measurements || {}))])];
  const metric = metrics.includes(metricChoice) ? metricChoice : metrics[0] || 'temperature';
  const unit = metricUnit(metric, { ...rows.find((row) => row.units?.[metric])?.units, ...sensor.units });
  const data = rows.filter((row) => Number.isFinite(row.measurements?.[metric]));
  const values = data.map((row) => row.measurements[metric]);
  const max = values.length ? Math.max(...values) : null;
  const min = values.length ? Math.min(...values) : null;
  const average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const pageCount = Math.max(1, Math.ceil(data.length / 10));
  const actualPage = Math.min(page, pageCount - 1);
  const tableRows = data.slice().reverse().slice(actualPage * 10, actualPage * 10 + 10);
  return <div className="page-stack">
    <section className="panel"><div className="row-between wrap">
      <SectionHeading title={compact ? 'Cảm biến gần đây' : 'Bộ lọc lịch sử'} icon={ChartLine} />
      {compact && <button className="text-button" onClick={onMore}>Xem thêm trong Lịch sử ↗</button>}
    </div><div className="history-filters">
      {!compact && <><label>Vị trí node<select value={selectedDeviceId} onChange={(e) => { selectDevice(e.target.value); setPage(0); }} aria-label="Node xem lịch sử">
        {!selectedDeviceId && <option value="">Chưa có node</option>}{Object.values(deviceStates).map((node) => <option key={node.deviceId} value={node.deviceId}>{roomName(node)} · {deviceName(node)}</option>)}</select></label>
        <label>Cảm biến<select value={selectedSensorId} onChange={(e) => { selectSensor(e.target.value); setPage(0); }} aria-label="Cảm biến xem lịch sử">
          {!selectedSensorId && <option value="">Chưa có cảm biến</option>}{Object.keys(device.sensors || {}).map((id) => <option key={id} value={id}>{id}</option>)}</select></label></>}
      <label>Đại lượng<select value={metric} onChange={(e) => { setMetricChoice(e.target.value); setPage(0); }}>
        {metrics.length ? metrics.map((name) => <option key={name} value={name}>{metricName(name)} ({metricUnit(name, sensor.units)})</option>) : <option value="temperature">Nhiệt độ (°C)</option>}</select></label>
      <div><p className="filter-label">Khoảng thời gian</p><div className="segmented">{RANGES.map(([key, label]) => <button key={key} aria-pressed={historyRange === key}
        className={historyRange === key ? 'active' : ''} onClick={() => { changeHistoryRange(key); setPage(0); }}>{label}</button>)}</div></div>
      {!compact && <div className="action-group"><button className="btn btn-secondary" disabled={!data.length} onClick={() => downloadCsv('lich-su-cam-bien.csv',
        ['Thời gian (Asia/Ho_Chi_Minh)', 'Node', 'Cảm biến', 'Đại lượng', 'Giá trị', 'Đơn vị'], data.map((row) => [dateTime(row.timestamp), selectedDeviceId, selectedSensorId, metric, row.measurements[metric], unit]))}><Download size={16} /> Xuất CSV</button>
        <button className="btn btn-secondary icon-button" aria-label="Tải lại lịch sử" disabled={historyLoading || !selectedSensorId} onClick={refreshHistory}><RefreshCw size={17} /></button></div>}
    </div>
    {historyError && <div className="inline-notice danger" role="alert">{historyError} <button className="text-button" onClick={refreshHistory}>Thử lại</button></div>}
    {historyLoading && <p className="muted sample-footer" role="status">Đang tải lịch sử cảm biến…</p>}
    </section>
    {!compact && <div className="history-stats">{[
      ['Mẫu hiện tại của cảm biến', sensor.measurements[metric], null], ['Cao nhất (mẫu đã tải)', max, ArrowUp],
      ['Thấp nhất (mẫu đã tải)', min, ArrowDown], ['Trung bình (mẫu đã tải)', average, ChartLine],
    ].map(([label, value, Icon]) => <div className="stat-card" key={label}><div className="row-between"><span>{label}</span>{Icon && <Icon size={17} />}</div><p className="metric-value">{number(value)} <small>{unit}</small></p>
      {label.startsWith('Mẫu') ? <DataAge timestamp={sensor.lastSeenAt} online={device.online} connected={iot.isConnected} /> : <p className="muted">Tính từ {data.length} điểm trong tập đã tải</p>}</div>)}</div>}
    <section className="panel"><SectionHeading title={`${metricName(metric)} · ${selectedSensorId || 'Chưa chọn cảm biến'}`} icon={ChartLine}>
      <span className={metric === 'temperature' ? 'temperature' : 'humidity'}>● {unit}</span></SectionHeading>
      {data.length ? <TelemetryChart rows={data} metric={metric} unit={unit} threshold={device.alarmThresholdC} title={`Diễn biến ${metricName(metric)}`} />
        : <EmptyState title={historyLoading ? 'Đang tải dữ liệu' : 'Chưa có mẫu đo trong khoảng đã chọn'}>Chọn khoảng thời gian khác hoặc chờ cảm biến gửi dữ liệu.</EmptyState>}
      <div className="chart-footer"><span>{data.length} điểm đã tải · Tối đa 1.000 điểm · Asia/Ho_Chi_Minh</span>
        {data.length > 0 && <span>{dateTime(data[0].timestamp)} → {dateTime(data.at(-1).timestamp)}</span>}</div>
    </section>
    {!compact && <section className="panel flush"><div className="panel-padding"><SectionHeading title="Nhật ký dữ liệu chi tiết" /><p className="muted">Phân trang trong tập mẫu đã tải. Đối chiếu với ngưỡng hiện tại của node, không thay thế lịch sử cảnh báo.</p></div>
      {tableRows.length ? <div className="table-scroll"><table><thead><tr><th>Thời gian</th><th>Cảm biến</th><th>Đại lượng</th><th>Giá trị đo</th><th>Đối chiếu ngưỡng hiện tại</th></tr></thead><tbody>{tableRows.map((row) =>
        <tr key={row.timestamp}><td>{dateTime(row.timestamp)}</td><td>{selectedSensorId}</td><td>{metricName(metric)}</td><td><strong>{number(row.measurements[metric])} {unit}</strong></td><td>
          {metric === 'temperature' && Number.isFinite(device.alarmThresholdC) ? <Badge tone={row.measurements[metric] > device.alarmThresholdC ? 'danger' : 'neutral'}>{row.measurements[metric] > device.alarmThresholdC ? 'Vượt ngưỡng demo' : 'Chưa vượt ngưỡng demo'}</Badge> : '—'}</td></tr>)}</tbody></table></div>
        : <EmptyState title="Chưa có bản ghi" />}
      <div className="table-footer row-between"><span>{data.length ? `${actualPage * 10 + 1}–${Math.min((actualPage + 1) * 10, data.length)} / ${data.length} điểm đã tải` : '0 điểm'}</span>
        <div className="action-group"><button className="btn btn-secondary icon-button" aria-label="Trang dữ liệu trước" disabled={actualPage === 0} onClick={() => setPage(actualPage - 1)}><ChevronLeft size={16} /></button>
          <span>{actualPage + 1} / {pageCount}</span><button className="btn btn-secondary icon-button" aria-label="Trang dữ liệu sau" disabled={actualPage + 1 >= pageCount} onClick={() => setPage(actualPage + 1)}><ChevronRight size={16} /></button></div></div>
    </section>}
  </div>;
}
