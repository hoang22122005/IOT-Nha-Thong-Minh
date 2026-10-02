import React, { useEffect, useRef, useState } from 'react';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { LineChart as ChartIcon } from 'lucide-react';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  Tooltip,
  Legend,
);

const GAP_MS = 20_000;
const MIN_VISIBLE_MS = 120_000;

function toTimeSeries(rows, readValue) {
  const points = [];
  let previousTime = null;
  for (const row of rows) {
    const x = Number(row.timestamp);
    const value = readValue(row);
    if (!Number.isFinite(x) || value == null || !Number.isFinite(Number(value))) continue;
    if (previousTime != null && x - previousTime > GAP_MS) {
      points.push({ x: previousTime + 1, y: null });
    }
    points.push({ x, y: Number(value) });
    previousTime = x;
  }
  return points;
}

const RANGES = [
  { id: '1h', label: '1 giờ' },
  { id: '6h', label: '6 giờ' },
  { id: '24h', label: '24 giờ' },
  { id: '7d', label: '7 ngày' },
];

export default function TelemetryChart({ telemetryHistory, historyRange = '24h', onRangeChange,
  sensors = {}, selectedSensorId, onSensorChange }) {
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const previousPointCountRef = useRef(0);
  const [selectedMetric, setSelectedMetric] = useState('climate');
  const extraMetrics = [...new Set(telemetryHistory.flatMap((row) => Object.keys(row.measurements || {})))]
    .filter((name) => !['temperature', 'humidity'].includes(name));
  const hasClimate = telemetryHistory.some((row) => row.temperature != null || row.humidity != null);
  const chartMetric = selectedMetric === 'climate'
    ? (hasClimate ? 'climate' : extraMetrics[0] || 'climate')
    : (extraMetrics.includes(selectedMetric) ? selectedMetric : hasClimate ? 'climate' : extraMetrics[0] || 'climate');
  const isClimate = chartMetric === 'climate';
  const metricUnit = telemetryHistory.find((row) => row.units?.[chartMetric])?.units?.[chartMetric] || '';

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: isClimate ? [
          {
            label: 'Nhiệt độ (°C)',
            data: [],
            borderColor: '#f97316',
            backgroundColor: 'rgba(249, 115, 22, 0.1)',
            borderWidth: 2.5,
            pointBackgroundColor: '#f97316',
            pointRadius: 0,
            pointHoverRadius: 5,
            tension: 0.25,
            fill: false,
            yAxisID: 'yTemp',
          },
          {
            label: 'Độ ẩm (%)',
            data: [],
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.08)',
            borderWidth: 2.5,
            pointBackgroundColor: '#06b6d4',
            pointRadius: 0,
            pointHoverRadius: 5,
            tension: 0.25,
            fill: false,
            yAxisID: 'yHum',
          },
        ] : [{
          label: `${chartMetric.replaceAll('_', ' ')} ${metricUnit ? `(${metricUnit})` : ''}`,
          data: [],
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.1)',
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 5,
          tension: 0.25,
          fill: false,
          yAxisID: 'yExtra',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 280, easing: 'easeOutCubic' },
        parsing: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#94a3b8',
              font: {
                family: "'Outfit', sans-serif",
                size: 12,
                weight: '500',
              },
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 8,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#f8fafc',
            bodyColor: '#e2e8f0',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 10,
            boxPadding: 6,
            usePointStyle: true,
            titleFont: { family: "'JetBrains Mono', monospace" },
            bodyFont: { family: "'Outfit', sans-serif" },
            callbacks: {
              title: (items) => items.length
                ? new Date(items[0].parsed.x).toLocaleString('vi-VN')
                : '',
            },
          },
        },
        scales: {
          x: {
            type: 'linear',
            grid: {
              color: 'rgba(255, 255, 255, 0.04)',
            },
            ticks: {
              color: '#64748b',
              font: {
                family: "'JetBrains Mono', monospace",
                size: 10,
              },
              maxRotation: 0,
              maxTicksLimit: 8,
              callback(value) {
                const options = this.max - this.min > 86_400_000
                  ? { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }
                  : { hour: '2-digit', minute: '2-digit', second: '2-digit' };
                return new Date(value).toLocaleString('vi-VN', options);
              },
            },
          },
          yTemp: {
            display: isClimate,
            type: 'linear',
            position: 'left',
            grid: {
              color: 'rgba(255, 255, 255, 0.04)',
            },
            ticks: {
              color: '#f97316',
              font: {
                family: "'JetBrains Mono', monospace",
                size: 11,
              },
              callback: (value) => `${value}°C`,
            },
            suggestedMin: 20,
            suggestedMax: 45,
          },
          yHum: {
            display: isClimate,
            type: 'linear',
            position: 'right',
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              color: '#06b6d4',
              font: {
                family: "'JetBrains Mono', monospace",
                size: 11,
              },
              callback: (value) => `${value}%`,
            },
            suggestedMin: 30,
            suggestedMax: 100,
          },
          yExtra: {
            display: !isClimate,
            type: 'linear',
            position: 'left',
            ticks: { color: '#38bdf8', callback: (value) => `${value} ${metricUnit}` },
          },
        },
      },
    });

    const chart = chartInstanceRef.current;
    previousPointCountRef.current = 0;
    return () => {
      chart.destroy();
      if (chartInstanceRef.current === chart) chartInstanceRef.current = null;
    };
  }, [chartMetric, metricUnit, isClimate]);

  useEffect(() => {
    const chart = chartInstanceRef.current;
    if (!chart) return;
    if (isClimate) {
      chart.data.datasets[0].data = toTimeSeries(telemetryHistory, (item) => item.temperature);
      chart.data.datasets[1].data = toTimeSeries(telemetryHistory, (item) => item.humidity);
    } else {
      chart.data.datasets[0].data = toTimeSeries(
        telemetryHistory, (row) => row.measurements?.[chartMetric]
      );
    }
    const times = telemetryHistory.map((row) => Number(row.timestamp)).filter(Number.isFinite);
    if (times.length) {
      const first = Math.min(...times);
      const last = Math.max(...times);
      chart.options.scales.x.min = last - Math.max(last - first, MIN_VISIBLE_MS);
      chart.options.scales.x.max = last + 10_000;
    } else {
      delete chart.options.scales.x.min;
      delete chart.options.scales.x.max;
    }
    // A live point moves smoothly. A history load or range switch is drawn
    // immediately so hundreds of old points do not animate across the canvas.
    const countChange = telemetryHistory.length - previousPointCountRef.current;
    chart.update(countChange < 0 || countChange > 2 ? 'none' : undefined);
    previousPointCountRef.current = telemetryHistory.length;
  }, [telemetryHistory, chartMetric, isClimate]);

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ChartIcon size={20} color="#38bdf8" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            Lịch sử và dữ liệu realtime cảm biến
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {Object.keys(sensors).length > 1 && <select value={selectedSensorId || ''}
            onChange={(event) => onSensorChange?.(event.target.value)} aria-label="Chọn cảm biến"
            style={{ padding: 6, borderRadius: 6 }}>
            {Object.keys(sensors).map((sensorId) => <option key={sensorId} value={sensorId}>{sensorId}</option>)}
          </select>}
          {extraMetrics.length > 0 && <select value={chartMetric} onChange={(event) => setSelectedMetric(event.target.value)}
            aria-label="Chọn giá trị đo" style={{ padding: 6, borderRadius: 6 }}>
            {hasClimate && <option value="climate">Nhiệt độ / độ ẩm</option>}
            {extraMetrics.map((name) => <option key={name} value={name}>{name.replaceAll('_', ' ')}</option>)}
          </select>}
          <div role="group" aria-label="Khoảng thời gian lịch sử" style={{ display: 'flex', gap: 4 }}>
            {RANGES.map((range) => (
              <button
                key={range.id}
                type="button"
                className={`btn ${historyRange === range.id ? 'btn-primary' : 'btn-secondary'}`}
                aria-pressed={historyRange === range.id}
                onClick={() => onRangeChange?.(range.id)}
                style={{ padding: '6px 9px', fontSize: '0.72rem' }}
              >
                {range.label}
              </button>
            ))}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Tối đa {telemetryHistory.length} điểm gần nhất (MongoDB + realtime)
          </span>
        </div>
      </div>

      <div style={{ height: '280px', position: 'relative' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
