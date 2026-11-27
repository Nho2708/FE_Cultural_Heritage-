import type { ReactNode } from 'react';
import { AbsoluteFill, Html5Audio, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import kichBan from '../kich-ban/nha-truong.json';
import { FPS, MAU, PHONG_CHU, PHONG_TIEU_DE, expoOut, mo, phong } from './brand';
import { Canh, DienThoai, KhoiChu, LatMai, Nen, TrinhDuyet, chonAnh, useVao, type ManMayTinh } from './khung';
import { BieuTuong, ChuDiViet, GOC_PHONG_LOGO, LogoChuyenDong } from './Logo';
import { coNhac } from './vi-tri';
import giongDoc from './giong-doc.json';
import vungPhong from './vung-nha-truong.json';

type ChuCanh = [string, string];
const CHU = kichBan.chu.vi as unknown as Record<string, ChuCanh | string | string[]>;
const VUNG = vungPhong as unknown as Record<string, [number, number, number, number]>;
const kep = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const P = phong('vi');

/** Các đoạn lời đọc có tệp âm thanh (scripts/tao-giong-doc.py): id cảnh, khung bắt đầu, khung kết thúc. */
const LOI_DOC = Object.entries(giongDoc as Record<string, { batDau: number; dai: number }>)
  .map(([id, { batDau, dai }]) => ({ id, tep: `giong/nha-truong/${id}.wav`, tu: Math.round(batDau * FPS), den: Math.round((batDau + dai) * FPS) }))
  .filter((doan) => coNhac(doan.tep));

/** Nhạc nền hạ xuống khoảng 30% khi đang có lời đọc (lên xuống trong 300 ms). */
function mucNhac(f: number) {
  const ha = LOI_DOC.reduce((lon, doan) => Math.max(lon, interpolate(f, [doan.tu - 9, doan.tu, doan.den, doan.den + 9], [0, 1, 1, 0], kep)), 0);
  return 1 - 0.7 * ha;
}

const a = (...ten: string[]) => chonAnh(...ten.map((t) => `man-hinh/nha-truong/${t}.png`));
/** Một ảnh máy tính, phóng tới vùng đã đo lúc chụp (nếu có). */
const man = (ten: string[], tu: number, nhip?: [number, number]): ManMayTinh => {
  const anh = a(...ten);
  const khoa = anh?.split('/').pop()?.replace('.png', '') ?? '';
  return { anh, tu, vung: nhip ? VUNG[khoa] : undefined, nhip };
};

/** Video 90 giây cho nhà trường: chữ trên hình tiếng Việt, xem hiểu được khi tắt tiếng. */
export function NhaTruong() {
  const ds = kichBan.canh;
  const tong = ds[ds.length - 1].den * FPS;
  const nhac = 'nhac/nha-truong-90s.wav';
  return (
    <Nen>
      {ds.map((canh, i) => {
        const cuoi = i === ds.length - 1;
        const dai = (canh.den - canh.tu) * FPS + (cuoi ? 0 : 8);
        return (
          <Sequence key={canh.id} from={canh.tu * FPS} durationInFrames={dai} name={canh.id}>
            <Canh dai={dai} ra={cuoi ? 12 : 8}>
              <NoiDung id={canh.id} dai={dai} />
            </Canh>
          </Sequence>
        );
      })}
      <LatMai tu={ds.find((c) => c.id === 'ket')!.tu * FPS - 8} />
      {coNhac(nhac) ? <Html5Audio src={staticFile(nhac)} volume={(f) => interpolate(f, [0, 15, tong - 45, tong], [0, 0.85, 0.85, 0], kep) * mucNhac(f)} /> : null}
      {LOI_DOC.map((doan) => (
        <Sequence key={doan.id} from={doan.tu} durationInFrames={doan.den - doan.tu + 6} name={`loi-${doan.id}`}>
          <Html5Audio src={staticFile(doan.tep)} />
        </Sequence>
      ))}
    </Nen>
  );
}

function HaiCot({ chu, hinh }: { chu: ReactNode; hinh: ReactNode }) {
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 110, top: 0, bottom: 0, width: 560, display: 'flex', alignItems: 'center' }}>{chu}</div>
      <div style={{ position: 'absolute', left: 710, right: 90, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{hinh}</div>
    </AbsoluteFill>
  );
}

function Chu({ id, them }: { id: string; them?: ReactNode }) {
  const [tieuDe, phu] = CHU[id] as ChuCanh;
  return (
    <div>
      <KhoiChu tieuDe={tieuDe} phu={phu} phong={P} rong={560} coTieuDe={58} coPhu={32} />
      {them}
    </div>
  );
}

function TrinhDuyetVao({ man: ds, rong = 1120 }: { man: ManMayTinh[]; rong?: number }) {
  const vao = useVao(2, 50, 26);
  return (
    <div style={vao}>
      <TrinhDuyet rong={rong} man={ds} ten="DiViet" style={{ fontFamily: PHONG_CHU }} />
    </div>
  );
}

function NoiDung({ id, dai }: { id: string; dai: number }) {
  const f = useCurrentFrame();
  switch (id) {
    case 'logo': {
      const zoom = interpolate(f, [70, dai], [1, 7], { ...kep, easing: (t) => t * t * t });
      return (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ transform: `scale(${zoom})`, transformOrigin: GOC_PHONG_LOGO, opacity: interpolate(f, [84, dai], [1, 0], kep) }}>
            <LogoChuyenDong canh={600} />
          </div>
        </AbsoluteFill>
      );
    }
    case 'cau-hoi':
      return <CauHoi />;
    case 'vai-tro':
      return <HaiCot chu={<Chu id={id} them={<ChuoiVaiTro />} />} hinh={<TrinhDuyetVao man={[man(['01-giao-vien', '02-lop-hoc'], 0), man(['02-lop-hoc', '01-giao-vien'], 120)]} />} />;
    case 'lop-hoc':
      return <HaiCot chu={<Chu id={id} />} hinh={<TrinhDuyetVao man={[man(['03-chi-tiet-lop', '02-lop-hoc'], 0, [30, 120]), man(['04-phieu-dang-nhap', '03-chi-tiet-lop'], 150, [170, 280])]} />} />;
    case 'soan-bai':
      return <HaiCot chu={<Chu id={id} />} hinh={<TrinhDuyetVao man={[man(['05-soan-bai-hoc'], 0, [40, 190]), man(['06-nho-ai-soan', '05-soan-bai-hoc'], 220, [240, 400])]} />} />;
    case 'kiem-tra':
      return (
        <HaiCot
          chu={<Chu id={id} />}
          hinh={
            <TrinhDuyetVao
              man={[
                man(['07-ngan-hang-cau-hoi'], 0, [20, 70]),
                man(['08-duyet-cau-ai', '07-ngan-hang-cau-hoi'], 80),
                man(['09-soan-bai-kiem-tra', '07-ngan-hang-cau-hoi'], 150),
                man(['10-ma-bai-hoc', '09-soan-bai-kiem-tra'], 220, [230, 290]),
              ]}
            />
          }
        />
      );
    case 'ba-cap':
      return <BaCap />;
    case 'ket-qua':
      return <HaiCot chu={<Chu id={id} them={<CotBieuDo />} />} hinh={<TrinhDuyetVao man={[man(['14-ket-qua-lop'], 0, [40, 140]), man(['15-ho-so-hoc-sinh', '14-ket-qua-lop'], 160, [180, 290])]} />} />;
    case 'hai-noi':
      return <HaiNoi />;
    case 'ket':
      return <TheKet />;
    default:
      return null;
  }
}

/** Câu hỏi mở đầu, các trang giáo án bay vào xếp thành chồng rồi hóa thành biểu tượng mái đình. */
function CauHoi() {
  const f = useCurrentFrame();
  const [tieuDe, phu] = CHU['cau-hoi'] as ChuCanh;
  const cong = interpolate(f, [120, 170], [0, 1], { ...kep, easing: expoOut });
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 110, top: 0, bottom: 0, width: 900, display: 'flex', alignItems: 'center' }}>
        <KhoiChu tieuDe={tieuDe} phu={phu} phong={P} rong={900} coTieuDe={68} coPhu={38} />
      </div>
      <div style={{ position: 'absolute', left: 1180, top: 300, width: 520, height: 520 }}>
        {[0, 1, 2, 3, 4, 5].map((k) => {
          const t = interpolate(f, [10 + k * 8, 34 + k * 8], [0, 1], { ...kep, easing: expoOut });
          const an = 1 - cong;
          return (
            <div
              key={k}
              style={{
                position: 'absolute',
                left: 90 + (1 - t) * (k % 2 ? 380 : -320),
                top: 250 - k * 14 - (1 - t) * 260,
                width: 340,
                height: 220,
                borderRadius: 14,
                backgroundColor: k % 2 ? MAU.kem : '#EFE4D3',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                transform: `rotate(${(1 - t) * (k % 2 ? 24 : -18) + (k - 2.5) * 1.6}deg)`,
                opacity: t * (0.35 + 0.65 * an),
              }}
            >
              {[0, 1, 2, 3].map((d) => (
                <div key={d} style={{ margin: '26px 30px 0', height: 10, width: d === 0 ? 180 : 260 - d * 30, borderRadius: 5, backgroundColor: d === 0 ? MAU.son : 'rgba(41,43,56,0.25)' }} />
              ))}
            </div>
          );
        })}
        <BieuTuong rong={420} style={{ position: 'absolute', left: 50, top: 60, opacity: cong, transform: `translateY(${(1 - cong) * 60}px)` }} />
      </div>
    </AbsoluteFill>
  );
}

/** Bốn vai trò như bốn tầng mái, sáng lần lượt. */
function ChuoiVaiTro() {
  const f = useCurrentFrame();
  const vai = CHU.vai as string[];
  return (
    <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {vai.map((ten, k) => {
        const t = interpolate(f, [30 + k * 24, 46 + k * 24], [0, 1], { ...kep, easing: expoOut });
        return (
          <div key={ten} style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: k * 34, opacity: 0.3 + 0.7 * t }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, transform: 'rotate(45deg)', backgroundColor: t > 0.5 ? MAU.son : MAU.navyNhat, border: `3px solid ${MAU.vang}` }} />
            <div style={{ fontFamily: PHONG_CHU, fontWeight: 700, fontSize: 30, color: t > 0.5 ? MAU.kem : 'rgba(223,207,182,0.6)' }}>{ten}</div>
          </div>
        );
      })}
    </div>
  );
}

/** Ba khung cạnh nhau: cùng một di sản ở cấp 1, 2, 3. */
function BaCap() {
  const f = useCurrentFrame();
  const [tieuDe, phu] = CHU['ba-cap'] as ChuCanh;
  const nhan = CHU['nhan-cap'] as string[];
  const tieuDeVao = useVao(4);
  const phuVao = useVao(14, 24);
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 110, top: 70, width: 1700 }}>
        <div style={{ ...tieuDeVao, fontFamily: PHONG_TIEU_DE, fontWeight: 700, fontSize: 58, color: MAU.kem }}>{tieuDe}</div>
        <div style={{ ...phuVao, marginTop: 14, fontFamily: PHONG_CHU, fontWeight: 500, fontSize: 30, lineHeight: 1.45, color: 'rgba(255,255,255,0.92)' }}>{phu}</div>
      </div>
      <div style={{ position: 'absolute', left: 110, right: 110, top: 380, display: 'flex', gap: 40 }}>
        {['11-cap-1', '12-cap-2', '13-cap-3'].map((ten, k) => {
          const t = interpolate(f, [30 + k * 10, 60 + k * 10], [0, 1], { ...kep, easing: expoOut });
          return (
            <div key={ten} style={{ opacity: t, transform: `translateY(${(1 - t) * 60}px)` }}>
              <div style={{ fontFamily: PHONG_CHU, fontWeight: 700, fontSize: 34, color: k === 0 ? MAU.son : k === 1 ? MAU.vang : MAU.kem, marginBottom: 14 }}>{nhan[k]}</div>
              <TrinhDuyet rong={540} man={[{ anh: a(ten, `${ten}-trang-chu`), tu: 0, vung: VUNG[ten], nhip: [70, 380] }]} ten={nhan[k]} style={{ fontFamily: PHONG_CHU }} />
            </div>
          );
        })}
      </div>
      <Sao tu={90} />
    </AbsoluteFill>
  );
}

/** Sao bật lên lệch nhịp trên khung cấp 1 (chúc mừng của cấp 1). */
function Sao({ tu }: { tu: number }) {
  const f = useCurrentFrame();
  return (
    <>
      {[0, 1, 2].map((k) => {
        const t = interpolate(f, [tu + k * 5, tu + k * 5 + 16], [0, 1], { ...kep, easing: expoOut });
        return (
          <svg key={k} width={64} height={64} viewBox="0 0 24 24" style={{ position: 'absolute', left: 520 + k * 70, top: 360 - t * 40, opacity: t, transform: `scale(${0.4 + 0.6 * t}) rotate(${(1 - t) * -40}deg)` }}>
            <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z" fill={MAU.vang} stroke={MAU.kem} strokeWidth={0.8} />
          </svg>
        );
      })}
    </>
  );
}

/** Cột biểu đồ mọc lên bằng đường cong expo-out. */
function CotBieuDo() {
  const f = useCurrentFrame();
  const cao = [0.55, 0.8, 0.68, 0.92, 0.74];
  return (
    <div style={{ marginTop: 40, display: 'flex', alignItems: 'flex-end', gap: 18, height: 150 }}>
      {cao.map((h, k) => {
        const t = interpolate(f, [24 + k * 6, 60 + k * 6], [0, 1], { ...kep, easing: expoOut });
        return <div key={k} style={{ width: 46, height: 150 * h * t, borderRadius: '8px 8px 0 0', backgroundColor: k === 3 ? MAU.son : MAU.vang, opacity: 0.9 }} />;
      })}
    </div>
  );
}

/** Máy tính và điện thoại cạnh nhau. */
function HaiNoi() {
  const vaoDt = useVao(12, 60, 26);
  const anhDt = chonAnh('man-hinh/nha-truong/19-app.png', 'man-hinh/du-khach/vi/02-trang-chu.png');
  return (
    <HaiCot
      chu={<Chu id="hai-noi" />}
      hinh={
        <div style={{ position: 'relative', width: 1120, height: 800 }}>
          <div style={{ position: 'absolute', left: 0, top: 70 }}>
            <TrinhDuyetVao rong={900} man={[{ anh: a('11-cap-1-trang-chu', '11-cap-1'), tu: 0 }]} />
          </div>
          <div style={{ ...vaoDt, position: 'absolute', right: 0, top: 120 }}>
            <DienThoai cao={640} man={[{ anh: anhDt, tu: 0 }]} />
          </div>
        </div>
      }
    />
  );
}

function TheKet() {
  const f = useCurrentFrame();
  const [, loiMoi] = CHU.ket as ChuCanh;
  const hh = interpolate(f, [0, 24], [0, 1], { ...kep, easing: expoOut });
  const a1 = useVao(10, 30);
  const b = useVao(18, 24);
  const c = useVao(26, 16);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 160px' }}>
      <div style={{ opacity: hh, transform: `scale(${0.9 + 0.1 * hh})` }}>
        <BieuTuong rong={320} />
      </div>
      <div style={{ ...a1, marginTop: 18 }}>
        <ChuDiViet cao={106} />
      </div>
      <div style={{ ...b, marginTop: 16, fontFamily: PHONG_CHU, fontWeight: 500, fontSize: 38, lineHeight: 1.45, color: '#fff' }}>{loiMoi}</div>
      <div style={{ ...c, marginTop: 44, fontFamily: PHONG_CHU, fontSize: 24, lineHeight: 1.6, color: 'rgba(223,207,182,0.78)' }}>{CHU['ghi-cong'] as string}</div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 10, backgroundColor: MAU.vang, opacity: mo(Math.min(1, f / 20)) }} />
    </AbsoluteFill>
  );
}
