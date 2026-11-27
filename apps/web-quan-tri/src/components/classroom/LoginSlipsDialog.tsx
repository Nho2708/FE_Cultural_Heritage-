import type { LoginSheet } from '@dsvhvn/dung-chung/api';
import { Button, ConfirmDialog, Icon, InlineMessage, Modal, useToast } from '@dsvhvn/dung-chung/ui';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { LoginSlipCard } from './LoginSlipCard';
import { SLIPS_PER_PAGE, chunk, pdfName } from './slips';

// Phiếu đăng nhập của học sinh (hộp thoại có chế độ in) — hiện ngay sau khi tạo tài khoản hoặc đặt lại mật khẩu. Mỗi em một
// phiếu; "In phiếu" in khổ A4, 8 phiếu mỗi trang có đường cắt. Mật khẩu (tạm hoặc mật khẩu cấp 1) chỉ hiện một lần (chỉ lưu bản băm): dữ liệu
// chỉ nằm trong bộ nhớ của hộp thoại này, đóng hộp thoại là mất, và đóng thì hỏi "Thầy cô đã in hoặc lưu phiếu chưa?".
// Bản in là một khối riêng gắn vào cuối <body> (ẩn trên màn hình); khi in, CSS ẩn toàn bộ phần còn lại của trang.

interface LoginSlipsDialogProps {
  sheet: LoginSheet;
  schoolName: string | null;
  /** Câu mô tả dưới tiêu đề, ví dụ "28 học sinh vừa được tạo tài khoản". */
  summary: string;
  onClose: () => void;
}

export function LoginSlipsDialog({ sheet, schoolName, summary, onClose }: LoginSlipsDialogProps) {
  const toast = useToast();
  const [asking, setAsking] = useState(false);
  const pages = chunk(sheet.entries, SLIPS_PER_PAGE);

  const print = (asPdf: boolean) => {
    const previousTitle = document.title;
    if (asPdf) {
      document.title = pdfName(sheet.className);
      toast.info('Trong hộp thoại in, hãy chọn "Lưu dưới dạng PDF" làm máy in để tải tệp.');
    }
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
  };

  return (
    <>
      <Modal
        open
        size="wide"
        title={`Phiếu đăng nhập — Lớp ${sheet.className}`}
        description={`${summary}${schoolName ? ` · ${schoolName}` : ''}`}
        onClose={() => setAsking(true)}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => print(false)}>
              <Icon name="printer" size={16} />
              In phiếu
            </Button>
            <Button variant="secondary" onClick={() => print(true)}>
              <Icon name="download" size={16} />
              Tải tệp PDF
            </Button>
          </div>
          <InlineMessage tone="info">{sheet.notice}</InlineMessage>
          <section className="grid max-h-[60dvh] gap-4 overflow-y-auto pr-1 dsvmd:grid-cols-2" aria-label="Danh sách phiếu đăng nhập">
            {sheet.entries.map((entry) => (
              <LoginSlipCard key={entry.studentId} sheet={sheet} entry={entry} schoolName={schoolName} />
            ))}
          </section>
          <p className="text-center type-body-s text-on-surface-variant">
            {sheet.entries.length} phiếu · Bản in khổ A4 xếp {SLIPS_PER_PAGE} phiếu mỗi trang ({pages.length} trang), cắt theo đường nét đứt.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={asking}
        title="Thầy cô đã in hoặc lưu phiếu chưa?"
        confirmLabel="Đã in, đóng"
        cancelLabel="Quay lại in"
        onConfirm={() => {
          setAsking(false);
          onClose();
        }}
        onClose={() => setAsking(false)}
      >
        Sau khi đóng, {sheet.passwordIsTemporary ? 'mật khẩu tạm' : 'mật khẩu'} của các em không hiện lại được nữa. Nếu mất phiếu, thầy cô dùng "Đặt lại mật khẩu".
      </ConfirmDialog>

      {createPortal(
        <div id="dsv-print-root" aria-hidden="true">
          <p className="dsv-print-title">{`Phiếu đăng nhập — Lớp ${sheet.className}${schoolName ? ` · ${schoolName}` : ''}`}</p>
          {pages.map((page, index) => (
            <section key={index} className="dsv-slip-page">
              {page.map((entry) => (
                <LoginSlipCard key={entry.studentId} sheet={sheet} entry={entry} schoolName={schoolName} />
              ))}
            </section>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
