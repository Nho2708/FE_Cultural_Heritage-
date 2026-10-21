import { random } from 'remotion';

/**
 * Biên độ giọng đọc tại khung k: mỗi âm tiết 4–8 khung, mạnh nhẹ ngẫu nhiên nhưng cố định theo hạt giống,
 * thỉnh thoảng có quãng nghỉ giữa hai cụm từ. Cùng khung luôn ra cùng giá trị nên video dựng lại không đổi.
 */
function bienDo(k: number): number {
  if (k < 0) return 0;
  const cum = Math.floor(k / 22);
  if (random(`nghi-${cum}`) < 0.2 && k % 22 > 14) return 0.06;
  const amTiet = Math.floor(k / 6);
  const dai = 4 + Math.floor(random(`dai-${amTiet}`) * 5);
  const pha = (k % 6) / dai;
  const manh = 0.35 + 0.65 * random(`manh-${amTiet}`);
  return Math.max(0.08, manh * Math.sin(Math.PI * Math.min(1, pha)));
}

/**
 * Sóng âm chạy từ phải sang trái: vạch ngoài cùng bên phải là âm đang đọc, các vạch bên trái là các khung trước đó.
 * `f` là khung tuyệt đối của video (để sóng nối liền giữa các cảnh), `mo` (0→1) làm sóng dâng lên khi bắt đầu phát.
 */
export function SongAm({ f, rong, cao, soVach = 40, mau, mauPhu, mo = 1 }: { f: number; rong: number; cao: number; soVach?: number; mau: string; mauPhu?: string; mo?: number }) {
  const buoc = rong / soVach;
  const day = buoc * 0.56;
  return (
    <svg width={rong} height={cao} viewBox={`0 0 ${rong} ${cao}`}>
      {Array.from({ length: soVach }, (_, i) => {
        const k = f - (soVach - 1 - i) * 2;
        const lamMin = (bienDo(k) + bienDo(k - 1)) / 2;
        const h = Math.max(day, cao * lamMin * mo);
        return <rect key={i} x={i * buoc + (buoc - day) / 2} y={(cao - h) / 2} width={day} height={h} rx={day / 2} fill={mauPhu && i < soVach * 0.35 ? mauPhu : mau} />;
      })}
    </svg>
  );
}
