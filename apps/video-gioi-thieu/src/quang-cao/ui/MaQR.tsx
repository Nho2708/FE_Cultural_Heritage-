import { useMemo } from 'react';
import QRCode from 'qrcode';

/** Mã QR vẽ bằng SVG (một đường path), mức sửa lỗi M. Không kèm vùng trắng quanh mã: thẻ chứa mã lo phần đó. */
export function MaQR({ noiDung, canh, mau }: { noiDung: string; canh: number; mau: string }) {
  const { n, d } = useMemo(() => {
    const qr = QRCode.create(noiDung, { errorCorrectionLevel: 'M' });
    const n = qr.modules.size;
    let d = '';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (qr.modules.get(x, y)) d += `M${x} ${y}h1v1h-1z`;
      }
    }
    return { n, d };
  }, [noiDung]);
  return (
    <svg width={canh} height={canh} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges">
      <path d={d} fill={mau} />
    </svg>
  );
}
