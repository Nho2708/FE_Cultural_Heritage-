import { formatDate, formatNumber, percentToTen } from '@dsvhvn/dung-chung';
import type { ScoreBin, ScorePoint } from '@dsvhvn/dung-chung/api';

// Hai biểu đồ của thống kê, vẽ bằng HTML và SVG (không thêm thư viện): phổ điểm (cột) và điểm theo thời gian (đường).
// Mỗi biểu đồ có bảng số cho trình đọc màn hình; màu lấy từ token.

/** Phổ điểm: 10 khoảng theo phần trăm tổng điểm, cột cao theo số học sinh. */
export function ScoreHistogram({ bins, finished }: { bins: ScoreBin[]; finished: number }) {
  const max = Math.max(1, ...bins.map((b) => b.count));
  return (
    <figure>
      <figcaption className="sr-only">{`Phổ điểm của ${finished} bài đã nộp`}</figcaption>
      <ol className="flex h-56 items-end gap-2" aria-label="Phổ điểm">
        {bins.map((bin) => {
          const last = bin.toPercent === 100;
          const label = `${bin.fromPercent}–${bin.toPercent}%`;
          return (
            <li key={bin.fromPercent} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1 text-center">
              <span className="type-label text-on-surface">{bin.count}</span>
              <span
                aria-hidden="true"
                className={bin.count > 0 ? 'block rounded-t-sm bg-primary' : 'block h-0.5 rounded-sm bg-border-strong'}
                style={bin.count > 0 ? { height: `${(bin.count / max) * 80}%` } : undefined}
              />
              <span className="sr-only">{`${label}${last ? ' (gồm 100%)' : ''}: ${bin.count} học sinh`}</span>
              <span aria-hidden="true" className="type-body-s text-on-surface-variant">
                {bin.fromPercent}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-center type-body-s text-on-surface-variant">Phần trăm tổng điểm (mỗi cột 10%, cột cuối gồm cả 100%)</p>
    </figure>
  );
}

const W = 760;
const H = 260;
const PAD = { top: 24, right: 28, bottom: 36, left: 40 };

/** Điểm theo thời gian trên thang 10: mỗi lượt một điểm, cũ nhất bên trái. */
export function ScoreTrendChart({ points }: { points: ScorePoint[] }) {
  if (points.length === 0) return null;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (ten: number) => PAD.top + innerH - (ten / 10) * innerH;
  const coords = points.map((p, i) => ({ x: x(i), y: y(percentToTen(p.percent)), ten: percentToTen(p.percent), p }));
  return (
    <figure aria-label={`Điểm theo thời gian: ${points.length} lượt làm bài, thang điểm 10`}>
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false" className="h-auto w-full">
        {[0, 5, 10].map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} className="stroke-border" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end" className="fill-on-surface-variant" fontSize={12}>
              {tick}
            </text>
          </g>
        ))}
        {coords.length > 1 && (
          <polyline fill="none" className="stroke-primary" strokeWidth={2.5} strokeLinejoin="round" points={coords.map((c) => `${c.x},${c.y}`).join(' ')} />
        )}
        {coords.map((c) => (
          <g key={c.p.attemptId}>
            <circle cx={c.x} cy={c.y} r={5} className="fill-primary" />
            <text x={c.x} y={c.y - 10} textAnchor="middle" className="fill-on-surface" fontSize={12} fontWeight={600}>
              {formatNumber(c.ten)}
            </text>
            <text x={c.x} y={H - 12} textAnchor="middle" className="fill-on-surface-variant" fontSize={12}>
              {c.p.submittedAt ? formatDate(c.p.submittedAt).slice(0, 5) : ''}
            </text>
          </g>
        ))}
      </svg>
      <table className="sr-only">
        <caption>Điểm từng lượt làm bài, cũ nhất trước</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.attemptId}>
              <th scope="row">{p.quizName}</th>
              <td>{formatDate(p.submittedAt)}</td>
              <td>{`${formatNumber(percentToTen(p.percent))} trên 10`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
