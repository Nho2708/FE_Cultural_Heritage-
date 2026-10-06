import { cn } from '@dsvhvn/dung-chung';
import { Button, Icon, Modal } from '@dsvhvn/dung-chung/ui';
import { useI18n } from './context';
import { LANGUAGES } from './languages';

/**
 * Hộp thoại Chọn ngôn ngữ (mở từ mục Ngôn ngữ trên thanh điều hướng): năm lựa chọn, mỗi lựa chọn viết bằng chính ngôn ngữ đó, không dùng cờ quốc
 * gia; dòng đang chọn có dấu tích. Chọn xong thì nhớ trên máy này và tải lại chữ giao diện cùng nội dung di sản theo ngôn ngữ mới.
 */
export function LanguageDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { language, t, setLanguage } = useI18n();
  return (
    <Modal
      open={open}
      title={t.language.title}
      onClose={onClose}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t.common.close}
        </Button>
      }
    >
      <ul className="flex flex-col gap-3">
        {LANGUAGES.map((option) => {
          const selected = option.code === language;
          return (
            <li key={option.code}>
              <button
                type="button"
                lang={option.code}
                aria-current={selected ? 'true' : undefined}
                onClick={() => {
                  setLanguage(option.code);
                  onClose();
                }}
                className={cn(
                  'flex h-12 w-full items-center justify-between rounded-sm border px-4 text-left type-control transition-colors',
                  selected
                    ? 'border-primary bg-primary-container text-on-primary-container'
                    : 'border-border bg-surface text-on-surface hover:bg-surface-container-low',
                )}
              >
                {option.nativeName}
                {selected && <Icon name="check" size={20} />}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 flex items-start gap-2 type-body-s text-on-surface-variant">
        <Icon name="info" size={16} className="mt-[3px] shrink-0" />
        <span>{t.language.machineNote}</span>
      </p>
    </Modal>
  );
}
