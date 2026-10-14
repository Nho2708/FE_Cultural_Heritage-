// Tải video 720p lên Cloudinary (kho lưu tệp theo kế hoạch chuyển động) để web học tập phát qua VITE_INTRO_VIDEO_BASE_URL.
// public_id = gioi-thieu/<tên tệp bỏ .mp4>, ví dụ gioi-thieu/du-khach-60s.vi.720 -> https://res.cloudinary.com/<cloud>/video/upload/gioi-thieu/du-khach-60s.vi.720.mp4
// (Cloudinary tự đổi sang .webm khi web xin đuôi .webm). Ghi đè bản cũ cùng tên và xóa bộ nhớ đệm CDN.
// Khóa đọc từ biến môi trường CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET (không ghi vào tệp nào).
// Chạy: node scripts/tai-len-cloudinary.mjs [tên tệp trong ra/video ...]   (bỏ trống = mọi tệp *.720.mp4)
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const goc = new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const thuMuc = join(goc, 'ra/video');
const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: khoa, CLOUDINARY_API_SECRET: biMat } = process.env;
if (!cloud || !khoa || !biMat) throw new Error('Thiếu CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY hoặc CLOUDINARY_API_SECRET.');

const chon = process.argv.slice(2);
const tep = chon.length ? chon : readdirSync(thuMuc).filter((ten) => ten.endsWith('.720.mp4'));
for (const ten of tep) {
  const thamSo = { invalidate: 'true', overwrite: 'true', public_id: `gioi-thieu/${ten.replace(/\.mp4$/, '')}`, timestamp: String(Math.floor(Date.now() / 1000)) };
  const chuoi = Object.keys(thamSo).sort().map((k) => `${k}=${thamSo[k]}`).join('&');
  const form = new FormData();
  for (const [k, v] of Object.entries(thamSo)) form.append(k, v);
  form.append('api_key', khoa);
  form.append('signature', createHash('sha1').update(chuoi + biMat).digest('hex'));
  form.append('file', new Blob([readFileSync(join(thuMuc, ten))], { type: 'video/mp4' }), ten);
  const tl = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/video/upload`, { method: 'POST', body: form });
  const kq = await tl.json();
  if (!tl.ok) throw new Error(`${ten}: ${tl.status} ${kq.error?.message ?? ''}`);
  console.log(`${ten} -> ${kq.secure_url} (${(kq.bytes / 1e6).toFixed(1)} MB)`);
}
console.log(`Địa chỉ gốc cho VITE_INTRO_VIDEO_BASE_URL: https://res.cloudinary.com/${cloud}/video/upload/gioi-thieu`);
