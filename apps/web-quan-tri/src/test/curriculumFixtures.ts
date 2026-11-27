import type { AdminCurriculumTopic, AdminCurriculumTopicHeritage, CurriculumTopic, CurriculumTopicRef, HeritageCard } from '@dsvhvn/dung-chung/api';

// Dữ liệu mẫu của chủ đề chương trình, dựng theo dạng máy chủ trả (tên chủ đề lấy từ dữ liệu thật của lớp 4, lớp 5 và lớp 10).

export function topicRefOf(id: number, overrides: Partial<CurriculumTopicRef> = {}): CurriculumTopicRef {
  return { id, subject: 'Lịch sử và Địa lí', grade: 4, groupTitle: 'Đồng bằng Bắc Bộ', title: 'Thăng Long - Hà Nội', ...overrides };
}

export function topicOf(id: number, overrides: Partial<CurriculumTopic> = {}): CurriculumTopic {
  return { ...topicRefOf(id), description: null, localProvince: false, heritageCount: 5, ...overrides };
}

export function adminTopicOf(id: number, overrides: Partial<AdminCurriculumTopic> = {}): AdminCurriculumTopic {
  return { ...topicOf(id), sortOrder: id, sourceUrl: null, isActive: true, ...overrides };
}

export function adminTopicHeritageOf(id: number, overrides: Partial<AdminCurriculumTopicHeritage> = {}): AdminCurriculumTopicHeritage {
  return { id, slug: `di-san-${id}`, name: `Di sản số ${id}`, provinceName: 'Thành phố Hà Nội', status: 'PUBLISHED', ...overrides };
}

export function heritageCardOf(id: number, overrides: Partial<HeritageCard> = {}): HeritageCard {
  return {
    id,
    slug: `di-san-${id}`,
    name: `Di sản số ${id}`,
    shortDescription: null,
    thumbnailUrl: null,
    provinceId: 1,
    provinceName: 'Thành phố Hà Nội',
    region: 'Bắc',
    heritageType: 'TANGIBLE',
    recognitionLevel: 'UNESCO',
    recognizedYear: 2010,
    ...overrides,
  };
}

/** Một phần chủ đề lớp 4 như máy chủ trả: hai chủ đề "Địa phương em" đứng đầu, rồi các chủ đề của hai vùng. */
export const GRADE_FOUR_TOPICS: CurriculumTopic[] = [
  topicOf(1, { groupTitle: 'Địa phương em (tỉnh, thành phố)', title: 'Thiên nhiên và con người địa phương', localProvince: true, heritageCount: 0 }),
  topicOf(2, { groupTitle: 'Địa phương em (tỉnh, thành phố)', title: 'Lịch sử và văn hoá truyền thống địa phương', localProvince: true, heritageCount: 0 }),
  topicOf(8, { groupTitle: 'Đồng bằng Bắc Bộ', title: 'Sông Hồng và văn minh sông Hồng', heritageCount: 1 }),
  topicOf(9, { groupTitle: 'Đồng bằng Bắc Bộ', title: 'Thăng Long - Hà Nội', heritageCount: 5 }),
  topicOf(13, { groupTitle: 'Bắc Trung Bộ và Nam Trung Bộ', title: 'Cố đô Huế', heritageCount: 3 }),
];
