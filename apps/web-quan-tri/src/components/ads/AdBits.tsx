import { formatCount } from '@dsvhvn/dung-chung';
import type { AdHeritageCount } from '@dsvhvn/dung-chung/api';
import { EmptyState, Table, Td, TextLink, Th, Tr } from '@dsvhvn/dung-chung/ui';
import { PATHS } from '../../access/screens';

// Mảnh dùng chung của màn hình Khách và quảng cáo: thanh ngang theo tỉ lệ và bảng di sản có nhiều lượt nhất. Vẽ bằng HTML, màu lấy từ token; mọi thanh đều có số đi kèm.

export interface CountRow {
  key: string;
  label: string;
  count: number;
  /** Chú thích ngắn dưới nhãn. */
  note?: string;
}

/** Thanh ngang: độ dài theo phần trăm của tổng; kèm số lượt và phần trăm bằng chữ. */
export function CountBars({ rows, caption, unit, total }: { rows: CountRow[]; caption: string; unit: string; total?: number }) {
  const sum = total ?? rows.reduce((acc, row) => acc + row.count, 0);
  return (
    <ul aria-label={caption} className="flex flex-col gap-3">
      {rows.map((row) => {
        const percent = sum > 0 ? Math.round((row.count / sum) * 100) : 0;
        return (
          <li key={row.key} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 type-body-s dsvsm:grid-cols-[minmax(0,12rem)_1fr_auto]">
            <span className="min-w-0">
              <span className="block truncate font-medium text-on-surface" title={row.label}>
                {row.label}
              </span>
              {row.note && <span className="block truncate type-label text-on-surface-variant">{row.note}</span>}
            </span>
            <span className="h-2.5 overflow-hidden rounded-full bg-surface-container-high">
              <span aria-hidden="true" className="block h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
            </span>
            <span className="text-right type-label tabular-nums text-on-surface">
              {formatCount(row.count)} {unit}
              <span className="ml-1 text-on-surface-variant">({percent}%)</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Bảng các di sản có nhiều lượt nhất. Di sản đã xóa khỏi hệ thống vẫn có dòng, ghi "Di sản không còn". */
export function HeritageCountTable({ caption, items, unit }: { caption: string; items: AdHeritageCount[]; unit: string }) {
  if (items.length === 0) return <EmptyState icon="bar-chart" title="Chưa có số liệu trong khoảng này." />;
  return (
    <Table caption={caption}>
      <thead>
        <tr>
          <Th className="w-12">#</Th>
          <Th>Di sản</Th>
          <Th className="text-right">Số {unit}</Th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <Tr key={item.heritageId}>
            <Td className="tabular-nums">{index + 1}</Td>
            <Td>
              {item.name ? (
                <TextLink to={PATHS.heritage(item.heritageId)}>{item.name}</TextLink>
              ) : (
                <span className="text-on-surface-variant">Di sản không còn</span>
              )}
            </Td>
            <Td className="text-right tabular-nums">{formatCount(item.count)}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
