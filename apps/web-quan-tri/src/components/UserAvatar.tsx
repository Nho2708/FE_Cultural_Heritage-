import { cn, initials } from '@dsvhvn/dung-chung';
import { useState } from 'react';
import { fileUrl } from '../lib/fileUrl';

// Ảnh đại diện của tài khoản: ảnh đã tải lên nếu có, không có hoặc ảnh không mở được thì hiện chữ cái đầu của họ tên.
// Chỉ để trang trí (tên đã nằm cạnh), nên ảnh có alt rỗng.

interface UserAvatarProps {
  fullName: string | null | undefined;
  avatarUrl: string | null | undefined;
  /** Kích thước và cỡ chữ của khung, ví dụ `size-9 type-control`. */
  className?: string;
}

export function UserAvatar({ fullName, avatarUrl, className }: UserAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const src = fileUrl(avatarUrl);
  const showImage = src !== null && src !== failedUrl;

  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-container-high text-on-surface-variant',
        className,
      )}
    >
      {showImage ? (
        <img src={src} alt="" className="size-full object-cover" onError={() => setFailedUrl(src)} />
      ) : (
        initials(fullName)
      )}
    </span>
  );
}
