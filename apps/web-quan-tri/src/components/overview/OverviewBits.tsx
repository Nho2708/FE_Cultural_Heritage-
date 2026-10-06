import { cn, formatCount, trendPeriodFull, trendPeriodLabel } from '@dsvhvn/dung-chung';
import type { SystemTrendPoint, TrendGranularity } from '@dsvhvn/dung-chung/api';
import type { ReactNode } from 'react';

// Mảnh dùng chung của hai màn hình Tổng quan: thanh dùng hạn mức, thẻ số liệu, thanh ngang theo lớp, biểu đồ cột theo thời gian.
// Vẽ bằng HTML và SVG, không thêm thư viện; mọi biểu đồ có bảng số ẩn cho trình đọc màn hình, màu lấy từ token.

/** Thanh dùng hạn mức: `percent` null thì không vẽ. `tone` đổi màu khi sắp hết. */
export function UsageBar({ percent, tone = 'ok', label }: { percent: number | null; tone?: 'ok' | 'warning'; label: string }) {
  if (percent === null) return null;
  return (
    <progress
      aria-label={label}
      max={100}
      value={percent}
      className={cn(
        'mt-3 block h-1.5 w-full appearance-none overflow-hidden rounded-full border-0 bg-surface-container-high',
        '[&::-webkit-progress-bar]:bg-surface-container-high [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:rounded-full',
        tone === 'warning'
          ? '[&::-webkit-progress-value]:bg-warning [&::-moz-progress-bar]:bg-warning'
          : '[&::-webkit-progress-value]:bg-success [&::-moz-progress-bar]:bg-success',
      )}
    />
  );
}

/** Thẻ số liệu của Tổng quan: nhãn, số lớn, chú thích, thanh dùng hạn mức (nếu có). */
export function MetricTile({ label, value, note, children }: { label: string; value: ReactNode; note?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col rounded-md border border-border bg-surface p-5">
      <p className="type-label text-on-surface-variant">{label}</p>
      <p className="mt-2 type-h1 tabular-nums text-on-surface">{value}</p>
      {children}
      {note && <div className="mt-2 type-body-s text-on-surface-variant">{note}</div>}
    </div>
  );
}

export interface BarRow {
  key: string | number;
  label: string;
  /** Phần trăm tổng điểm; null là chưa có lượt nộp. */
  percent: number | null;
  /** Chữ ở cuối thanh, ví dụ "7,3". */
  valueLabel: string;
  hint?: string;
}

/** Thanh ngang theo lớp: thanh dài theo phần trăm tổng điểm, chữ ở cuối thanh là điểm thang 10. */
export function BarList({ rows, caption }: { rows: BarRow[]; caption: string }) {
  return (
    <ul aria-label={caption} className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.key} className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-3 type-body-s dsvsm:grid-cols-[6rem_1fr_3rem]">
          <span className="truncate font-medium text-on-surface" title={row.label}>
            {row.label}
          </span>
          <span className="h-2.5 overflow-hidden rounded-full bg-surface-container-high">
            <span
              aria-hidden="true"
              className="block h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, Math.max(0, row.percent ?? 0))}%` }}
            />
          </span>
          <span className="text-right type-label tabular-nums text-on-surface">
            {row.percent === null ? '—' : row.valueLabel}
            <span className="sr-only">{row.percent === null ? ' chưa có lượt nộp' : ` trên 10${row.hint ? `, ${row.hint}` : ''}`}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Biểu đồ cột theo thời gian của một số liệu. Mỗi kỳ một cột (kể cả kỳ trống), cột cao theo giá trị lớn nhất; nhãn trục
 * thưa ra khi nhiều cột. Bảng số ẩn dành cho trình đọc màn hình.
 */
export function TrendBars({
  points,
  granularity,
  metric,
  metricLabel,
  format = formatCount,
}: {
  points: SystemTrendPoint[];
  granularity: TrendGranularity;
  metric: keyof Omit<SystemTrendPoint, 'period'>;
  metricLabel: string;
  /** Cách viết một giá trị (mặc định số đếm; doanh thu viết bằng tiền). */
  format?: (value: number) => string;
}) {
  const values = points.map((p) => p[metric]);
  const max = Math.max(1, ...values);
  const step = Math.max(1, Math.ceil(points.length / 10));
  return (
    <figure aria-label={`${metricLabel} theo ${granularity === 'MONTH' ? 'tháng' : 'ngày'}`}>
      <div className="flex h-48 items-end gap-px dsvsm:gap-1" aria-hidden="true">
        {points.map((p, i) => {
          const value = values[i] ?? 0;
          return (
            <div key={p.period} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${trendPeriodFull(p.period, granularity)}: ${format(value)}`}>
              <span
                className={value > 0 ? 'block rounded-t-xs bg-primary' : 'block h-0.5 rounded-xs bg-border-strong'}
                style={value > 0 ? { height: `${Math.max(2, (value / max) * 100)}%` } : undefined}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-px type-body-s text-on-surface-variant dsvsm:gap-1" aria-hidden="true">
        {points.map((p, i) => (
          <span key={p.period} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center">
            {i % step === 0 ? trendPeriodLabel(p.period, granularity) : ''}
          </span>
        ))}
      </div>
      <p className="mt-2 type-body-s text-on-surface-variant">
        {values.every((v) => v === 0) ? 'Chưa có số liệu trong khoảng này.' : `Cột cao nhất: ${format(max)} ${metricLabel.toLocaleLowerCase('vi')}.`}
      </p>
      <table className="sr-only">
        <caption>{`${metricLabel} theo ${granularity === 'MONTH' ? 'tháng' : 'ngày'}`}</caption>
        <tbody>
          {points.map((p, i) => (
            <tr key={p.period}>
              <th scope="row">{trendPeriodFull(p.period, granularity)}</th>
              <td>{format(values[i] ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
