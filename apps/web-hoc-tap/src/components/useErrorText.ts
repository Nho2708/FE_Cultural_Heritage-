import { errorMessage } from '@dsvhvn/dung-chung/api';
import { useI18n } from '../i18n/context';

/**
 * Câu lỗi cho một lỗi tải dữ liệu ở phần công khai. Tiếng Việt dùng câu của máy chủ (đúng danh mục thông báo); ngôn ngữ khác dùng câu
 * lỗi chung trong tệp chuỗi, vì câu của máy chủ chỉ có tiếng Việt.
 */
export function useErrorText() {
  const { language, t } = useI18n();
  return (error: unknown) => (language === 'vi' ? errorMessage(error) : t.common.systemError);
}
