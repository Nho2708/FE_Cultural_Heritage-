import { ApiError } from '@dsvhvn/dung-chung/api';
import { ButtonLink, ErrorState } from '@dsvhvn/dung-chung/ui';
import { pathOf } from '../access/screens';

/**
 * Lỗi khi tải một di sản: không có di sản (nháp, đã ẩn, đã xóa hoặc sai đường dẫn đều là 404) thì báo rõ kèm lối về
 * tìm kiếm; lỗi khác dùng khối lỗi chung có nút "Thử lại".
 */
export function HeritageLoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  if (error instanceof ApiError && error.status === 404) {
    return (
      <section className="dsv-content flex min-h-[50dvh] flex-col items-start justify-center gap-4 py-16">
        <title>Không tìm thấy di sản · Học di sản</title>
        <p className="type-label-kicker text-on-surface-muted">KHÔNG TÌM THẤY</p>
        <h1 className="type-h1 text-on-surface">Không tìm thấy di sản này</h1>
        <p className="max-w-[640px] type-body-m text-on-surface-variant">
          Di sản có thể đã được ẩn hoặc đường dẫn chưa đúng. Em hãy tìm lại trong danh sách di sản.
        </p>
        <ButtonLink to={pathOf('search')} size="lg">
          Tìm kiếm di sản
        </ButtonLink>
      </section>
    );
  }
  return (
    <div className="dsv-content py-12">
      <ErrorState error={error} onRetry={onRetry} />
    </div>
  );
}
