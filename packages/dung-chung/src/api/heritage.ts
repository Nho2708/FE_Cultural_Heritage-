// Kiểu dữ liệu kho di sản (chỉ quản trị hệ thống dùng ở web quản trị; web học tập dùng lại khi có trang khám phá).
// Enum là chuỗi viết HOA đúng giá trị trong CSDL; giao diện hiện nhãn tiếng Việt (heritage.ts ở gốc gói).

/** `heritages.heritage_type`. */
export type HeritageType = 'TANGIBLE' | 'INTANGIBLE' | 'NATURAL' | 'MIXED' | 'DOCUMENTARY';

/** `heritages.recognition_level`. */
export type RecognitionLevel = 'UNESCO' | 'NATIONAL_SPECIAL' | 'NATIONAL' | 'PROVINCIAL' | 'NONE';

/** `content_status`: nháp, đã xuất bản, đã ẩn. */
export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

/** `media.media_type`: ảnh, video, âm thanh (lưu đường dẫn, không tải tệp lên). */
export type MediaType = 'IMAGE' | 'VIDEO' | 'AUDIO';

/** `heritage_references.source_type`: văn bản nhà nước, website, sách. */
export type ReferenceSourceType = 'GOV_DOC' | 'WEBSITE' | 'BOOK';

/** Tỉnh/thành (34 đơn vị), chỉ đọc. */
export interface Province {
  id: number;
  code: string | null;
  name: string | null;
  region: string | null;
}

/** Dòng của màn hình Quản lý di sản. */
export interface HeritageSummary {
  id: number;
  name: string | null;
  slug: string | null;
  thumbnailUrl: string | null;
  provinceId: number | null;
  provinceName: string | null;
  heritageType: HeritageType | null;
  recognitionLevel: RecognitionLevel | null;
  status: ContentStatus;
  timelineCount: number;
  mediaCount: number;
  referenceCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

/** Thông tin chung gửi lên khi tạo và sửa. `slug` bỏ trống: khi tạo thì sinh từ tên, khi sửa thì giữ nguyên. */
export interface HeritageInput {
  name: string;
  slug: string | null;
  shortDescription: string | null;
  content: string | null;
  heritageType: HeritageType | null;
  recognitionLevel: RecognitionLevel | null;
  recognizedYear: number | null;
  provinceId: number | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
}

export interface MissingRequirement {
  /** Khóa trường thiếu: name, slug, shortDescription, content, heritageType, recognitionLevel, recognizedYear, thumbnailUrl, provinceId, coordinates, references. */
  field: string;
  label: string;
}

/** Trạng thái sẵn sàng xuất bản: `missing` chặn xuất bản, `warnings` chỉ nhắc theo quy trình của nhóm. */
export interface PublishReadiness {
  isReady: boolean;
  missing: MissingRequirement[];
  warnings: string[];
}

export interface HeritageMedia {
  id: number;
  heritageId: number | null;
  eventId: number | null;
  mediaType: MediaType | null;
  url: string | null;
  caption: string | null;
  credit: string | null;
  author: string | null;
  license: string | null;
  source: string | null;
  sortOrder: number | null;
  isThumbnail: boolean;
  /** Ảnh thu nhỏ (WEBP, cạnh dài tối đa 320 điểm ảnh) của ảnh tải lên; null với ảnh thêm bằng đường dẫn. */
  previewUrl?: string | null;
}

export interface HeritageEvent {
  id: number;
  timelineId: number;
  name: string | null;
  description: string | null;
  startYear: number;
  startMonth: number | null;
  startDay: number | null;
  endYear: number | null;
  endMonth: number | null;
  endDay: number | null;
  sortOrder: number | null;
  media: HeritageMedia[];
}

export interface HeritageTimeline {
  id: number;
  heritageId: number;
  name: string | null;
  description: string | null;
  startYear: number | null;
  endYear: number | null;
  sortOrder: number | null;
  events: HeritageEvent[];
}

export interface HeritageReference {
  id: number;
  heritageId: number;
  title: string | null;
  url: string | null;
  sourceType: ReferenceSourceType | null;
  sourceTypeLabel: string;
}

export interface HeritageDetail {
  id: number;
  name: string | null;
  slug: string | null;
  shortDescription: string | null;
  content: string | null;
  heritageType: HeritageType | null;
  recognitionLevel: RecognitionLevel | null;
  recognizedYear: number | null;
  province: Province | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  thumbnailUrl: string | null;
  status: ContentStatus;
  createdAt: string | null;
  updatedAt: string | null;
  readiness: PublishReadiness;
  timelines: HeritageTimeline[];
  media: HeritageMedia[];
  references: HeritageReference[];
}

export interface TimelineInput {
  name: string;
  description: string | null;
  startYear: number | null;
  endYear: number | null;
  sortOrder: number | null;
}

export interface EventInput {
  name: string;
  description: string | null;
  startYear: number;
  startMonth: number | null;
  startDay: number | null;
  endYear: number | null;
  endMonth: number | null;
  endDay: number | null;
  sortOrder: number | null;
}

export interface MediaInput {
  mediaType: MediaType;
  url: string;
  caption: string | null;
  author: string;
  license: string;
  source: string;
  sortOrder: number | null;
  /** Chỉ dùng cho ảnh của di sản: true chọn, false bỏ chọn, bỏ trống giữ nguyên. */
  setAsThumbnail?: boolean;
}

export interface ReferenceInput {
  title: string;
  url: string | null;
  sourceType: ReferenceSourceType;
}
