import { errorMessage, type NotifyClassResult } from '@dsvhvn/dung-chung/api';
import { Button, InlineMessage, Modal, TextAreaField, useToast } from '@dsvhvn/dung-chung/ui';
import { useState } from 'react';

// Gửi thông báo cho cả lớp về bài học hoặc bài kiểm tra (giao bài về nhà): em thấy ở nút Thông báo và mở bài ngay, không phải gõ mã.
// Lời nhắn tùy chọn; để trống thì hệ thống dùng câu mặc định.

const MESSAGE_MAX_LENGTH = 500;

interface NotifyClassDialogProps {
  open: boolean;
  /** Tên bài đang giao, hiện ở phần mô tả. */
  subject: string;
  className: string | null;
  send: (message: string | null) => Promise<{ data: NotifyClassResult }>;
  onClose: () => void;
}

export function NotifyClassDialog({ open, subject, className, send, onClose }: NotifyClassDialogProps) {
  const toast = useToast();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const submit = async () => {
    setSending(true);
    setFailure(null);
    try {
      const { data } = await send(message.trim() === '' ? null : message.trim());
      toast.success(data.message);
      setMessage('');
      onClose();
    } catch (err) {
      setFailure(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Gửi thông báo cho lớp"
      description={`${subject}${className ? ` · Lớp ${className}` : ''}`}
      size="panel"
      busy={sending}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        {failure && <InlineMessage tone="danger">{failure}</InlineMessage>}
        <TextAreaField
          label="Lời nhắn (không bắt buộc)"
          name="message"
          rows={3}
          maxLength={MESSAGE_MAX_LENGTH}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          hint={`Ví dụ: giao bài về nhà, hạn nộp. Tối đa ${MESSAGE_MAX_LENGTH} ký tự.`}
        />
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void submit()} loading={sending}>
            Gửi thông báo
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={sending}>
            Hủy
          </Button>
        </div>
      </div>
    </Modal>
  );
}
