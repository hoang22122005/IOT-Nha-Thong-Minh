import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

let server;
before(async () => { server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' }); });
after(async () => { await server?.close(); });
const render = async (file, props = {}) => {
  const module = await server.ssrLoadModule(`/src/${file}.jsx`);
  return renderToStaticMarkup(React.createElement(module.default, props));
};
const device = { deviceId: 'test-node', roomId: 'test-room', online: false, ledState: 'OFF', ledColor: '#000000', actuators: ['LED', 'BUZZER'],
  sensors: { dht: { measurements: { temperature: 0, humidity: 60 }, lastSeenAt: 1000 } } };

test('overview renders navigation, reconnect state and no invented devices', async () => {
  const html = await render('App');
  assert.match(html, /Nhà của tôi/);
  assert.match(html, /Phòng &amp; thiết bị/);
  assert.match(html, /Đang kết nối lại/);
  assert.match(html, /Chưa nhận được thiết bị/);
  assert.doesNotMatch(html, /esp32-room-02|Phòng khách|174 kB/);
});
test('device controls stay disabled offline and use real reported switch state', async () => {
  const html = await render('components/ControlPanel', { deviceState: device, isConnected: true, commandFeedback: {} });
  assert.match(html, /Thiết bị offline/);
  assert.match(html, /role="switch" aria-checked="false"[^>]*disabled/);
  assert.match(html, /test-node/);
});
test('sensor screen renders zero and the sample provenance', async () => {
  const html = await render('components/SensorMetrics', { device, sensorId: 'dht', connected: true });
  assert.match(html, /0 <small>°C/);
  assert.match(html, /Thiết bị offline/);
});
test('alerts keep active and acknowledged badges visible together', async () => {
  const html = await render('components/AlertsPanel', { alerts: [{ alertId: 'alert-a', deviceId: 'test-node', active: true, acknowledged: true, temperature: 34 }], devices: { 'test-node': device }, connected: true });
  assert.match(html, /Đang diễn ra/);
  assert.match(html, /Đã xem/);
  assert.doesNotMatch(html, /Đã xem \(ACK\)/);
});
test('scene and automation screens render honest disconnected empty states', async () => {
  for (const name of ['ScenePanel', 'AutomationPanel']) {
    const html = await render(`components/${name}`, { devices: {}, selectedDeviceId: '', connected: false });
    assert.match(html, /Chờ kết nối máy chủ/);
    assert.match(html, /disabled/);
  }
});
test('history presents a zero sample and only loaded-data statistics', async () => {
  const html = await render('components/HistoryPanel', { iot: { deviceState: device, deviceStates: { 'test-node': device }, selectedDeviceId: 'test-node', selectedSensorId: 'dht',
    telemetryHistory: [{ timestamp: 1000, measurements: { temperature: 0 }, units: {} }], historyRange: '24h', historyLoading: false, historyError: '', isConnected: true } });
  assert.match(html, /mẫu đã tải/);
  assert.match(html, /Tối đa 1.000 điểm/);
  assert.match(html, /Asia\/Ho_Chi_Minh/);
  assert.match(html, /1–1 \/ 1 điểm đã tải/);
});
