import React, { useEffect, useRef } from 'react';
import { Chart, LineController, LineElement, PointElement, LinearScale, Tooltip } from 'chart.js';
import { dateTime, number } from '../lib/iot';
Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip);

export default function TelemetryChart({ rows, metric = 'temperature', unit = '°C', threshold, title = 'Diễn biến cảm biến' }) {
  const canvas = useRef(null);
  useEffect(() => {
    if (!canvas.current || !rows.length) return;
    const points = [];
    let previous;
    for (const row of rows) {
      const value = row.measurements?.[metric];
      if (!Number.isFinite(value)) continue;
      if (previous && row.timestamp - previous > 20000) points.push({ x: previous + 1, y: null });
      points.push({ x: row.timestamp, y: value });
      previous = row.timestamp;
    }
    const color = metric === 'temperature' ? '#a64b2a' : '#2b6a91';
    const thresholdPlugin = {
      id: 'alarmThreshold',
      afterDraw(chart) {
        if (metric !== 'temperature' || !Number.isFinite(threshold) || !points.length) return;
        const { ctx, chartArea, scales } = chart;
        const y = scales.y.getPixelForValue(threshold);
        if (y < chartArea.top || y > chartArea.bottom) return;
        ctx.save(); ctx.strokeStyle = '#b42318'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(chartArea.left, y); ctx.lineTo(chartArea.right, y); ctx.stroke();
        ctx.fillStyle = '#b42318'; ctx.font = '12px Segoe UI, sans-serif';
        ctx.fillText(`Ngưỡng hiện tại (demo) ${number(threshold)} °C`, chartArea.left + 5, y - 7); ctx.restore();
      },
    };
    const chart = new Chart(canvas.current, {
      type: 'line', data: { datasets: [{ data: points, borderColor: color, borderWidth: 2, pointRadius: points.filter((p) => p.y !== null).length === 1 ? 3 : 0,
        pointHoverRadius: 4, spanGaps: false, tension: 0, parsing: false }] },
      plugins: [thresholdPlugin], options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        plugins: { tooltip: { displayColors: false, callbacks: { title: (items) => dateTime(items[0]?.parsed.x), label: (item) => `${number(item.parsed.y)} ${unit}` } } },
        scales: {
          x: { type: 'linear', min: points.length ? points[0].x - 1000 : undefined, max: points.length ? points.at(-1).x + 1000 : undefined,
            grid: { color: '#eef1ec' }, ticks: { color: '#566159', maxTicksLimit: 6, maxRotation: 0,
              callback: (value) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', ...(rows.at(-1).timestamp - rows[0].timestamp > 86400000 ? { day: '2-digit', month: '2-digit' } : {}) }) } },
          y: { grid: { color: '#e6ebe5' }, ticks: { color: '#566159', callback: (value) => `${number(value)} ${unit}` },
            ...(metric === 'temperature' && Number.isFinite(threshold) ? { suggestedMax: threshold + 1 } : {}) },
        },
      },
    });
    return () => chart.destroy();
  }, [rows, metric, unit, threshold]);
  return <div className="chart-container"><canvas ref={canvas} role="img" aria-label={title}>Biểu đồ {title}. Dữ liệu chi tiết trong bảng bên dưới.</canvas></div>;
}
