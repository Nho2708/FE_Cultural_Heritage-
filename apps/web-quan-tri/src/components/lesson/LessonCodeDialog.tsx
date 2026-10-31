import { spacedLessonCode } from '@dsvhvn/dung-chung';
import type { NotifyClassResult } from '@dsvhvn/dung-chung/api';
import { Button, Icon, InlineMessage, Modal, useToast } from '@dsvhvn/dung-chung/ui';
import { useEffect, useRef, useState } from 'react';
import { CodeDisplay } from './LessonBits';
import { lessonLink } from './lessonLink';
import { NotifyClassDialog } from './NotifyClassDialog';

// Mã bài học hoặc mã bài kiểm tra (hộp thoại) và chế độ Chiếu lên bảng. Mã bài học mở bài học, từ đó em vào được các bài kiểm tra; mã bài kiểm tra vào thẳng
// bài đó. Chỉ học sinh của lớp đã đăng nhập mới mở được. Mã không đổi khi sửa, lưu trữ rồi xuất bản lại. Sao chép mã hoặc đường dẫn để dán vào nhóm lớp;
// chiếu lên bảng để cả lớp gõ tay (không quét mã QR); gửi thông báo để em ở nhà mở bài ngay.

export interface CodeTarget {
  title: string | null;
  className: string | null;
  accessCode: string;
  /** Mặc định là mã bài học. */
  kind?: 'lesson' | 'quiz';
  /** Gửi thông báo cho cả lớp; bỏ trống thì không hiện nút. */
  notify?: (message: string | null) => Promise<{ data: NotifyClassResult }>;
}

function codeNote(target: CodeTarget): string {
  const who = `Chỉ học sinh lớp ${target.className ?? ''} đã đăng nhập mới mở được.`;
  return target.kind === 'quiz'
    ? `${who} Em gõ mã này ở mục Nhập mã để vào thẳng bài kiểm tra.`
    : `${who} Mã này mở bài học, từ đó em vào được các bài kiểm tra của bài.`;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Chiếu lên bảng: nền tối, chữ rất lớn, chia nhóm ký tự để cả lớp đọc theo. Esc hoặc nút Thoát để đóng. */
export function ProjectorView({ target, onClose }: { target: CodeTarget; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={`${target.kind === 'quiz' ? 'Mã bài kiểm tra' : 'Mã bài học'} ${target.accessCode}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-0 h-dvh max-h-none w-dvw max-w-none flex-col bg-[#32291f] p-0 text-[#f4efe8] open:flex"
    >
      <div className="flex items-center justify-between gap-4 px-6 py-4 type-body-m opacity-80">
        <p className="min-w-0 truncate">
          {target.title}
          {target.className ? ` · Lớp ${target.className}` : ''}
        </p>
        <button type="button" onClick={onClose} className="inline-flex shrink-0 items-center gap-2 rounded-sm px-3 py-2 hover:bg-white/10">
          Thoát (Esc)
          <Icon name="x" size={20} />
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
        <p className="flex items-center gap-3 text-[clamp(1.25rem,3vw,2.25rem)]">
          <Icon name="keyboard" size={40} />
          Mở DiViet → Nhập mã
        </p>
        <p className="text-[clamp(3rem,13vw,10rem)] leading-none font-medium" data-testid="ma-chieu-bang">
          <CodeDisplay code={spacedLessonCode(target.accessCode)} className="whitespace-pre-wrap" />
        </p>
        <p className="type-body-l">{lessonLink(target.accessCode).replace(/^https?:\/\//, '')}</p>
        <p className="max-w-[60ch] type-body-m opacity-75">{codeNote(target)}</p>
      </div>
    </dialog>
  );
}

export function LessonCodeDialog({ target, onClose }: { target: CodeTarget; onClose: () => void }) {
  const toast = useToast();
  const [projecting, setProjecting] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const link = lessonLink(target.accessCode);
  const isQuiz = target.kind === 'quiz';
  const codeName = isQuiz ? 'mã bài kiểm tra' : 'mã bài học';

  const copy = async (text: string, success: string) => {
    if (await copyText(text)) toast.success(success);
    else toast.error('Không sao chép được. Hãy bôi đen và sao chép thủ công.');
  };

  return (
    <>
      <Modal
        open={!projecting && !notifying}
        title={isQuiz ? 'Mã bài kiểm tra' : 'Mã bài học'}
        description={`${target.title ?? ''}${target.className ? ` · Lớp ${target.className}` : ''}`}
        size="panel"
        onClose={onClose}
      >
        <div className="flex flex-col gap-5">
          <div className="rounded-md bg-surface-container-low px-4 py-8 text-center">
            <p className="type-display-l text-on-surface" data-testid="ma-bai-hoc">
              <CodeDisplay code={target.accessCode} />
            </p>
            <p className="mt-3 type-body-s text-on-surface-variant">{isQuiz ? 'Mã không đổi khi thầy cô sửa tên, mô tả hoặc giờ đóng.' : 'Mã không đổi khi thầy cô sửa bài học.'}</p>
          </div>
          <div>
            <p className="type-label text-on-surface">Đường dẫn</p>
            <input
              readOnly
              aria-label={isQuiz ? 'Đường dẫn bài kiểm tra' : 'Đường dẫn bài học'}
              value={link.replace(/^https?:\/\//, '')}
              className="mt-1 h-11 w-full rounded-sm border border-border-strong bg-surface-container-low px-3 type-body-m text-on-surface"
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void copy(target.accessCode, `Đã sao chép ${codeName}. Thầy cô dán mã vào nhóm lớp hoặc đọc cho học sinh gõ.`)}>
              <Icon name="copy" size={16} />
              Sao chép mã
            </Button>
            <Button variant="secondary" onClick={() => void copy(link, `Đã sao chép đường dẫn ${isQuiz ? 'bài kiểm tra' : 'bài học'}.`)}>
              <Icon name="copy" size={16} />
              Sao chép đường dẫn
            </Button>
            <Button variant="secondary" onClick={() => setProjecting(true)}>
              <Icon name="external-link" size={16} />
              Chiếu lên bảng
            </Button>
            {target.notify && (
              <Button variant="secondary" onClick={() => setNotifying(true)}>
                <Icon name="bell" size={16} />
                Gửi thông báo cho lớp
              </Button>
            )}
          </div>
          <InlineMessage tone="info">{codeNote(target)}</InlineMessage>
        </div>
      </Modal>
      {projecting && <ProjectorView target={target} onClose={() => setProjecting(false)} />}
      {target.notify && (
        <NotifyClassDialog open={notifying} subject={target.title ?? ''} className={target.className} send={target.notify} onClose={() => setNotifying(false)} />
      )}
    </>
  );
}
