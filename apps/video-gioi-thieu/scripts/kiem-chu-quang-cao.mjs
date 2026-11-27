// Kiểm chữ trên hình của video quảng cáo theo từng tệp ngôn ngữ (kich-ban/quang-cao/<mã>.json):
// mỗi câu dẫn tối đa 7 từ, một dòng, không dấu chấm cuối; câu dẫn cộng nhãn giao diện và thẻ kết dưới 45 từ.
// Từ 16/10/2026 trang chi tiết dựng lại giống trang thật của web và cảnh nghe hiện chữ lời thuyết minh (theo yêu cầu của nhóm):
// hai phần này là chữ của giao diện, không tính vào giới hạn 45 từ nhưng vẫn in ra để biết tổng chữ trên hình.
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
  const tc = c.giaoDien.trangChiTiet;
  // Trang chi tiết: tên di sản hiện thêm hai lần (đường dẫn, tiêu đề trang) ngoài lần trên thẻ.
  const trang = [tc.dangNhap, tc.duongDan, ...tc.the, ...tc.nut, tc.nguonAnh, tc.gioiThieu, tc.doanGioiThieu, c.giaoDien.tenDiTich, c.giaoDien.tenDiTich].reduce((n, s) => n + dem(s), 0);
  const thuyetMinh = c.giaoDien.loiThuyetMinh.reduce((n, s) => n + dem(s), 0);
  console.log(`${t}: ${cau.length} câu dẫn; câu dẫn, nhãn và thẻ kết ${tong} từ (giới hạn dưới 45)`);
  console.log(`  chữ trang chi tiết giống trang thật ${trang} từ, lời thuyết minh hiện chữ ${thuyetMinh} từ; tổng chữ trên hình ${tong + trang + thuyetMinh} từ`);
  if (tong > TOI_DA_TONG) loi++;
}
process.exit(loi ? 1 : 0);
