import React from 'react';
import { Droplets, Radio, Thermometer } from 'lucide-react';
import { SectionHeading, DataAge, EmptyState } from './ui';
import { metricName, metricUnit, number, sensorFor } from '../lib/iot';

export default function SensorMetrics({ device, sensorId, onSensorChange, connected }) {
  const sensor = sensorFor(device, sensorId);
  const measurements = Object.entries(sensor.measurements || {}).filter(([, value]) => Number.isFinite(value));
  return <section className="panel"><SectionHeading title="Thông số cảm biến" icon={Radio}>
    {Object.keys(device.sensors || {}).length > 0 && <select aria-label="Cảm biến đang xem" value={sensorId} onChange={(e) => onSensorChange(e.target.value)}>
      {Object.keys(device.sensors).map((id) => <option key={id} value={id}>{id}</option>)}</select>}
  </SectionHeading>
    {measurements.length ? <div className="sensor-grid">{measurements.map(([name, value]) => {
      const Icon = name === 'temperature' ? Thermometer : name === 'humidity' ? Droplets : Radio;
      return <div className={`sensor-tile ${name}`} key={name}><div className="row-between"><span>{metricName(name)}</span><Icon size={21} /></div>
        <p className="metric-value">{number(value)} <small>{metricUnit(name, sensor.units)}</small></p>
        <p className="muted">{name === 'temperature' && Number.isFinite(device.alarmThresholdC)
          ? `Ngưỡng báo động tại node: > ${number(device.alarmThresholdC)} °C (demo)` : sensorId}</p>
      </div>;
    })}</div> : <EmptyState title="Chưa có dữ liệu cảm biến">Node này chưa gửi mẫu đo cho cảm biến đang chọn.</EmptyState>}
    <div className="sample-footer"><DataAge timestamp={sensor.lastSeenAt} online={device.online} connected={connected} /></div>
  </section>;
}
