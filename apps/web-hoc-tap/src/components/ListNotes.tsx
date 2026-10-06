import { Icon } from '@dsvhvn/dung-chung/ui';
import { useI18n } from '../i18n/context';

/**
 * Thông báo một lần ở đầu danh sách (trang chủ, tìm kiếm, bản đồ): có thẻ chưa có bản dịch nên đang hiện tên và mô tả bằng tiếng Việt, và/hoặc có thẻ là
 * bản dịch máy (tiếng Hàn, Trung, Nhật) nên có thể chưa chính xác. Hai điều này nói riêng, mỗi điều một dòng, chỉ hiện khi đúng.
 */
export function ListNotes({ flags, compact = false }: { flags: { fallback: boolean; machine: boolean }; compact?: boolean }) {
  const { language, t } = useI18n();
  const notes = [
    flags.fallback ? t.language.fallbackList(t.language.names[language]) : null,
    flags.machine ? t.language.machineList : null,
  ].filter((note): note is string => note !== null);
  if (notes.length === 0) return null;
  return (
    <ul className={compact ? 'flex flex-col gap-1 type-label text-on-surface-variant dsvmd:hidden' : 'mb-6 flex flex-col gap-1.5 type-body-s text-on-surface-variant'}>
      {notes.map((note) => (
        <li key={note} className="flex items-start gap-2">
          {!compact && <Icon name="info" size={16} className="mt-[3px] shrink-0" />}
          <span>{note}</span>
        </li>
      ))}
    </ul>
  );
}
