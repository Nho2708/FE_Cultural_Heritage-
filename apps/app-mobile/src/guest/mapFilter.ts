import type { HeritagePeriod, HeritageType, RecognitionLevel } from '@dsvhvn/dung-chung/api';
import type { EmbedMapFilter } from '@dsvhvn/dung-chung/embed';

// Bộ lọc của bản đồ trong app: loại và vùng chọn bằng chip, tỉnh, cấp xếp hạng và thời kỳ trong bảng "Thêm bộ lọc" (cùng bộ lọc với trang Bản đồ của web).
// Trang bản đồ nhúng đọc bộ lọc từ địa chỉ lúc mở và từ lệnh khi khách đổi bộ lọc, nên app giữ bộ lọc ở dạng này và đổi sang dạng của trang nhúng.

export interface MapFilterState {
  heritageType?: HeritageType;
  region?: string;
  provinceId?: number;
  recognitionLevel?: RecognitionLevel;
  period?: HeritagePeriod;
}

/** Bộ lọc gửi cho trang nhúng: chỉ các trường đang chọn. */
export function toEmbedFilter(state: MapFilterState): EmbedMapFilter {
  const filter: EmbedMapFilter = {};
  if (state.heritageType) filter.heritageType = state.heritageType;
  if (state.region) filter.region = state.region;
  if (state.provinceId) filter.provinceId = state.provinceId;
  if (state.recognitionLevel) filter.recognitionLevel = state.recognitionLevel;
  if (state.period) filter.period = state.period;
  return filter;
}

/** Số ô lọc trong bảng "Thêm bộ lọc" đang chọn (tỉnh, cấp xếp hạng, thời kỳ), để ghi trên nút mở bảng. */
export function extraFilterCount(state: MapFilterState): number {
  return [state.provinceId, state.recognitionLevel, state.period].filter((value) => value !== undefined).length;
}

export function hasMapFilter(state: MapFilterState): boolean {
  return Object.keys(toEmbedFilter(state)).length > 0;
}
