// Dựng toàn bộ video: đoạn logo 3 tỉ lệ, video khách 5 ngôn ngữ (ngang 60 giây, dọc 45 giây), video nhà trường 90 giây, video quảng cáo dọc 30 giây.
// Bản 1080p dựng bằng Remotion, bản 720p chuyển từ bản 1080p bằng ffmpeg đi kèm Remotion. Ra: ra/video/.
// Chạy: node scripts/dung-video.mjs [mã composition ... | anh-bia]   (bỏ trống = dựng tất cả, kể cả ảnh bìa)
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
  { id: 'nha-truong-90s', ten: 'nha-truong-90s.vi', ban720: true, crf: 26 }, // ảnh màn hình máy tính nhiều chi tiết: nén mạnh hơn để bản 1080p dưới 18 MB
  // Video quảng cáo đăng mạng xã hội: bitrate cố định 8 Mbps (nền chuyển màu không bị phân dải sau khi nền tảng nén lại), màu BT.709,
  // vẽ WebGL bằng GPU (ANGLE) cho mô hình 3D.
  { id: 'quang-cao-30s-doc-en', ten: 'quang-cao-30s-doc.en', ban720: false, bitrate: '8M', gl: 'angle' },
];
const chon = process.argv.slice(2);
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const chay = (thamSo) => execFileSync(npx, thamSo, { cwd: goc, stdio: 'inherit', shell: process.platform === 'win32' });

for (const v of viec.filter((v) => chon.length === 0 || chon.includes(v.id))) {
  const ban1080 = join(ra, `${v.ten}.1080.mp4`);
  const batDau = Date.now();
  const chatLuong = v.bitrate
    ? [`--video-bitrate=${v.bitrate}`, '--x264-preset=slow', '--pixel-format=yuv420p', '--color-space=bt709', '--audio-bitrate=320k', `--gl=${v.gl}`]
    : [`--crf=${v.crf ?? 20}`];
  chay(['remotion', 'render', 'src/index.ts', v.id, ban1080, '--codec=h264', ...chatLuong, '--audio-codec=aac', '--log=error']);
  if (v.ban720) {
    const coMoi = v.doc ? '720:1280' : '1280:720';
    chay(['remotion', 'ffmpeg', '-y', '-loglevel', 'error', '-i', ban1080, '-vf', `scale=${coMoi}:flags=lanczos`, '-c:v', 'libx264', '-crf', '26', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', join(ra, `${v.ten}.720.mp4`)]);
  }
  console.log(`${v.id}: ${((Date.now() - batDau) / 1000).toFixed(0)} giây`);
}

// Ảnh bìa không chữ (dùng chung mọi ngôn ngữ): khung huy hiệu đầy đủ của đoạn logo, bản ngang và bản dọc, JPEG.
if (chon.length === 0 || chon.includes('anh-bia')) {
  for (const [id, co] of [['logo-16x9', '1280x720'], ['logo-9x16', '720x1280']]) {
    chay(['remotion', 'still', 'src/index.ts', id, join(ra, `anh-bia.${co}.jpeg`), '--frame=80', '--scale=0.6667', '--image-format=jpeg', '--jpeg-quality=85', '--log=error']);
  }
}
