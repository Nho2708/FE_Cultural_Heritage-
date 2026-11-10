import type { ContentStatus } from './heritage';
import type { HeritageCard } from './discovery';

// Chủ đề chương trình (bản gọn): các chủ đề của môn học theo Chương trình giáo dục phổ thông 2018 mà giáo viên dùng để chọn di sản
// khi tạo bài. Chủ đề thuộc một khối; chủ đề "Địa phương em" (`localProvince`) không gắn di sản cố định vì phụ thuộc tỉnh của trường.

/** Dạng ngắn của chủ đề, gắn vào bài học, bài mẫu và chi tiết di sản (chỉ đọc). */
export interface CurriculumTopicRef {
  id: number;
  subject: string;
  grade: number;
  /** Chủ đề lớn (nhóm), ví dụ "Đồng bằng Bắc Bộ". */
  groupTitle: string;
  /** Nội dung của chủ đề, ví dụ "Thăng Long - Hà Nội". */
  title: string;
}

/** Chủ đề cho giáo viên chọn: chỉ chủ đề đang dùng; `heritageCount` chỉ đếm di sản đang xuất bản. */
export interface CurriculumTopic extends CurriculumTopicRef {
  description: string | null;
  localProvince: boolean;
  heritageCount: number;
}

export interface CurriculumTopicList {
  items: CurriculumTopic[];
}

/** Di sản của một chủ đề cho giáo viên (cùng dạng thẻ di sản công khai, chỉ di sản đang xuất bản). */
export interface CurriculumTopicHeritages {
  topic: CurriculumTopic;
  items: HeritageCard[];
}

/** Dòng của trang Chủ đề chương trình (quản trị hệ thống); `heritageCount` đếm mọi di sản chưa xóa. */
export interface AdminCurriculumTopic extends CurriculumTopic {
  sortOrder: number;
  sourceUrl: string | null;
  isActive: boolean;
}

export interface AdminCurriculumTopicQuery {
  grade?: number | '';
  includeInactive?: boolean;
}

/** Thân tạo và sửa chủ đề. */
export interface CurriculumTopicInput {
  subject: string;
  grade: number;
  groupTitle: string;
  title: string;
  description?: string | null;
  localProvince: boolean;
  sortOrder: number;
  sourceUrl?: string | null;
}

/** Di sản của chủ đề ở góc nhìn quản trị: kể cả nháp và đã ẩn. */
export interface AdminCurriculumTopicHeritage {
  id: number;
  slug: string | null;
  name: string | null;
  provinceName: string | null;
  status: ContentStatus;
}

export interface AdminCurriculumTopicHeritages {
  topic: AdminCurriculumTopic;
  items: AdminCurriculumTopicHeritage[];
}
