/**
 * Dấu ngón tay chạm màn hình (vòng trắng mờ có viền, như bản quay màn hình có bật hiển thị chạm), tâm (x, y) px.
 * `tVao` 0→1 khi ngón đặt xuống (vòng thu nhỏ về đúng cỡ và hiện rõ), `tRa` 0→1 khi ngón nhấc lên (vòng nở ra và mờ đi).
 */
export function NgonTay({ x, y, tVao, tRa, canh = 96 }: { x: number; y: number; tVao: number; tRa: number; canh?: number }) {
  if (tVao <= 0 || tRa >= 1) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - canh / 2,
        top: y - canh / 2,
        width: canh,
        height: canh,
        boxSizing: 'border-box',
        borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.5)',
        border: `${canh * 0.03}px solid rgba(255,255,255,0.85)`,
        boxShadow: '0 8px 24px rgba(20,21,28,0.28)',
        opacity: tVao * (1 - tRa),
        transform: `scale(${1.25 - 0.25 * tVao + 0.2 * tRa})`,
      }}
    />
  );
}
