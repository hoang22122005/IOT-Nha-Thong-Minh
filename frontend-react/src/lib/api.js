export async function api(path, options = {}) {
  const response = await fetch(`/api/iot/v1${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    signal: options.signal || AbortSignal.timeout(15000),
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { throw new Error('Máy chủ trả về dữ liệu không hợp lệ.'); }
  if (!response.ok) throw new Error(data?.error || data?.message || `Yêu cầu thất bại (HTTP ${response.status}).`);
  return data;
}
