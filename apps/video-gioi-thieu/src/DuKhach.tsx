import type { ReactNode } from 'react';
import { AbsoluteFill, Html5Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import kichBan from '../kich-ban/du-khach.json';
import { FPS, MAU, PHONG_TIEU_DE, expoOut, mo, phong, type NgonNgu } from './brand';
import { Canh, DienThoai, KhoiChu, LatMai, Nen, chonAnh, useVao, type ManHinh } from './khung';
import { BieuTuong, ChuDiViet, GOC_PHONG_LOGO, LogoChuyenDong } from './Logo';
import { coNhac, viTri } from './vi-tri';

type ChuCanh = [string, string];
type BoChu = Record<string, ChuCanh | string>;

export interface DuKhachProps {
  ngonNgu: NgonNgu;
  doc: boolean;
  [key: string]: unknown;
}

const kep = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Video cho khách du lịch: bản ngang 60 giây hoặc bản dọc 45 giây, chữ theo một trong năm ngôn ngữ. */
export function DuKhach({ ngonNgu, doc }: DuKhachProps) {
  const ds = doc ? kichBan.doc : kichBan.ngang;
  const chu = (kichBan.chu as unknown as Record<string, BoChu>)[ngonNgu];
  const tong = ds[ds.length - 1].den * FPS;
  const nhac = doc ? 'nhac/du-khach-45s.wav' : 'nhac/du-khach-60s.wav';
  return (
    <Nen>
      {ds.map((canh, i) => {
        const cuoi = i === ds.length - 1;
        const dai = (canh.den - canh.tu) * FPS + (cuoi ? 0 : 8);
        return (
          <Sequence key={canh.id} from={canh.tu * FPS} durationInFrames={dai} name={canh.id}>
            <Canh dai={dai} ra={cuoi ? 12 : 8}>
              <NoiDungCanh id={canh.id} dai={dai} ngonNgu={ngonNgu} chu={chu} doc={doc} />
            </Canh>
          </Sequence>
        );
      })}
      {doc ? null : <LatMai tu={kichBan.ngang.find((c) => c.id === 'ket')!.tu * FPS - 8} />}
      {coNhac(nhac) ? <Html5Audio src={staticFile(nhac)} volume={(f) => interpolate(f, [0, 15, tong - 45, tong], [0, 0.9, 0.9, 0], kep)} /> : null}
    </Nen>
  );
}

function BoCuc({ doc, chu, anh }: { doc: boolean; chu: ReactNode; anh: ReactNode }) {
  if (doc) {
    return (
      <AbsoluteFill>
        <div style={{ position: 'absolute', left: 90, top: 150, width: 900 }}>{chu}</div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 640, display: 'flex', justifyContent: 'center' }}>{anh}</div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 150, top: 0, bottom: 0, width: 820, display: 'flex', alignItems: 'center' }}>{chu}</div>
      <div style={{ position: 'absolute', left: 1130, top: 0, bottom: 0, width: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{anh}</div>
    </AbsoluteFill>
  );
}

function NoiDungCanh({ id, dai, ngonNgu, chu, doc }: { id: string; dai: number; ngonNgu: NgonNgu; chu: BoChu; doc: boolean }) {
  const f = useCurrentFrame();
  const p = phong(ngonNgu);
  const thuMuc = `man-hinh/du-khach/${ngonNgu}`;
  // CSDL demo chưa có bản dịch thật cho nội dung di sản (tên có tiền tố giữ chỗ như "[en] ..."), nên các ảnh nặng nội dung
  // của bản en/ko/zh/ja lấy từ bản tiếng Việt; thẻ kết ghi rõ điều này. Có bản dịch thật thì chụp lại và bỏ danh sách này.
  const a = (...ten: string[]) => chonAnh(...ten.map((t) => `${thuMuc}/${t}.png`));
  const vt = viTri(ngonNgu);
  const caoDt = doc ? 1180 : 860;
  const [tieuDe, phu] = (chu[id] as ChuCanh | undefined) ?? ['', ''];
  const khoiChu = (them?: ReactNode, ghiChu?: string) => (
    <div>
      <KhoiChu tieuDe={tieuDe} phu={phu} ghiChu={ghiChu} phong={p} rong={doc ? 900 : 800} coTieuDe={doc ? 76 : 80} coPhu={doc ? 40 : 40} />
      {them}
    </div>
  );
  const dt = (man: ManHinh[], children?: ReactNode, style?: React.CSSProperties) => <DienThoaiVao cao={caoDt} man={man} style={style}>{children}</DienThoaiVao>;

  switch (id) {
    case 'logo': {
      const zoom = interpolate(f, [70, dai], [1, 7], { ...kep, easing: (t) => t * t * t });
      const mo2 = interpolate(f, [84, dai], [1, 0], kep);
      return (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ transform: `scale(${zoom})`, transformOrigin: GOC_PHONG_LOGO, opacity: mo2 }}>
            <LogoChuyenDong canh={doc ? 760 : 600} />
          </div>
        </AbsoluteFill>
      );
    }
    case 'mo-dau':
      return <BoCuc doc={doc} chu={khoiChu()} anh={<DuongChuS doc={doc} />} />;
    case 'ngon-ngu':
      return <BoCuc doc={doc} chu={khoiChu(<LoiChao />)} anh={dt([{ anh: a('01-chon-ngon-ngu', '02-trang-chu'), tu: 0 }])} />;
    case 'gan-ban':
      return (
        <BoCuc
          doc={doc}
          chu={khoiChu()}
          anh={dt(
            [
              { anh: a('02-trang-chu'), tu: 0 },
              { anh: a('04-gan-ban', '02-trang-chu'), tu: 50 },
              { anh: a('05-ban-do', '04-gan-ban'), tu: 130, phong: [140, dai, 1.18, '50% 50%'] },
            ],
            f >= 130 ? <SongVang tu={140} /> : null,
          )}
        />
      );
    case 'nghe':
      return (
        <BoCuc
          doc={doc}
          chu={khoiChu(<SongAm />)}
          anh={dt([
            { anh: a('06-chi-tiet'), tu: 0 },
            { anh: a('08-tom-tat-nghe', '06-chi-tiet'), tu: 80, phong: [80, 81, 1.3, '50% 30%'] },
          ])}
        />
      );
    case 'ba-chieu': {
      const xoay = interpolate(f, [0, dai], [-14, 10], kep);
      return (
        <BoCuc
          doc={doc}
          chu={khoiChu(<CongDungLen />)}
          anh={<div style={{ perspective: 1800 }}>{dt([{ anh: a('09-3d', '06-chi-tiet'), tu: 0 }], null, { transform: `rotateY(${xoay}deg)` })}</div>}
        />
      );
    }
    case 'dong-thoi-gian':
      return (
        <BoCuc
          doc={doc}
          chu={khoiChu(<TrucThoiGian />)}
          anh={dt([
            { anh: a('10-dong-thoi-gian', '11-dong-thoi-gian-dai'), tu: 0 },
            ...(a('11-dong-thoi-gian-dai') ? [{ anh: a('11-dong-thoi-gian-dai'), tu: 90, cuon: [100, dai, 0, vt.dongThoiGian] as [number, number, number, number] }] : []),
          ])}
        />
      );
    case 'goi-y':
      return (
        <BoCuc
          doc={doc}
          chu={khoiChu()}
          anh={dt([
            { anh: a('12-lich-su-goi-y', '03b-goi-y'), tu: 0 },
            ...(a('03b-goi-y') ? [{ anh: a('03b-goi-y'), tu: 95 }] : []),
          ])}
        />
      );
    case 'nguon':
      return <BoCuc doc={doc} chu={khoiChu(undefined, chu['ghi-chu-dich'] as string)} anh={dt([{ anh: a('13-nguon', '06-chi-tiet'), tu: 0 }])} />;
    case 'ket':
      return <TheKet chu={chu} ngonNgu={ngonNgu} doc={doc} />;
    default:
      return null;
  }
}

/** Điện thoại trượt lên khi cảnh bắt đầu. */
function DienThoaiVao({ cao, man, style, children }: { cao: number; man: ManHinh[]; style?: React.CSSProperties; children?: ReactNode }) {
  const vao = useVao(0, 60, 26);
  return (
    <div style={vao}>
      <DienThoai cao={cao} man={man} style={style}>
        {children}
      </DienThoai>
    </div>
  );
}

/** Đường kẻ vàng hình chữ S và năm ghim rơi lệch nhịp 120 ms. */
function DuongChuS({ doc }: { doc: boolean }) {
  const f = useCurrentFrame();
  const ve = interpolate(f, [4, 60], [0, 1], { ...kep, easing: expoOut });
  const ghim: [number, number][] = [
    [318, 70],
    [236, 232],
    [348, 388],
    [372, 548],
    [292, 728],
  ];
  const tiLe = doc ? 1.05 : 1.15;
  return (
    <svg width={600 * tiLe} height={820 * tiLe} viewBox="0 0 600 820">
      <path
        d="M330,40 C190,120 200,270 300,340 C400,410 430,470 370,570 C310,670 240,700 300,790"
        fill="none"
        stroke={MAU.vang}
        strokeWidth={7}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={`${ve} 1`}
      />
      {ghim.map(([x, y], i) => {
        const t = interpolate(f, [14 + i * 4, 14 + i * 4 + 20], [0, 1], { ...kep, easing: expoOut });
        return (
          <g key={x + y} transform={`translate(${x}, ${y - (1 - t) * 140})`} opacity={t}>
            <path d="M0,0 C-22,-26 -26,-38 -26,-50 A26,26 0 1 1 26,-50 C26,-38 22,-26 0,0 Z" fill={MAU.son} />
            <circle cx={0} cy={-50} r={10} fill={MAU.kem} />
          </g>
        );
      })}
    </svg>
  );
}

/** "Xin chào" đổi lần lượt năm thứ tiếng, mỗi chữ 600 ms, mờ dần (không nhấp nháy). */
function LoiChao() {
  const f = useCurrentFrame();
  const nhip = 18;
  const i = Math.floor(Math.max(0, f - 20) / nhip) % kichBan.chao.length;
  const trong = (Math.max(0, f - 20) % nhip) / nhip;
  const mo2 = f < 20 ? 0 : interpolate(trong, [0, 0.25, 0.8, 1], [0, 1, 1, 0]);
  return (
    <div style={{ marginTop: 48, height: 110, fontFamily: `${PHONG_TIEU_DE}, "Noto Sans KR", "Malgun Gothic", "Microsoft YaHei", "Yu Gothic", sans-serif`, fontSize: 84, fontWeight: 700, color: MAU.vang, opacity: mo2 }}>
      {kichBan.chao[i]}
    </div>
  );
}

/** Vòng sóng vàng quanh vị trí trên bản đồ. */
function SongVang({ tu }: { tu: number }) {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
      {[0, 1, 2].map((k) => {
        const t = ((f - tu - k * 14) % 42) / 42;
        if (f - tu - k * 14 < 0) return null;
        return (
          <div
            key={k}
            style={{ position: 'absolute', width: 40 + t * 220, height: 40 + t * 220, borderRadius: '50%', border: `4px solid ${MAU.vang}`, opacity: (1 - t) * 0.9 }}
          />
        );
      })}
      <div style={{ position: 'absolute', width: 26, height: 26, borderRadius: '50%', backgroundColor: MAU.son, border: '4px solid #fff' }} />
    </AbsoluteFill>
  );
}

/** Ba vạch vàng nhấp nhô như sóng âm khi đang nghe thuyết minh. */
function SongAm() {
  const f = useCurrentFrame();
  const vao = useVao(30, 20);
  return (
    <div style={{ ...vao, display: 'flex', gap: 14, alignItems: 'flex-end', height: 90, marginTop: 44 }}>
      {[0, 1, 2, 3, 4].map((k) => {
        const h = 26 + 56 * Math.abs(Math.sin((f + k * 7) / 6));
        return <div key={k} style={{ width: 16, height: h, borderRadius: 8, backgroundColor: k % 2 ? MAU.kem : MAU.vang }} />;
      })}
    </div>
  );
}

/** Biểu tượng nằm phẳng "dựng đứng" lên như một mô hình. */
function CongDungLen() {
  const f = useCurrentFrame();
  const t = interpolate(f, [16, 50], [0, 1], { ...kep, easing: expoOut });
  return (
    <div style={{ marginTop: 40, perspective: 900, width: 300, height: 220 }}>
      <BieuTuong rong={300} style={{ marginTop: 6, transform: `rotateX(${(1 - t) * 82}deg)`, transformOrigin: '50% 95%', opacity: 0.25 + 0.75 * t }} />
    </div>
  );
}

/** Đường kẻ vàng chạy ngang làm trục thời gian, các mốc hiện lệch nhịp. */
function TrucThoiGian() {
  const f = useCurrentFrame();
  const ve = interpolate(f, [16, 70], [0, 1], { ...kep, easing: expoOut });
  return (
    <div style={{ position: 'relative', marginTop: 60, width: 640, height: 60 }}>
      <div style={{ position: 'absolute', top: 28, left: 0, height: 5, width: 640 * ve, backgroundColor: MAU.vang, borderRadius: 3 }} />
      {[0, 1, 2, 3, 4].map((k) => {
        const t = interpolate(f, [24 + k * 8, 40 + k * 8], [0, 1], { ...kep, easing: expoOut });
        return <div key={k} style={{ position: 'absolute', top: 16 - (1 - t) * 10, left: 20 + k * 150, width: 28, height: 28, borderRadius: '50%', backgroundColor: k === 2 ? MAU.son : MAU.kem, border: `4px solid ${MAU.vang}`, opacity: t }} />;
      })}
    </div>
  );
}

/** Thẻ kết: logo (biểu tượng, chữ DiViet), lời mời, ghi công. Không có mã QR, không ghi địa chỉ khi chưa có tên miền cố định. */
function TheKet({ chu, ngonNgu, doc }: { chu: BoChu; ngonNgu: NgonNgu; doc: boolean }) {
  const f = useCurrentFrame();
  const { width } = useVideoConfig();
  const p = phong(ngonNgu);
  const [, loiMoi] = chu.ket as ChuCanh;
  const hh = interpolate(f, [0, 24], [0, 1], { ...kep, easing: expoOut });
  const a = useVao(10, 30);
  const b = useVao(18, 24);
  const c = useVao(26, 16);
  const ghiChuDich = doc ? (chu['ghi-chu-dich'] as string) : '';
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 80px' }}>
      <div style={{ opacity: hh, transform: `scale(${0.9 + 0.1 * hh})` }}>
        <BieuTuong rong={doc ? 400 : 330} />
      </div>
      <div style={{ ...a, marginTop: 20 }}>
        <ChuDiViet cao={doc ? 124 : 108} />
      </div>
      <div style={{ ...b, marginTop: 18, maxWidth: width - 200, fontFamily: p.chu, fontWeight: 500, fontSize: doc ? 44 : 40, lineHeight: 1.45, color: '#fff' }}>{loiMoi}</div>
      <div style={{ ...c, marginTop: 48, fontFamily: p.chu, fontSize: doc ? 26 : 24, lineHeight: 1.6, color: 'rgba(223,207,182,0.78)' }}>
        {chu['ghi-cong'] as string}
        {ghiChuDich ? <div>{ghiChuDich}</div> : null}
        {chu['ghi-chu-man-hinh'] ? <div>{chu['ghi-chu-man-hinh'] as string}</div> : null}
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 10, backgroundColor: MAU.vang, opacity: mo(Math.min(1, f / 20)) }} />
    </AbsoluteFill>
  );
}
