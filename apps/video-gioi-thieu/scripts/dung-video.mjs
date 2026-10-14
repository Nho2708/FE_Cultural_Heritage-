// Dựng toàn bộ video: đoạn logo 3 tỉ lệ, video khách 5 ngôn ngữ (ngang 60 giây, dọc 45 giây), video nhà trường 90 giây.
// Bản 1080p dựng bằng Remotion, bản 720p chuyển từ bản 1080p bằng ffmpeg đi kèm Remotion. Ra: ra/video/.
// Chạy: node scripts/dung-video.mjs [mã composition ...]   (bỏ trống = dựng tất cả)
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const goc = new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const ra = join(goc, 'ra/video');
mkdirSync(ra, { recursive: true });

const NGON_NGU = { vi: 'vi', en: 'en', ko: 'ko', zh: 'zh-Hans', ja: 'ja' };
const viec = [
  { id: 'logo-16x9', ten: 'logo-2s4.16x9', ban720: false },
  { id: 'logo-1x1', ten: 'logo-2s4.1x1', ban720: false },
  { id: 'logo-9x16', ten: 'logo-2s4.9x16', ban720: false },
  ...Object.entries(NGON_NGU).map(([ma, ngonNgu]) => ({ id: `du-khach-60s-${ma}`, ten: `du-khach-60s.${ngonNgu}`, ban720: true })),
  ...Object.entries(NGON_NGU).map(([ma, ngonNgu]) => ({ id: `du-khach-45s-doc-${ma}`, ten: `du-khach-45s-doc.${ngonNgu}`, ban720: true, doc: true })),
  { id: 'nha-truong-90s', ten: 'nha-truong-90s.vi', ban720: true },
];
const chon = process.argv.slice(2);
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const chay = (thamSo) => execFileSync(npx, thamSo, { cwd: goc, stdio: 'inherit', shell: process.platform === 'win32' });

for (const v of viec.filter((v) => chon.length === 0 || chon.includes(v.id))) {
  const ban1080 = join(ra, `${v.ten}.1080.mp4`);
  const batDau = Date.now();
  chay(['remotion', 'render', 'src/index.ts', v.id, ban1080, '--codec=h264', '--crf=20', '--audio-codec=aac', '--log=error']);
  if (v.ban720) {
    const coMoi = v.doc ? '720:1280' : '1280:720';
    chay(['remotion', 'ffmpeg', '-y', '-loglevel', 'error', '-i', ban1080, '-vf', `scale=${coMoi}:flags=lanczos`, '-c:v', 'libx264', '-crf', '26', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', join(ra, `${v.ten}.720.mp4`)]);
  }
  console.log(`${v.id}: ${((Date.now() - batDau) / 1000).toFixed(0)} giây`);
}
