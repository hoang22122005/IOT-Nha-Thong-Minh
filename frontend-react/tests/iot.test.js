import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDevice, mergeHistory, updateAlerts, commandMatches, csvText, sensorFor } from '../src/lib/iot.js';

test('heartbeat keeps the actual sample time and previous readings, including zero', () => {
  const initial = normalizeDevice({ deviceId: 'node-a', sensorId: 'dht-a', temperature: 0, humidity: 0,
    sensors: { 'dht-a': { measurements: { temperature: 0, humidity: 0 }, lastSeenAt: 1000 } }, lastSeenAt: 2000 });
  const heartbeat = normalizeDevice({ type: 'TELEMETRY', deviceId: 'node-a', sensorId: 'dht-a', temperature: null, humidity: null,
    measurements: {}, timestamp: 5000, online: true, ledState: 'OFF' }, initial);
  assert.equal(heartbeat.temperature, 0);
  assert.equal(heartbeat.humidity, 0);
  assert.equal(sensorFor(heartbeat, 'dht-a').lastSeenAt, 1000);
  assert.equal(heartbeat.lastSeenAt, 5000);
  assert.equal(heartbeat.reportVersion, 1);
});

test('snapshot does not leak aggregate measurements between different sensors', () => {
  const device = normalizeDevice({ sensorId: 'soil', measurements: { temperature: 29, moisture: 60 },
    sensors: { climate: { measurements: { temperature: 29 }, lastSeenAt: 100 }, soil: { measurements: { moisture: 60 }, lastSeenAt: 200 } } });
  assert.deepEqual(device.sensors.soil.measurements, { moisture: 60 });
  const next = normalizeDevice({ type: 'TELEMETRY', sensorId: 'climate', measurements: { temperature: 30 }, timestamp: 300 }, device);
  assert.equal(next.sensors.climate.measurements.temperature, 30);
  assert.equal(next.sensors.soil.lastSeenAt, 200);
});

test('offline and capability events preserve active danger and sensor timestamps', () => {
  const state = normalizeDevice({ alertState: 'CRITICAL', sensors: { dht: { lastSeenAt: 100, measurements: { temperature: 34 } } } });
  const offline = normalizeDevice({ type: 'NODE_STATUS_CHANGED', online: false, timestamp: 9999 }, state);
  assert.equal(offline.fireDanger, 'CRITICAL');
  assert.equal(offline.sensors.dht.lastSeenAt, 100);
  assert.equal(offline.online, false);
});

test('ACK never clears an active alert; clear is scoped to the correct node', () => {
  const rows = [{ alertId: 'a', deviceId: 'one', active: true, acknowledged: false }, { alertId: 'b', deviceId: 'two', active: true }];
  const acked = updateAlerts(rows, { type: 'ALERT_ACK', alertId: 'a' });
  assert.equal(acked[0].active, true);
  assert.equal(acked[0].acknowledged, true);
  const cleared = updateAlerts(acked, { type: 'ALERT_CLEARED', deviceId: 'one' });
  assert.equal(cleared[0].active, false);
  assert.equal(cleared[1].active, true);
  assert.equal(rows[0].acknowledged, false);
});

test('history discards heartbeat-only rows, sorts, deduplicates and bounds the sample count', () => {
  const rows = mergeHistory([{ timestamp: 3, measurements: { temperature: 1 } }, { timestamp: 1, temperature: 22 },
    { timestamp: 3, measurements: { temperature: 0 } }, { timestamp: 2, measurements: {} }, { timestamp: 4, measurements: { temperature: null } }], 2);
  assert.deepEqual(rows.map((row) => row.timestamp), [3]);
  assert.equal(rows[0].measurements.temperature, 0);
  const many = mergeHistory(Array.from({ length: 1100 }, (_, index) => ({ timestamp: index + 1, humidity: 50 })), 0);
  assert.equal(many.length, 1000);
  assert.equal(many[0].timestamp, 101);
});

test('LED confirmation needs a newer report and the requested color, preserving zero channels', () => {
  const command = { target: 'LED', action: 'ON', rgb: [255, 0, 0], reportVersion: 4 };
  assert.equal(commandMatches({ reportVersion: 4, ledState: 'ON', ledColor: '#FF0000' }, command), false);
  assert.equal(commandMatches({ reportVersion: 5, ledState: 'ON', ledColor: '#00FF00' }, command), false);
  assert.equal(commandMatches({ reportVersion: 5, ledState: 'ON', ledColor: '#FF0000' }, command), true);
  assert.equal(commandMatches({ reportVersion: 6, buzzerState: false }, { target: 'BUZZER', action: 'OFF', reportVersion: 5 }), true);
});

test('CSV supports Vietnamese, quotes and formula-safe user labels', () => {
  const csv = csvText(['Tên', 'Giá trị'], [['Phòng "khách"', 0], ['=HYPERLINK("url")', 20]]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"Phòng ""khách""","0"'));
  assert.ok(csv.includes('"\'=HYPERLINK'));
});
