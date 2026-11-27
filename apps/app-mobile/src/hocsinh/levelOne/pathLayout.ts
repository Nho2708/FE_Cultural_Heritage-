// Hình học của con đường các bài học ở trang học cấp 1 (hàm thuần để kiểm bằng test): các trạm so le trái phải, trạm cuối (album) ở giữa,
// đường cong chữ S nối các trạm. App không có thư viện vẽ SVG nên đường được cắt thành nhiều đoạn thẳng ngắn theo đường cong Bézier rồi vẽ
// bằng khối View xoay.

export interface PathPoint {
  x: number;
  y: number;
}

export interface RoadSegment {
  /** Tâm của đoạn. */
  x: number;
  y: number;
  length: number;
  /** Góc xoay, đơn vị radian. */
  angle: number;
}

/** Khoảng cách dọc giữa hai trạm. */
export const STATION_GAP = 150;
/** Tâm trạm đầu cách mép trên (chừa chỗ cho bong bóng "Học tiếp"). */
export const PATH_TOP = 84;
/** Phần dưới trạm cuối để hiện tên trạm. */
export const PATH_BOTTOM = 96;

/** Tâm các trạm: so le 30% / 70% chiều ngang, trạm cuối (album) ở giữa. */
export function stationPoints(count: number, width: number): PathPoint[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) => {
    const last = index === count - 1 && count > 1;
    const x = last ? width / 2 : width * (index % 2 === 0 ? 0.3 : 0.7);
    return { x, y: PATH_TOP + index * STATION_GAP };
  });
}

/** Chiều cao khung con đường cho `count` trạm. */
export function pathHeight(count: number): number {
  return count <= 0 ? 0 : PATH_TOP + (count - 1) * STATION_GAP + PATH_BOTTOM;
}

function bezier(p0: PathPoint, p1: PathPoint, t: number): PathPoint {
  // Hai điểm điều khiển nằm thẳng đứng dưới trạm trên và trên trạm dưới nên đường ra khỏi mỗi trạm theo chiều dọc rồi uốn sang trạm kế.
  const half = (p1.y - p0.y) / 2;
  const c0 = { x: p0.x, y: p0.y + half };
  const c1 = { x: p1.x, y: p1.y - half };
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * c0.x + 3 * u * t * t * c1.x + t * t * t * p1.x,
    y: u * u * u * p0.y + 3 * u * u * t * c0.y + 3 * u * t * t * c1.y + t * t * t * p1.y,
  };
}

/** Các đoạn thẳng xấp xỉ đường cong nối lần lượt các trạm, mỗi khúc giữa hai trạm cắt thành `samples` đoạn. */
export function roadSegments(points: readonly PathPoint[], samples = 10): RoadSegment[] {
  const segments: RoadSegment[] = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const from = points[i]!;
    const to = points[i + 1]!;
    let previous = from;
    for (let step = 1; step <= samples; step++) {
      const next = bezier(from, to, step / samples);
      const dx = next.x - previous.x;
      const dy = next.y - previous.y;
      segments.push({ x: (previous.x + next.x) / 2, y: (previous.y + next.y) / 2, length: Math.hypot(dx, dy), angle: Math.atan2(dy, dx) });
      previous = next;
    }
  }
  return segments;
}
