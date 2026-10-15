import { interpolate } from 'remotion';
import { DO_TRUOT_CHU } from '../nhip';
import { phongTheoMa } from '../phong';
import { BieuTuongQuaCau, BieuTuongTamDung } from './BieuTuong';
import { MAU_APP } from './mau-app';
import { SongAm } from './SongAm';

export interface NgonNguNghe {
  ma: string;
  ten: string;
}

/**
 * Chip ngôn ngữ đang nghe. Đổi ngôn ngữ thì chữ cũ trượt lên rồi mất, chữ mới trượt lên vào chỗ.
 * `i` là chỉ số ngôn ngữ hiện tại, `t` (0→1) là tiến độ đổi từ ngôn ngữ trước sang ngôn ngữ `i`.
 */
export function ChipNgonNgu({ ds, i, t, co }: { ds: NgonNguNghe[]; i: number; t: number; co: number }) {
  const truoc = i > 0 ? ds[i - 1] : null;
  const nhan = (n: NgonNguNghe, y: number, mo: number) => (
    <div style={{ position: 'absolute', left: 0, top: 0, height: co * 1.5, display: 'flex', alignItems: 'center', fontFamily: phongTheoMa(n.ma), fontWeight: 500, fontSize: co, color: MAU_APP.chu, whiteSpace: 'nowrap', transform: `translateY(${y}px)`, opacity: mo }}>
      {n.ten}
    </div>
  );
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: co * 0.45, height: co * 2.1, padding: `0 ${co * 0.8}px 0 ${co * 0.6}px`, borderRadius: 999, backgroundColor: MAU_APP.be, border: `2px solid ${MAU_APP.vien}`, boxShadow: '0 6px 20px rgba(42,35,28,0.08)' }}>
      <BieuTuongQuaCau canh={co * 0.95} mau={MAU_APP.son} />
      <div style={{ position: 'relative', height: co * 1.5, width: co * 4.2, overflow: 'hidden' }}>
        {truoc && t < 1 ? nhan(truoc, -t * DO_TRUOT_CHU, 1 - t) : null}
        {nhan(ds[i], truoc ? (1 - t) * DO_TRUOT_CHU : 0, truoc ? t : 1)}
      </div>
    </div>
  );
}


/**
 * Bảng nghe thuyết minh dựng lại theo hộp "Tóm tắt và nghe" của app: chip ngôn ngữ, sóng âm, nút tạm dừng và thanh tiến trình,
 * các câu đang đọc vẽ thành vạch (câu đang đọc được tô như trong app). Không có chữ ngoài tên ngôn ngữ.
 * `f` là khung tuyệt đối (sóng nối liền giữa các cảnh), `tienTrinh` 0→1, `cauDangDoc` là chỉ số câu đang tô (có thể lẻ khi đang chuyển).
 */
export function BangNghe({ f, rong, ds, iNgonNgu, tDoi, tienTrinh, cauDangDoc, moSong = 1 }: { f: number; rong: number; ds: NgonNguNghe[]; iNgonNgu: number; tDoi: number; tienTrinh: number; cauDangDoc: number; moSong?: number }) {
  // Lề phải rộng hơn lề trái: cột nút của mạng xã hội nằm sát mép phải.
  const le = 90;
  const lePhai = 140;
  const trong = rong - le - lePhai;
  const cau = [1, 0.9, 0.68];
  const caoCau = 26;
  const khoangCau = 30;
  const yTo = cauDangDoc * (caoCau + khoangCau);
  return (
    <div style={{ position: 'relative', width: rong, padding: `56px ${lePhai}px 0 ${le}px`, boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', top: 22, left: rong / 2 - 36, width: 72, height: 8, borderRadius: 4, backgroundColor: MAU_APP.vienDam }} />
      <ChipNgonNgu ds={ds} i={iNgonNgu} t={tDoi} co={40} />
      <div style={{ marginTop: 44 }}>
        <SongAm f={f} rong={trong} cao={200} soVach={36} mau={MAU_APP.son} mauPhu="#E07E76" mo={moSong} />
      </div>
      <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 34 }}>
        <div style={{ width: 128, height: 128, borderRadius: '50%', backgroundColor: MAU_APP.son, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 26px rgba(164,35,31,0.32)' }}>
          <BieuTuongTamDung canh={56} mau="#fff" />
        </div>
        <div style={{ position: 'relative', flex: 1, height: 12, borderRadius: 6, backgroundColor: MAU_APP.vien }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${tienTrinh * 100}%`, borderRadius: 6, backgroundColor: MAU_APP.son }} />
          <div style={{ position: 'absolute', top: -10, left: `calc(${tienTrinh * 100}% - 16px)`, width: 32, height: 32, borderRadius: '50%', backgroundColor: '#fff', border: `4px solid ${MAU_APP.son}` }} />
        </div>
      </div>
      <div style={{ position: 'relative', marginTop: 54 }}>
        <div style={{ position: 'absolute', left: -22, right: -22, top: yTo - 14, height: caoCau + 28, borderRadius: 14, backgroundColor: MAU_APP.vangNhat, borderLeft: `6px solid ${MAU_APP.son}` }} />
        {cau.map((r, k) => (
          <div key={k} style={{ position: 'relative', width: trong * r, height: caoCau, marginBottom: khoangCau, borderRadius: caoCau / 2, backgroundColor: interpolate(Math.abs(cauDangDoc - k), [0, 1], [1, 0], { extrapolateRight: 'clamp' }) > 0.5 ? '#C9A97A' : MAU_APP.vien }} />
        ))}
      </div>
    </div>
  );
}
