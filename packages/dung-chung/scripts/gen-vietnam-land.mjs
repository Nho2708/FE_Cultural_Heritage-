#!/usr/bin/env node
// Sinh src/map/vietnamLand.ts: đường biên đất liền và đảo ven bờ của Việt Nam, dùng làm các lỗ của lớp che bản đồ
// (lớp che phủ kín mọi thứ ngoài lãnh thổ để bản đồ chỉ hiện Việt Nam).
//
// Nguồn: Natural Earth 1:10m, lớp ranh giới quốc gia theo góc nhìn Việt Nam (phạm vi công cộng, không cần ghi công):
//   https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries_vnm.geojson
// Tệp tải về là dữ liệu ngoài: để trong thư mục riêng, script chỉ đọc nó như JSON.
//
//   node scripts/gen-vietnam-land.mjs <đường-dẫn-tệp-geojson-đã-tải>    (chạy ở packages/dung-chung)
//
// Cách làm: lấy đa giác của Việt Nam (ADM0_A3 = VNM), bỏ các đảo của Hoàng Sa và Trường Sa (ô bản đồ nền ở đó ghi tên nước
// ngoài nên lớp che phải phủ kín, hai quần đảo được vẽ riêng bằng chấm và nhãn tiếng Việt trong seas.ts), đơn giản hóa từng
// vòng bằng Douglas–Peucker rồi làm tròn tới phần nghìn độ (khoảng 100 m) để tệp nhỏ.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = resolve(ROOT, 'src/map/vietnamLand.ts');

/** Sai số tối đa khi đơn giản hóa, tính bằng độ (khoảng 150 m). */
const TOLERANCE = 0.0015;
/** Số chữ số thập phân giữ lại. */
const DECIMALS = 3;
/** Đảo có tâm ở phía đông kinh tuyến này thuộc Hoàng Sa hoặc Trường Sa: không khoét lỗ. Đảo ven bờ xa nhất (Lý Sơn, Phú Quý) ở dưới 109.5. */
const ARCHIPELAGO_WEST_LONGITUDE = 111;

/** Khoảng cách từ điểm tới đoạn thẳng, tính trên mặt phẳng kinh độ – vĩ độ (đủ cho việc đơn giản hóa). */
function distanceToSegment([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  let t = lengthSquared === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Douglas–Peucker: giữ các điểm làm đường lệch quá `tolerance` so với đoạn thẳng nối hai đầu. */
function simplify(points, tolerance) {
  if (points.length <= 2) return points;
  const keep = new Array(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const stack = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop();
    let farthest = -1;
    let farthestDistance = tolerance;
    for (let i = first + 1; i < last; i++) {
      const d = distanceToSegment(points[i], points[first], points[last]);
      if (d > farthestDistance) {
        farthestDistance = d;
        farthest = i;
      }
    }
    if (farthest !== -1) {
      keep[farthest] = true;
      stack.push([first, farthest], [farthest, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** Vòng khép kín của GeoJSON: điểm cuối trùng điểm đầu. Đơn giản hóa theo hai nửa để điểm đầu không bị giữ cố định một cách tùy tiện. */
function simplifyRing(ring, tolerance) {
  const open = ring.slice(0, -1);
  if (open.length < 4) return open;
  const half = Math.floor(open.length / 2);
  const first = simplify(open.slice(0, half + 1), tolerance);
  const second = simplify([...open.slice(half), open[0]], tolerance);
  return [...first.slice(0, -1), ...second.slice(0, -1)];
}

const round = (value) => Number(value.toFixed(DECIMALS));

/** Làm tròn rồi bỏ các điểm trùng nhau liên tiếp (kể cả điểm cuối trùng điểm đầu). */
function roundRing(ring) {
  const out = [];
  for (const [lng, lat] of ring) {
    const point = [round(lat), round(lng)];
    const previous = out[out.length - 1];
    if (previous && previous[0] === point[0] && previous[1] === point[1]) continue;
    out.push(point);
  }
  const first = out[0];
  const last = out[out.length - 1];
  if (out.length > 1 && first[0] === last[0] && first[1] === last[1]) out.pop();
  return out;
}

function centerLongitude(ring) {
  let min = Infinity;
  let max = -Infinity;
  for (const [lng] of ring) {
    min = Math.min(min, lng);
    max = Math.max(max, lng);
  }
  return (min + max) / 2;
}

function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('Cần đường dẫn tệp GeoJSON của Natural Earth (ne_10m_admin_0_countries_vnm.geojson).');
    process.exit(2);
  }
  const collection = JSON.parse(readFileSync(resolve(input), 'utf8'));
  const vietnam = collection.features.find((feature) => feature?.properties?.ADM0_A3 === 'VNM');
  if (!vietnam) throw new Error('Không thấy đối tượng có ADM0_A3 = VNM trong tệp.');
  const { geometry } = vietnam;
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;

  // Chỉ lấy vòng ngoài của mỗi đa giác (hồ trong đất liền không cần che). Mỗi vòng ngoài là một lỗ của lớp che.
  const rings = [];
  let skipped = 0;
  for (const polygon of polygons) {
    const outer = polygon[0];
    if (centerLongitude(outer) > ARCHIPELAGO_WEST_LONGITUDE) {
      skipped += 1;
      continue;
    }
    const ring = roundRing(simplifyRing(outer, TOLERANCE));
    if (ring.length >= 3) rings.push(ring);
  }
  // Vòng lớn trước (đất liền) để đọc tệp dễ hơn.
  rings.sort((a, b) => b.length - a.length);

  const body = rings.map((ring) => `  [${ring.map(([lat, lng]) => `${lat}, ${lng}`).join(', ')}],`).join('\n');
  const content =
    `// TỆP SINH TỰ ĐỘNG — KHÔNG SỬA TAY. Lệnh: node scripts/gen-vietnam-land.mjs <tệp GeoJSON> (ở packages/dung-chung).\n` +
    `// Đường biên đất liền và các đảo ven bờ của Việt Nam, làm lỗ cho lớp che bản đồ (chỉ hiện Việt Nam).\n` +
    `// Nguồn: Natural Earth 1:10m, ranh giới quốc gia theo góc nhìn Việt Nam (ne_10m_admin_0_countries_vnm), phạm vi công cộng\n` +
    `// (https://www.naturalearthdata.com/about/terms-of-use/). Đã đơn giản hóa (sai số ${TOLERANCE}°) và làm tròn phần nghìn độ;\n` +
    `// không gồm Hoàng Sa, Trường Sa (hai quần đảo vẽ riêng ở seas.ts).\n` +
    `\n` +
    `/** Mỗi vòng là một dãy phẳng vĩ độ, kinh độ, vĩ độ, kinh độ… (không lặp lại điểm đầu); vòng đầu là đất liền. */\n` +
    `export const VIETNAM_LAND_RINGS: readonly (readonly number[])[] = [\n${body}\n];\n`;
  writeFileSync(OUTPUT, content);
  const points = rings.reduce((sum, ring) => sum + ring.length, 0);
  console.log(`Đã ghi ${OUTPUT}: ${rings.length} vòng, ${points} điểm, ${Buffer.byteLength(content)} byte; bỏ ${skipped} đảo của hai quần đảo.`);
}

main();
