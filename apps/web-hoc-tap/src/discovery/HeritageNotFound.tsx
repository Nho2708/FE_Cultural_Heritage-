import { ApiError } from '@dsvhvn/dung-chung/api';
import { ButtonLink } from '@dsvhvn/dung-chung/ui';
import { pathOf } from '../access/screens';
import { PublicErrorState } from '../components/PublicErrorState';
import { useT } from '../i18n/context';

/**
 * Lỗi khi tải một di sản: không có di sản (nháp, đã ẩn, đã xóa hoặc sai đường dẫn đều là 404) thì báo rõ kèm lối về
 * tìm kiếm; lỗi khác dùng khối lỗi chung có nút "Thử lại".
 */
export function HeritageLoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const t = useT();
  if (error instanceof ApiError && error.status === 404) {
    return (
      <section className="dsv-content flex min-h-[50dvh] flex-col items-start justify-center gap-4 py-16">
        <title>{t.documentTitle(t.errors.notFoundDocument)}</title>
        <p className="type-label-kicker text-on-surface-muted">{t.errors.notFoundKicker}</p>
        <h1 className="type-h1 text-on-surface">{t.errors.notFoundTitle}</h1>
        <p className="max-w-[640px] type-body-m text-on-surface-variant">{t.errors.notFoundText}</p>
        <ButtonLink to={pathOf('search')} size="lg">
          {t.errors.searchHeritage}
        </ButtonLink>
      </section>
    );
  }
  return (
    <div className="dsv-content py-12">
      <PublicErrorState error={error} onRetry={onRetry} />
    </div>
  );
}
