import { MESSAGES } from '@dsvhvn/dung-chung';
import type { LoginSheet, LoginSheetEntry } from '@dsvhvn/dung-chung/api';
import { Icon } from '@dsvhvn/dung-chung/ui';

// Một phiếu đăng nhập của học sinh: tên, lớp và trường, mã học sinh, mật khẩu, hướng dẫn đăng nhập, dòng nhắc của máy chủ
// (lớp cấp 2, 3: phải đổi mật khẩu tạm ở lần đăng nhập đầu; lớp cấp 1: dùng luôn mật khẩu này) và dòng "Quên mật khẩu?".
// Dùng cho cả bản xem trong hộp thoại lẫn bản in A4 (phiếu không chứa thông tin nào khác của học sinh). Mật khẩu chỉ có
// trong phản hồi tạo hoặc đặt lại và chỉ hiện đúng một lần; nhãn là "Mật khẩu tạm" khi mật khẩu là tạm, còn lại là "Mật khẩu".

export function LoginSlipCard({ sheet, entry, schoolName }: { sheet: LoginSheet; entry: LoginSheetEntry; schoolName: string | null }) {
  return (
    <article
      aria-label={`Phiếu đăng nhập của ${entry.fullName}`}
      className="dsv-slip flex flex-col gap-3 rounded-sm border border-dashed border-border-strong bg-surface p-5 text-on-surface"
    >
      <header className="flex items-baseline justify-between gap-3">
        <span className="type-h4 text-primary">DiViet</span>
        <span className="type-label-kicker text-on-surface-muted">PHIẾU ĐĂNG NHẬP</span>
      </header>
      <div>
        <p className="type-h3">{entry.fullName}</p>
        <p className="type-body-s text-on-surface-variant">
          Lớp {entry.className}
          {schoolName ? ` · ${schoolName}` : ''}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-sm bg-surface-container-low px-3 py-2">
          <dt className="type-label text-on-surface-muted">Mã học sinh</dt>
          <dd className="mt-1 type-mono-label text-[18px] font-medium tracking-wider">{entry.studentCode}</dd>
        </div>
        <div className="rounded-sm bg-surface-container-low px-3 py-2">
          <dt className="type-label text-on-surface-muted">{sheet.passwordIsTemporary ? 'Mật khẩu tạm' : 'Mật khẩu'}</dt>
          <dd className="mt-1 type-mono-label text-[18px] font-medium tracking-wider">{entry.temporaryPassword}</dd>
        </div>
      </dl>
      <ol className="list-decimal space-y-1 pl-5 type-body-s">
        {sheet.instructions.map((line) => (
          <li key={line}>{line}</li>
        ))}
        <li>{sheet.firstLoginReminder}</li>
      </ol>
      <p className="flex items-center gap-2 type-label text-on-surface-muted">
        <Icon name="scissors" size={14} />
        {MESSAGES.studentForgotPassword}
      </p>
    </article>
  );
}
