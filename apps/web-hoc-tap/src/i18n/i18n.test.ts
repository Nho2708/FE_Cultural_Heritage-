import { describe, expect, it } from 'vitest';
import { detectLanguage, LANGUAGES, parseLanguage } from './languages';
import { coordinatesText, formatCount, formatYearText, localizeDateText, periodRangeText } from './format';
import { STRINGS } from './strings';
import { HERITAGE_TYPE_NAME, PERIOD_NAME, PROVINCE_COUNT, provinceName, RECOGNITION_LEVEL_NAME, REGION_NAME } from './taxonomy';

// Năm ngôn ngữ của phần công khai: đọc mã (cùng quy tắc với máy chủ), mặc định theo trình duyệt, tệp chuỗi đủ khóa, tên danh mục và định dạng.

describe('đọc mã ngôn ngữ', () => {
  it('nhận mã ngắn và dạng vùng của năm ngôn ngữ', () => {
    expect(parseLanguage('vi')).toBe('vi');
    expect(parseLanguage('en-US')).toBe('en');
    expect(parseLanguage('ko-KR')).toBe('ko');
    expect(parseLanguage('ja-JP')).toBe('ja');
    expect(parseLanguage('zh')).toBe('zh-Hans');
    expect(parseLanguage('zh-CN')).toBe('zh-Hans');
    expect(parseLanguage('zh-SG')).toBe('zh-Hans');
    expect(parseLanguage('zh-Hans-SG')).toBe('zh-Hans');
    expect(parseLanguage('zh_CN')).toBe('zh-Hans');
  });

  it('tiếng Trung phồn thể và ngôn ngữ khác không thuộc năm ngôn ngữ', () => {
    for (const tag of ['zh-TW', 'zh-HK', 'zh-Hant', 'zh-Hant-TW', 'fr', 'th-TH', '', undefined, null]) {
      expect(parseLanguage(tag)).toBeUndefined();
    }
  });

  it('mặc định lần đầu mở theo ngôn ngữ trình duyệt đầu tiên thuộc năm ngôn ngữ, không có thì tiếng Anh', () => {
    expect(detectLanguage(['ko-KR', 'en'])).toBe('ko');
    expect(detectLanguage(['fr-FR', 'zh-TW', 'ja'])).toBe('ja');
    expect(detectLanguage(['fr-FR', 'th'])).toBe('en');
    expect(detectLanguage([])).toBe('en');
    expect(detectLanguage(undefined)).toBe('en');
  });

  it('danh mục năm ngôn ngữ viết bằng chính ngôn ngữ đó; chỉ tiếng Hàn, Trung, Nhật là bản dịch máy', () => {
    expect(LANGUAGES.map((language) => language.nativeName)).toEqual(['Tiếng Việt', 'English', '한국어', '简体中文', '日本語']);
    expect(LANGUAGES.filter((language) => language.isMachineOnly).map((language) => language.code)).toEqual(['ko', 'zh-Hans', 'ja']);
    expect(LANGUAGES.map((language) => language.speechTag)).toEqual(['vi-VN', 'en-US', 'ko-KR', 'zh-CN', 'ja-JP']);
  });
});

/** Mô tả hình dạng của một cây chuỗi: tên khóa; hàm ghi kèm số tham số. */
function shapeOf(value: unknown): unknown {
  if (typeof value === 'function') return `fn/${value.length}`;
  if (typeof value === 'string') return 'text';
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, shapeOf(child)]),
    );
  }
  return typeof value;
}

describe('tệp chuỗi giao diện', () => {
  it('cả năm ngôn ngữ có đúng các khóa của tiếng Việt, hàm có cùng số tham số', () => {
    const vi = shapeOf(STRINGS.vi);
    for (const code of ['en', 'ko', 'zh-Hans', 'ja'] as const) expect(shapeOf(STRINGS[code])).toEqual(vi);
  });

  it('không chuỗi nào để trống', () => {
    const empty: string[] = [];
    const walk = (value: unknown, path: string) => {
      if (typeof value === 'string') {
        if (value.trim() === '') empty.push(path);
      } else if (value && typeof value === 'object') {
        for (const [key, child] of Object.entries(value)) walk(child, `${path}.${key}`);
      }
    };
    for (const [code, strings] of Object.entries(STRINGS)) walk(strings, code);
    expect(empty).toEqual([]);
  });

  it('nhãn hai quần đảo luôn kèm Việt Nam ở mọi ngôn ngữ', () => {
    expect(STRINGS.vi.map.base.hoangSa).toContain('Việt Nam');
    expect(STRINGS.en.map.base.truongSa).toContain('Viet Nam');
    expect(STRINGS.ko.map.base.hoangSa).toContain('베트남');
    expect(STRINGS['zh-Hans'].map.base.truongSa).toContain('越南');
    expect(STRINGS.ja.map.base.hoangSa).toContain('ベトナム');
  });

  it('câu thông báo thiếu bản dịch và nhãn bản dịch máy có đủ ở mỗi ngôn ngữ', () => {
    expect(STRINGS.vi.language.fallbackPage('tiếng Anh')).toBe('Nội dung này chưa có bản tiếng Anh. Đang hiển thị bản tiếng Việt.');
    expect(STRINGS.en.language.fallbackPage('English')).toBe('This content is not yet available in English. Showing the Vietnamese version.');
    expect(STRINGS.vi.language.machineHint).toBe('Bản dịch máy, có thể chưa chính xác.');
    expect(STRINGS.vi.detail.noSummary).toBe('Di sản này chưa có tóm tắt. Bạn vẫn có thể đọc nội dung đầy đủ bên dưới.');
  });
});

describe('tên danh mục theo ngôn ngữ', () => {
  it('loại, cấp xếp hạng, vùng, thời kỳ có tên ở cả năm ngôn ngữ', () => {
    for (const code of ['vi', 'en', 'ko', 'zh-Hans', 'ja'] as const) {
      expect(Object.values(HERITAGE_TYPE_NAME[code]).every(Boolean)).toBe(true);
      expect(Object.values(RECOGNITION_LEVEL_NAME[code]).every(Boolean)).toBe(true);
      expect(Object.values(REGION_NAME[code]).every(Boolean)).toBe(true);
      expect(Object.values(PERIOD_NAME[code]).every(Boolean)).toBe(true);
    }
    expect(HERITAGE_TYPE_NAME.en.INTANGIBLE).toBe('Intangible');
    expect(RECOGNITION_LEVEL_NAME.ko.UNESCO).toBe('세계유산(UNESCO)');
  });

  it('34 tỉnh, thành phố: tên máy chủ trả (tiếng Việt) được đổi sang từng ngôn ngữ; tên lạ giữ nguyên', () => {
    expect(PROVINCE_COUNT).toBe(34);
    expect(provinceName('Thành phố Huế', 'vi')).toBe('Thành phố Huế');
    expect(provinceName('Thành phố Huế', 'en')).toBe('Hue City');
    expect(provinceName('Thành phố Hà Nội', 'ko')).toBe('하노이시');
    expect(provinceName('Tỉnh Quảng Ninh', 'zh-Hans')).toBe('广宁省');
    expect(provinceName('Thành phố Hồ Chí Minh', 'ja')).toBe('ホーチミン市');
    expect(provinceName('Tỉnh Không Có', 'en')).toBe('Tỉnh Không Có');
    expect(provinceName(null, 'en')).toBeNull();
  });
});

describe('định dạng theo ngôn ngữ', () => {
  const { vi, en, ko, ja } = STRINGS;
  const zh = STRINGS['zh-Hans'];

  it('số theo cách viết của ngôn ngữ', () => {
    expect(formatCount(1234567, 'vi')).toBe('1.234.567');
    expect(formatCount(1234567, 'en')).toBe('1,234,567');
  });

  it('năm âm là trước Công nguyên, đặt trước hay sau năm tùy ngôn ngữ', () => {
    expect(formatYearText(-179, vi, 'vi')).toBe('179 TCN');
    expect(formatYearText(-179, en, 'en')).toBe('179 BCE');
    expect(formatYearText(-179, ko, 'ko')).toBe('기원전 179');
    expect(formatYearText(-179, zh, 'zh-Hans')).toBe('公元前179');
    expect(formatYearText(-179, ja, 'ja')).toBe('紀元前179');
    expect(formatYearText(1010, en, 'en')).toBe('1010');
  });

  it('chữ ngày tháng máy chủ trả sẵn được đổi dấu hiệu TCN và nay; tiếng Việt giữ nguyên', () => {
    expect(localizeDateText('179 TCN – 938', vi, 'vi')).toBe('179 TCN – 938');
    expect(localizeDateText('179 TCN – 938', en, 'en')).toBe('179 BCE – 938');
    expect(localizeDateText('1962 – nay', en, 'en')).toBe('1962 – present');
    expect(localizeDateText('1962 – nay', ja, 'ja')).toBe('1962 – 現在');
    expect(localizeDateText('15/03/1010', ko, 'ko')).toBe('15/03/1010');
    expect(localizeDateText('2879 TCN – 111 TCN', zh, 'zh-Hans')).toBe('公元前2879 – 公元前111');
  });

  it('khoảng năm của thời kỳ', () => {
    expect(periodRangeText({ fromYear: -179, toYear: 938 }, vi, 'vi')).toBe('179 TCN – 938');
    expect(periodRangeText({ fromYear: null, toYear: -180 }, vi, 'vi')).toBe('đến 180 TCN');
    expect(periodRangeText({ fromYear: 1945, toYear: null }, en, 'en')).toBe('from 1945');
    expect(periodRangeText({ fromYear: null, toYear: null }, en, 'en')).toBe('');
  });

  it('tọa độ: dấu phẩy thập phân và B/N/Đ/T ở tiếng Việt, dấu chấm và N/S/E/W ở ngôn ngữ khác', () => {
    expect(coordinatesText(16.4694, 107.5778, vi, 'vi')).toBe('16,4694° B · 107,5778° Đ');
    expect(coordinatesText(-1.5, -70, vi, 'vi')).toBe('1,5000° N · 70,0000° T');
    expect(coordinatesText(16.4694, 107.5778, en, 'en')).toBe('16.4694° N · 107.5778° E');
    expect(coordinatesText(-1.5, -70, en, 'en')).toBe('1.5000° S · 70.0000° W');
  });
});
