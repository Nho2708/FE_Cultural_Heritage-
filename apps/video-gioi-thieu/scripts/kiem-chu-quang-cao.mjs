// Kiểm chữ trên hình của video quảng cáo theo từng tệp ngôn ngữ (kich-ban/quang-cao/<mã>.json):
// mỗi câu tối đa 7 từ, một dòng, không dấu chấm cuối; tổng chữ trên hình (kể cả nhãn giao diện và thẻ kết) dưới 45 từ.
// Tên ngôn ngữ viết bằng chữ Hàn, Trung, Nhật tính mỗi tên một từ; địa chỉ web tính một từ; dấu "·" không tính.
// Chạy: node scripts/kiem-chu-quang-cao.mjs [mã ...]   (bỏ trống = mọi tệp)
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const thuMuc = new URL('../kich-ban/quang-cao/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const chon = process.argv.slice(2);
// Tệp chữ theo ngôn ngữ đặt tên theo mã ngôn ngữ (en.json, vi.json, zh-Hans.json); anh.json và canh.json không phải tệp chữ.
const tep = readdirSync(thuMuc).filter((t) => /^[a-z]{2}(-[A-Za-z]+)?\.json$/.test(t) && (chon.length === 0 || chon.includes(t.replace('.json', ''))));
const TOI_DA_CAU = 7;
const TOI_DA_TONG = 44;
const dem = (s) => s.split(/\s+/).filter((w) => w && w !== '·').length;
let loi = 0;

for (const t of tep) {
  const c = JSON.parse(readFileSync(join(thuMuc, t), 'utf8'));
  const cau = Object.entries(c.canh);
  const nhan = [c.giaoDien.tenDiTich, c.giaoDien.khoangCach.replace(/^\d+\s*/, ''), ...c.giaoDien.ngonNguNghe.map((n) => n.ten)];
  const ket = [c.theKet.ten, c.theKet.phu];
  let tong = 1; // địa chỉ web
  for (const [id, s] of cau) {
    const n = dem(s);
    tong += n;
    if (n > TOI_DA_CAU) { console.log(`${t} ${id}: ${n} từ (tối đa ${TOI_DA_CAU})`); loi++; }
    if (/[.。]$/.test(s.trim())) { console.log(`${t} ${id}: có dấu chấm cuối`); loi++; }
  }
  for (const s of [...nhan, ...ket]) tong += s ? dem(s) : 0;
  console.log(`${t}: ${cau.length} câu, tổng ${tong} từ trên hình (giới hạn dưới 45)`);
  if (tong > TOI_DA_TONG) loi++;
}
process.exit(loi ? 1 : 0);
