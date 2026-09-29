import type {
  DiscoveryHome,
  FilterCatalog,
  HeritageCard,
  HeritageMapResult,
  HeritagePin,
  Paged,
  PublicEvent,
  PublicHeritageDetail,
  PublicMedia,
  PublicPhase,
  PublicTimeline,
} from '@dsvhvn/dung-chung/api';
import { envelope, type FetchCall } from './fixtures';

// Dữ liệu mẫu của khám phá di sản công khai, cùng khuôn với phản hồi của backend (/api/v1/public).

export function cardOf(overrides: Partial<HeritageCard> = {}): HeritageCard {
  return {
    id: 1,
    slug: 'quan-the-di-tich-co-do-hue',
    name: 'Quần thể di tích Cố đô Huế',
    shortDescription: 'Hệ thống thành quách, cung điện và lăng tẩm của kinh đô triều Nguyễn.',
    thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Meridian_Gate.jpg',
    provinceId: 20,
    provinceName: 'Thành phố Huế',
    region: 'Trung',
    heritageType: 'TANGIBLE',
    recognitionLevel: 'UNESCO',
    recognizedYear: 1993,
    ...overrides,
  };
}

export const HUE = cardOf();
export const THANG_LONG = cardOf({
  id: 2,
  slug: 'khu-trung-tam-hoang-thanh-thang-long-ha-noi',
  name: 'Khu Trung tâm Hoàng thành Thăng Long – Hà Nội',
  provinceId: 1,
  provinceName: 'Thành phố Hà Nội',
  region: 'Bắc',
  recognizedYear: 2010,
});
export const QUAN_HO = cardOf({
  id: 3,
  slug: 'dan-ca-quan-ho-bac-ninh',
  name: 'Dân ca Quan họ Bắc Ninh',
  provinceId: 11,
  provinceName: 'Tỉnh Bắc Ninh',
  region: 'Bắc',
  heritageType: 'INTANGIBLE',
  recognizedYear: 2009,
  thumbnailUrl: null,
});

export function pagedOf(items: HeritageCard[], overrides: Partial<Paged<HeritageCard>> = {}): Paged<HeritageCard> {
  return { items, page: 1, pageSize: 12, totalItems: items.length, totalPages: 1, ...overrides };
}

export function homeOf(overrides: Partial<DiscoveryHome> = {}): DiscoveryHome {
  return {
    featured: [HUE, THANG_LONG, QUAN_HO],
    totalHeritages: 20,
    byType: [
      { value: 'TANGIBLE', label: 'Vật thể', count: 10 },
      { value: 'INTANGIBLE', label: 'Phi vật thể', count: 6 },
      { value: 'NATURAL', label: 'Thiên nhiên', count: 2 },
      { value: 'MIXED', label: 'Hỗn hợp', count: 1 },
      { value: 'DOCUMENTARY', label: 'Tư liệu', count: 1 },
    ],
    byRegion: [
      { value: 'Bắc', label: 'Miền Bắc', count: 11 },
      { value: 'Trung', label: 'Miền Trung', count: 7 },
      { value: 'Nam', label: 'Miền Nam', count: 2 },
    ],
    ...overrides,
  };
}

export function catalogOf(): FilterCatalog {
  return {
    provinces: [
      { id: 1, code: '01', name: 'Thành phố Hà Nội', region: 'Bắc' },
      { id: 20, code: '46', name: 'Thành phố Huế', region: 'Trung' },
    ],
    regions: [
      { value: 'Bắc', label: 'Miền Bắc' },
      { value: 'Trung', label: 'Miền Trung' },
      { value: 'Nam', label: 'Miền Nam' },
    ],
    heritageTypes: [
      { value: 'TANGIBLE', label: 'Vật thể' },
      { value: 'INTANGIBLE', label: 'Phi vật thể' },
      { value: 'NATURAL', label: 'Thiên nhiên' },
    ],
    recognitionLevels: [
      { value: 'UNESCO', label: 'Di sản thế giới (UNESCO)' },
      { value: 'NATIONAL_SPECIAL', label: 'Quốc gia đặc biệt' },
    ],
    periods: [
      { value: 'NORTHERN_RULE', label: 'Bắc thuộc', fromYear: -179, toYear: 938 },
      { value: 'CONTEMPORARY', label: 'Hiện đại', fromYear: 1945, toYear: null },
    ],
  };
}

export function pinOf(overrides: Partial<HeritagePin> = {}): HeritagePin {
  return {
    id: 1,
    slug: HUE.slug,
    name: HUE.name,
    latitude: 16.4694,
    longitude: 107.5778,
    shortDescription: HUE.shortDescription,
    thumbnailUrl: HUE.thumbnailUrl,
    provinceId: 20,
    provinceName: 'Thành phố Huế',
    heritageType: 'TANGIBLE',
    recognitionLevel: 'UNESCO',
    hasTimeline: true,
    ...overrides,
  };
}

export function mapOf(overrides: Partial<HeritageMapResult> = {}): HeritageMapResult {
  return {
    pins: [pinOf(), pinOf({ id: 2, slug: THANG_LONG.slug, name: THANG_LONG.name, latitude: 21.0325, longitude: 105.8397, hasTimeline: false })],
    totalMatched: 9,
    withoutLocation: 7,
    isTruncated: false,
    ...overrides,
  };
}

export function mediaOf(overrides: Partial<PublicMedia> = {}): PublicMedia {
  return {
    id: 10,
    mediaType: 'IMAGE',
    url: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Meridian_Gate.jpg',
    caption: 'Ngọ Môn – cổng chính phía nam của Hoàng thành Huế',
    credit: 'Vyacheslav Argenberg · CC BY 4.0 · Wikimedia Commons',
    author: 'Vyacheslav Argenberg',
    license: 'CC BY 4.0',
    source: 'Wikimedia Commons',
    isThumbnail: true,
    ...overrides,
  };
}

export function detailOf(overrides: Partial<PublicHeritageDetail> = {}): PublicHeritageDetail {
  return {
    id: 1,
    slug: HUE.slug,
    name: HUE.name,
    shortDescription: HUE.shortDescription,
    content:
      '## Giới thiệu\nQuần thể di tích Cố đô Huế là hệ thống thành quách.\n\n## Lịch sử hình thành\nKinh thành khởi công năm 1805.\n\n## Gợi ý\n- Vẽ sơ đồ ba vòng thành\n- So sánh với Thăng Long',
    heritageType: 'TANGIBLE',
    recognitionLevel: 'UNESCO',
    recognizedYear: 1993,
    province: { id: 20, code: '46', name: 'Thành phố Huế', region: 'Trung' },
    address: 'Phường Phú Xuân, Thành phố Huế',
    latitude: 16.4694,
    longitude: 107.5778,
    thumbnailUrl: mediaOf().url,
    hasTimeline: true,
    media: [
      mediaOf(),
      mediaOf({
        id: 11,
        url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Thien_Mu.jpg',
        caption: 'Tháp Phước Duyên',
        author: 'Lưu Ly',
        license: 'Public domain',
        isThumbnail: false,
      }),
      mediaOf({ id: 12, mediaType: 'VIDEO', url: 'https://example.org/hue.mp4', caption: 'Video giới thiệu' }),
    ],
    references: [
      {
        id: 1,
        heritageId: 1,
        title: 'Quần thể di tích Cố đô Huế — Cục Di sản văn hóa, truy cập 26/09/2026',
        url: 'https://dsvh.gov.vn/quan-the-di-tich-co-do-hue-475',
        sourceType: 'GOV_DOC',
        sourceTypeLabel: 'Văn bản nhà nước',
      },
      {
        id: 2,
        heritageId: 1,
        title: 'Complex of Hué Monuments — UNESCO World Heritage Centre, truy cập 26/09/2026',
        url: 'javascript:alert(1)',
        sourceType: 'WEBSITE',
        sourceTypeLabel: 'Website',
      },
    ],
    timeline: [
      { id: 1, name: 'Từ thủ phủ chúa Nguyễn đến kinh đô triều Nguyễn', startYear: 1558, endYear: 1945, rangeLabel: '1558 – 1945', eventCount: 6 },
      { id: 2, name: 'Bảo tồn và vinh danh', startYear: 1993, endYear: null, rangeLabel: '1993 – nay', eventCount: 3 },
    ],
    ...overrides,
  };
}

export function eventOf(overrides: Partial<PublicEvent> = {}): PublicEvent {
  return {
    id: 100,
    name: 'Xây dựng Kinh thành Huế',
    description: 'Kinh thành khởi công năm 1805, hoàn thành năm 1832.',
    startYear: 1805,
    startMonth: null,
    startDay: null,
    endYear: 1832,
    endMonth: null,
    endDay: null,
    dateLabel: '1805 – 1832',
    media: [],
    ...overrides,
  };
}

export function phaseOf(overrides: Partial<PublicPhase> = {}): PublicPhase {
  return {
    id: 1,
    name: 'Từ thủ phủ chúa Nguyễn đến kinh đô triều Nguyễn',
    description: 'Huế giữ vai trò trung tâm chính trị gần 400 năm.',
    startYear: 1558,
    endYear: 1945,
    rangeLabel: '1558 – 1945',
    events: [
      eventOf({ id: 100, name: 'Mở đầu gần 400 năm', dateLabel: '1558', startYear: 1558, endYear: null, description: null }),
      eventOf({ id: 101 }),
      eventOf({
        id: 102,
        name: 'Xây Ngọ Môn',
        dateLabel: '1833',
        startYear: 1833,
        endYear: null,
        media: [mediaOf({ id: 20, caption: 'Ngọ Môn' })],
      }),
    ],
    ...overrides,
  };
}

export function timelineOf(overrides: Partial<PublicTimeline> = {}): PublicTimeline {
  return {
    heritageId: 1,
    slug: HUE.slug,
    name: HUE.name,
    thumbnailUrl: HUE.thumbnailUrl,
    provinceName: 'Thành phố Huế',
    phases: [
      phaseOf(),
      phaseOf({
        id: 2,
        name: 'Bảo tồn và vinh danh',
        description: 'Các mốc công nhận của UNESCO và Nhà nước.',
        startYear: 1993,
        endYear: null,
        rangeLabel: '1993 – nay',
        events: [
          eventOf({ id: 200, name: 'UNESCO ghi danh', dateLabel: '11/12/1993', startYear: 1993, endYear: null }),
          eventOf({ id: 201, name: 'Xếp hạng di tích quốc gia đặc biệt', dateLabel: '12/08/2009', startYear: 2009, endYear: null }),
        ],
      }),
    ],
    ...overrides,
  };
}

/** Lỗi 404 như máy chủ trả cho di sản nháp, đã ẩn, đã xóa hoặc không có. */
export const heritageNotFound = () => envelope(404, { errorCode: 'BLOCKED', message: 'Không thể xem di sản. Không tìm thấy di sản.' });

type Handler = (call: FetchCall) => Response | undefined;

/** Bộ định tuyến mẫu cho mọi endpoint công khai; test ghi đè từng endpoint bằng `overrides` (khóa là đường dẫn không kể query). */
export function publicApi(overrides: Record<string, () => Response> = {}): Handler {
  return (call) => {
    const path = call.path.split('?')[0]!;
    const override = overrides[path];
    if (override) return override();
    switch (path) {
      case '/public/home':
        return envelope(200, { data: homeOf() });
      case '/public/filters':
        return envelope(200, { data: catalogOf() });
      case '/public/heritages':
        return envelope(200, { data: pagedOf([HUE, THANG_LONG, QUAN_HO], { pageSize: 12 }) });
      case '/public/heritages/map':
        return envelope(200, { data: mapOf() });
      default:
        return undefined;
    }
  };
}
