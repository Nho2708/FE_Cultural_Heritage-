import { cn } from '@dsvhvn/dung-chung';
import { Icon } from '@dsvhvn/dung-chung/ui';
import { useState } from 'react';
import { displayImageUrl, safeUrl } from './format';

interface ThumbnailProps {
  url: string | null | undefined;
  /** Mô tả ảnh; để trống cho ảnh trang trí đã có tên di sản ngay cạnh. */
  alt?: string;
  /** Độ rộng cần hiển thị (px) để chọn bản thu nhỏ vừa đủ; mặc định đủ cho thẻ. */
  width?: number;
  /** Ảnh đầu trang (nhìn thấy ngay khi mở): tải ngay, không đợi cuộn tới. */
  priority?: boolean;
  className?: string;
}

/**
 * Ảnh di sản phủ kín khung cha (khung cha phải `relative` và có kích thước). Thử bản thu nhỏ trước, lỗi thì thử ảnh gốc,
 * vẫn lỗi hoặc không có ảnh thì hiện nền giữ chỗ kèm icon.
 */
export function Thumbnail({ url, alt = '', width = 500, priority = false, className }: ThumbnailProps) {
  const original = safeUrl(url);
  const resized = displayImageUrl(url, width);
  const candidates = original ? [...new Set([resized, original])].filter((item): item is string => item !== null) : [];
  const [failed, setFailed] = useState<{ url: string | null | undefined; count: number }>({ url, count: 0 });
  const count = failed.url === url ? failed.count : 0; // đổi ảnh thì đếm lại từ đầu
  const src = candidates[count];

  if (!src) {
    return (
      <div aria-hidden="true" className={cn('absolute inset-0 flex items-center justify-center bg-(--dsv-card-placeholder-bg) text-on-surface-muted', className)}>
        <Icon name="image" size={32} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed({ url, count: count + 1 })}
      className={cn('absolute inset-0 size-full object-cover', className)}
    />
  );
}
