import type { GuestRecommendation, GuestRecommendations } from '@dsvhvn/dung-chung/api';

// "Gợi ý cho bạn" của khách: máy chủ chọn tối đa 6 di sản giống những gì khách đã tìm, xem, nghe (theo lịch sử của mã thiết bị) và ghi lý do bằng mã điểm chung;
// app ghép câu theo ngôn ngữ đang chọn. Các hàm thuần ở đây quyết định phần nào của kết quả được hiện.

export const SUGGESTION_LIMIT = 6;

/** Hai tab của màn hình "Xem tất cả": gợi ý theo lịch sử và di sản gần bạn. */
export type SuggestionTab = 'goi-y' | 'gan-ban';

/** Tham số `tab` trên địa chỉ màn hình; giá trị lạ hoặc thiếu thì mở tab gợi ý. */
export function asSuggestionTab(value: string | undefined): SuggestionTab {
  return value === 'gan-ban' ? 'gan-ban' : 'goi-y';
}

/** Các gợi ý được hiện: bỏ di sản đang xem (nếu có) và cắt còn tối đa 6. */
export function visibleSuggestions(items: readonly GuestRecommendation[] | undefined, exceptSlug?: string, limit = SUGGESTION_LIMIT): GuestRecommendation[] {
  return (items ?? []).filter((item) => item.heritage.slug !== exceptSlug).slice(0, limit);
}

/**
 * Câu dẫn của khối gợi ý: có lịch sử thì nói gợi ý theo sở thích; chưa có lịch sử thì máy chủ trả di sản nổi bật nên báo rõ đó là di sản nổi bật.
 */
export function suggestionIntro(data: Pick<GuestRecommendations, 'isPersonalized'>): 'personal' | 'featured' {
  return data.isPersonalized ? 'personal' : 'featured';
}
