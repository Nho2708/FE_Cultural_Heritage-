// Liệt kê tệp trong public/ (ảnh chụp, nhạc) để video chọn ảnh thay khi thiếu, và chuyển toạ độ đo lúc chụp sang src/vi-tri.json.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const goc = new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const pub = join(goc, 'public');
const ds = [];
const duyet = (thuMuc) => {
  for (const ten of readdirSync(thuMuc)) {
    const duong = join(thuMuc, ten);
    if (statSync(duong).isDirectory()) duyet(duong);
    else ds.push(relative(pub, duong).split(sep).join('/'));
  }
};
duyet(pub);
writeFileSync(join(goc, 'src/anh-co-san.json'), JSON.stringify(ds.sort(), null, 2) + '\n');
console.log(`${ds.length} tệp`);

const tepDo = join(pub, 'man-hinh/du-khach/danh-sach.json');
if (existsSync(tepDo)) {
  const { chuyenViTri } = await import('./vi-tri-tu-danh-sach.mjs');
  const viTri = chuyenViTri(JSON.parse(readFileSync(tepDo, 'utf8')));
  writeFileSync(join(goc, 'src/vi-tri.json'), JSON.stringify(viTri, null, 2) + '\n');
  console.log('vi-tri', JSON.stringify(viTri));
}

// Vùng phóng to của video nhà trường: lấy vùng đầu tiên đo lúc chụp, nới ra ít nhất 960×600 px để không phóng quá gần.
const tepVung = join(pub, 'man-hinh/nha-truong/danh-sach.json');
if (existsSync(tepVung)) {
  const { anh } = JSON.parse(readFileSync(tepVung, 'utf8'));
  const vung = {};
  for (const [ten, thongTin] of Object.entries(anh)) {
    const v = thongTin.vungPhongTo?.[0];
    if (!v) continue;
    const w = Math.max(v.rong, 960);
    const h = Math.max(v.cao, 600);
    const x = Math.min(Math.max(0, v.x + v.rong / 2 - w / 2), 1920 - w);
    const y = Math.min(Math.max(0, v.y + v.cao / 2 - h / 2), 1200 - h);
    vung[ten.replace('.png', '')] = [Math.round(x), Math.round(y), w, h];
  }
  writeFileSync(join(goc, 'src/vung-nha-truong.json'), JSON.stringify(vung, null, 2) + '\n');
  console.log(`${Object.keys(vung).length} vùng phóng`);
}
