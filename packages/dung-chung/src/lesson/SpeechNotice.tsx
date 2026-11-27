import { Icon } from '../ui';
import { NO_VIETNAMESE_VOICE_NOTICE } from './speechVoice';
import { useSpeechNotice } from './useSpeech';

// Lời báo ngắn "Máy này chưa đọc được tiếng Việt": hiện một lần khi bấm nghe mà máy chủ chưa có tiếng và máy không có giọng tiếng Việt. Không chặn thao tác,
// tự tắt sau vài giây, tắt tay được. Vùng báo luôn có trong trang (rỗng khi không có lời) để trình đọc màn hình đọc lên khi lời báo hiện. Đặt một lần ở
// gốc của ứng dụng.

export function SpeechNotice() {
  const { visible, dismiss } = useSpeechNotice();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-(--dsv-z-toast) flex justify-center">
      {visible && (
        <p className="pointer-events-auto flex max-w-full items-center gap-3 rounded-full bg-(--dsv-toast-bg) py-2 pr-2 pl-4 text-[16px] font-medium text-(--dsv-toast-fg) shadow-1">
          <Icon name="info" size={20} className="shrink-0" />
          <span className="min-w-0">{NO_VIETNAMESE_VOICE_NOTICE}</span>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Đóng lời báo"
            className="flex size-9 min-h-0 shrink-0 items-center justify-center rounded-full hover:bg-(--dsv-toast-fg)/10"
          >
            <Icon name="x" size={18} />
          </button>
        </p>
      )}
    </div>
  );
}
