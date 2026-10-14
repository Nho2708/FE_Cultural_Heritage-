// Sinh phụ đề WebVTT từ tệp kịch bản (cùng nguồn với chữ trên hình), mỗi ngôn ngữ một tệp:
// video khách 5 ngôn ngữ (bản ngang và bản dọc), video nhà trường tiếng Việt và tiếng Anh.
// Ra: ra/phu-de/ và chép bản ngang vào apps/web-hoc-tap/public/video/ (web phát video kèm phụ đề cùng nguồn gốc).
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const goc = new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const ra = join(goc, 'ra/phu-de');
const web = join(goc, '../web-hoc-tap/public/video');
mkdirSync(ra, { recursive: true });
mkdirSync(web, { recursive: true });

const docJson = (ten) => JSON.parse(readFileSync(join(goc, 'kich-ban', ten), 'utf8'));
const laCjk = (chu) => /[぀-ヿ㐀-鿿가-힯]/.test(chu);

/** Tách câu, câu dài thì tách tiếp ở dấu phẩy, chấm phẩy để mỗi phụ đề tối đa hai dòng. */
function tachCau(doan) {
  const cjk = laCjk(doan);
  const toiDa = cjk ? 34 : 84;
  const cau = doan.match(/[^.?!。？！]+[.?!。？！]?/g)?.map((c) => c.trim()).filter(Boolean) ?? [];
  const ketQua = [];
  for (const c of cau) {
    if (c.length <= toiDa) {
      ketQua.push(c);
      continue;
    }
    let dang = '';
    for (const manh of c.split(/(?<=[,;:，；、])/)) {
      if (dang && (dang + manh).length > toiDa) {
        ketQua.push(dang.trim());
        dang = '';
      }
      dang += manh;
    }
    if (dang.trim()) ketQua.push(dang.trim());
  }
  return ketQua;
}

/** Ngắt dòng: tối đa khoảng 42 ký tự chữ Latin hoặc 17 ký tự chữ Hàn, Trung, Nhật mỗi dòng. */
function ngatDong(cau) {
  if (laCjk(cau)) {
    if (cau.length <= 17) return cau;
    const giua = Math.ceil(cau.length / 2);
    return `${cau.slice(0, giua)}\n${cau.slice(giua)}`;
  }
  if (cau.length <= 42) return cau;
  const tu = cau.split(' ');
  let dong1 = '';
  while (tu.length && (dong1 + ' ' + tu[0]).trim().length <= Math.max(42, Math.ceil(cau.length / 2))) dong1 = (dong1 + ' ' + tu.shift()).trim();
  return `${dong1}\n${tu.join(' ')}`;
}

const moc = (giay) => {
  const h = Math.floor(giay / 3600);
  const m = Math.floor((giay % 3600) / 60);
  const s = giay % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`;
};

/** Một tệp VTT: mỗi cảnh có tiêu đề rồi các câu phụ, chia thời gian theo độ dài chữ. */
function taoVtt(dsCanh, chu) {
  const dong = ['WEBVTT', ''];
  let so = 1;
  for (const canh of dsCanh) {
    const noiDung = chu[canh.id];
    if (!Array.isArray(noiDung)) continue;
    const [tieuDe, phu] = noiDung;
    const cac = [tieuDe, ...tachCau(phu ?? '')].filter(Boolean);
    const batDau = canh.tu + 0.4;
    const ketThuc = canh.den - 0.2;
    const trongSo = cac.map((c, i) => (i === 0 ? Math.max(8, c.length * 0.6) : c.length));
    const tong = trongSo.reduce((a, b) => a + b, 0);
    let t = batDau;
    cac.forEach((c, i) => {
      const dai = ((ketThuc - batDau) * trongSo[i]) / tong;
      dong.push(String(so++), `${moc(t)} --> ${moc(t + dai - 0.05)}`, ngatDong(c), '');
      t += dai;
    });
  }
  return dong.join('\n');
}

const duKhach = docJson('du-khach.json');
for (const [ngonNgu, chu] of Object.entries(duKhach.chu)) {
  const ngang = `du-khach-60s.${ngonNgu}.vtt`;
  writeFileSync(join(ra, ngang), taoVtt(duKhach.ngang, chu));
  writeFileSync(join(ra, `du-khach-45s-doc.${ngonNgu}.vtt`), taoVtt(duKhach.doc, chu));
  copyFileSync(join(ra, ngang), join(web, ngang));
}
const nhaTruong = docJson('nha-truong.json');
for (const [ngonNgu, chu] of Object.entries(nhaTruong.chu)) {
  const ten = `nha-truong-90s.${ngonNgu}.vtt`;
  writeFileSync(join(ra, ten), taoVtt(nhaTruong.canh, chu));
  copyFileSync(join(ra, ten), join(web, ten));
}
console.log('xong phụ đề:', ra);
