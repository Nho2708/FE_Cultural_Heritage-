import { describe, expect, it } from 'vitest';
import {
  composeCredit,
  countWords,
  endsBeforeStart,
  isAllowedLicense,
  isValidDay,
  isValidSlug,
  parseDecimal,
  parseInteger,
  slugify,
  validateEvent,
  validateHeritage,
  validateMedia,
  validateReference,
  validateTimeline,
  type EventValues,
  type HeritageValues,
  type MediaValues,
  type TimelineValues,
} from './heritage';

// Cùng luật và cùng câu với validator backend của kho di sản (HeritageRules, HeritageRequestValidator, TimelineRequestValidator,
// EventRequestValidator, MediaRequestValidator, ReferenceRequestValidator).

const YEAR = 2026;

const heritage = (overrides: Partial<HeritageValues> = {}): HeritageValues => ({
  name: 'Quần thể di tích Cố đô Huế',
  slug: '',
  shortDescription: '',
  content: '',
  heritageType: '',
  recognitionLevel: '',
  recognizedYear: '',
  provinceId: '',
  address: '',
  latitude: '',
  longitude: '',
  placeId: '',
  ...overrides,
});

describe('đường dẫn và đếm từ', () => {
  it('sinh đường dẫn từ tên: bỏ dấu, đ thành d, chữ thường, nối bằng gạch ngang', () => {
    expect(slugify('Quần thể di tích Cố đô Huế')).toBe('quan-the-di-tich-co-do-hue');
    expect(slugify('  Thành nhà Hồ (Thanh Hóa) – 2011 ')).toBe('thanh-nha-ho-thanh-hoa-2011');
    expect(slugify('Đền Hùng')).toBe('den-hung');
    expect(slugify('!!!')).toBe('');
    expect(slugify(null)).toBe('');
    expect(slugify('a'.repeat(300))).toHaveLength(255);
  });

  it('đường dẫn hợp lệ: chữ thường không dấu, chữ số, gạch ngang giữa các đoạn', () => {
    expect(isValidSlug('co-do-hue-2')).toBe(true);
    expect(isValidSlug('Co-do')).toBe(false);
    expect(isValidSlug('-co-do')).toBe(false);
    expect(isValidSlug('co--do')).toBe(false);
    expect(isValidSlug('cố-đô')).toBe(false);
    expect(isValidSlug('')).toBe(false);
  });

  it('đếm từ bỏ qua mã đánh dấu như ##', () => {
    expect(countWords('## Tiêu đề\n\nMột hai   ba')).toBe(5);
    expect(countWords('   ')).toBe(0);
    expect(countWords(null)).toBe(0);
  });

  it('đọc số từ ô nhập: rỗng là null, sai dạng là NaN, chấp nhận dấu phẩy thập phân', () => {
    expect(parseInteger(' -258 ')).toBe(-258);
    expect(parseInteger('')).toBeNull();
    expect(parseInteger('12a')).toBeNaN();
    expect(parseInteger('1.5')).toBeNaN();
    expect(parseDecimal('16,4637')).toBe(16.4637);
    expect(parseDecimal('107.5909')).toBe(107.5909);
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNaN();
  });
});

describe('ngày và thứ tự thời điểm', () => {
  it('ngày có thật theo tháng, kể cả năm nhuận và năm âm; chỉ nhập ngày khi đã có tháng', () => {
    expect(isValidDay(2024, 2, 29)).toBe(true);
    expect(isValidDay(2023, 2, 29)).toBe(false);
    expect(isValidDay(1900, 2, 29)).toBe(false);
    expect(isValidDay(-4, 2, 29)).toBe(true);
    expect(isValidDay(2026, 4, 31)).toBe(false);
    expect(isValidDay(2026, null, 5)).toBe(false);
    expect(isValidDay(2026, null, null)).toBe(true);
  });

  it('kết thúc chỉ so tới mức chi tiết mà cả hai bên cùng có', () => {
    const at = (year: number, month: number | null = null, day: number | null = null) => ({ year, month, day });
    expect(endsBeforeStart(at(1805), at(1803))).toBe(true);
    expect(endsBeforeStart(at(1805, 6), at(1805))).toBe(false);
    expect(endsBeforeStart(at(1805, 6), at(1805, 3))).toBe(true);
    expect(endsBeforeStart(at(1805, 6, 10), at(1805, 6))).toBe(false);
    expect(endsBeforeStart(at(1805, 6, 10), at(1805, 6, 9))).toBe(true);
    expect(endsBeforeStart(at(-300), at(-258))).toBe(false);
  });
});

describe('thông tin chung của di sản', () => {
  it('chỉ tên là bắt buộc để lưu nháp', () => {
    expect(validateHeritage(heritage(), YEAR)).toEqual({});
    expect(validateHeritage(heritage({ name: '  ' }), YEAR)).toEqual({ name: 'Vui lòng nhập tên di sản.' });
    expect(validateHeritage(heritage({ name: '---' }), YEAR).name).toBe(
      'Tên di sản không hợp lệ: phải có ít nhất một chữ cái hoặc chữ số.',
    );
    expect(validateHeritage(heritage({ name: 'a'.repeat(256) }), YEAR).name).toBe('Tên di sản không hợp lệ: tối đa 255 ký tự.');
  });

  it('đường dẫn tự nhập phải đúng dạng; bỏ trống thì hợp lệ', () => {
    expect(validateHeritage(heritage({ slug: 'co-do-hue' }), YEAR).slug).toBeUndefined();
    expect(validateHeritage(heritage({ slug: 'Cố đô' }), YEAR).slug).toBe(
      'Đường dẫn không hợp lệ: chỉ gồm chữ thường không dấu, chữ số và dấu gạch ngang giữa các đoạn, tối đa 255 ký tự.',
    );
  });

  it('mô tả ngắn tối đa 300 ký tự', () => {
    expect(validateHeritage(heritage({ shortDescription: 'a'.repeat(300) }), YEAR).shortDescription).toBeUndefined();
    expect(validateHeritage(heritage({ shortDescription: 'a'.repeat(301) }), YEAR).shortDescription).toBe(
      'Mô tả ngắn không hợp lệ: tối đa 300 ký tự.',
    );
  });

  it('năm công nhận là năm dương lịch không lớn hơn năm hiện tại', () => {
    const rule = 'Năm công nhận không hợp lệ: phải là năm dương lịch không lớn hơn năm hiện tại.';
    expect(validateHeritage(heritage({ recognizedYear: '1993' }), YEAR).recognizedYear).toBeUndefined();
    expect(validateHeritage(heritage({ recognizedYear: '2027' }), YEAR).recognizedYear).toBe(rule);
    expect(validateHeritage(heritage({ recognizedYear: '0' }), YEAR).recognizedYear).toBe(rule);
    expect(validateHeritage(heritage({ recognizedYear: 'abc' }), YEAR).recognizedYear).toBe(rule);
  });

  it('tọa độ trong lãnh thổ Việt Nam, nhập đủ cả hai hoặc bỏ trống cả hai', () => {
    expect(validateHeritage(heritage({ latitude: '16,4637', longitude: '107.5909' }), YEAR)).toEqual({});
    expect(validateHeritage(heritage({ latitude: '30', longitude: '107' }), YEAR).latitude).toBe(
      'Vĩ độ không hợp lệ: phải từ 8,0 đến 23,5.',
    );
    expect(validateHeritage(heritage({ latitude: '16', longitude: '120' }), YEAR).longitude).toBe(
      'Kinh độ không hợp lệ: phải từ 102,0 đến 117,5.',
    );
    const pair = 'Tọa độ không hợp lệ: phải nhập đủ cả vĩ độ và kinh độ hoặc bỏ trống cả hai.';
    expect(validateHeritage(heritage({ latitude: '16' }), YEAR).longitude).toBe(pair);
    expect(validateHeritage(heritage({ longitude: '107' }), YEAR).latitude).toBe(pair);
  });
});

describe('giai đoạn', () => {
  const timeline = (overrides: Partial<TimelineValues> = {}): TimelineValues => ({
    name: 'Xây dựng Kinh thành',
    description: '',
    startYear: '',
    endYear: '',
    sortOrder: '',
    ...overrides,
  });

  it('tên bắt buộc, năm không bắt buộc', () => {
    expect(validateTimeline(timeline(), YEAR)).toEqual({});
    expect(validateTimeline(timeline({ name: '' }), YEAR)).toEqual({ name: 'Vui lòng nhập tên giai đoạn.' });
  });

  it('năm âm là trước Công nguyên; năm kết thúc không nhỏ hơn năm bắt đầu', () => {
    expect(validateTimeline(timeline({ startYear: '-258', endYear: '-179' }), YEAR)).toEqual({});
    expect(validateTimeline(timeline({ startYear: '1833', endYear: '1802' }), YEAR).endYear).toBe(
      'Năm kết thúc không hợp lệ: không được nhỏ hơn năm bắt đầu.',
    );
    expect(validateTimeline(timeline({ startYear: '-200000' }), YEAR).startYear).toBe(
      'Năm bắt đầu không hợp lệ: phải từ -100000 đến năm hiện tại (năm âm là trước Công nguyên).',
    );
    expect(validateTimeline(timeline({ endYear: '2030' }), YEAR).endYear).toContain('Năm kết thúc không hợp lệ');
  });

  it('thứ tự từ 0 đến 1.000.000', () => {
    expect(validateTimeline(timeline({ sortOrder: '2' }), YEAR)).toEqual({});
    expect(validateTimeline(timeline({ sortOrder: '-1' }), YEAR).sortOrder).toBe('Thứ tự không hợp lệ: phải từ 0 đến 1.000.000.');
  });
});

describe('sự kiện', () => {
  const event = (overrides: Partial<EventValues> = {}): EventValues => ({
    name: 'Xây Ngọ Môn',
    description: '',
    startYear: '1833',
    startMonth: '',
    startDay: '',
    endYear: '',
    endMonth: '',
    endDay: '',
    sortOrder: '',
    ...overrides,
  });

  it('tên và năm bắt đầu bắt buộc', () => {
    expect(validateEvent(event(), YEAR)).toEqual({});
    expect(validateEvent(event({ name: ' ', startYear: '' }), YEAR)).toEqual({
      name: 'Vui lòng nhập tên sự kiện.',
      startYear: 'Vui lòng nhập năm bắt đầu.',
    });
  });

  it('tháng từ 1 đến 12, ngày phải có thật và chỉ nhập khi đã có tháng', () => {
    expect(validateEvent(event({ startMonth: '13' }), YEAR).startMonth).toBe('Tháng bắt đầu không hợp lệ: phải từ 1 đến 12.');
    const dayRule = 'phải là ngày có thật của tháng và chỉ nhập khi đã có tháng';
    expect(validateEvent(event({ startDay: '5' }), YEAR).startDay).toBe(`Ngày bắt đầu không hợp lệ: ${dayRule}.`);
    expect(validateEvent(event({ startMonth: '2', startDay: '30' }), YEAR).startDay).toBe(`Ngày bắt đầu không hợp lệ: ${dayRule}.`);
    expect(validateEvent(event({ startYear: '1832', startMonth: '2', startDay: '29' }), YEAR)).toEqual({});
  });

  it('tháng kết thúc chỉ nhập khi đã có năm kết thúc', () => {
    expect(validateEvent(event({ endMonth: '6' }), YEAR).endMonth).toBe(
      'Tháng kết thúc không hợp lệ: chỉ nhập khi đã có năm kết thúc.',
    );
  });

  it('thời điểm kết thúc không trước thời điểm bắt đầu (so tới mức chi tiết cả hai bên cùng có)', () => {
    const before = 'Thời điểm kết thúc không hợp lệ: không được trước thời điểm bắt đầu.';
    expect(validateEvent(event({ startYear: '1805', endYear: '1803' }), YEAR).endYear).toBe(before);
    expect(
      validateEvent(event({ startYear: '1805', startMonth: '6', endYear: '1805', endMonth: '3' }), YEAR).endYear,
    ).toBe(before);
    expect(validateEvent(event({ startYear: '1805', startMonth: '6', endYear: '1805' }), YEAR)).toEqual({});
    expect(validateEvent(event({ startYear: '1805', endYear: '1832' }), YEAR)).toEqual({});
  });
});

describe('ảnh và ghi công', () => {
  const media = (overrides: Partial<MediaValues> = {}): MediaValues => ({
    mediaType: 'IMAGE',
    url: 'https://upload.wikimedia.org/ngo-mon.jpg',
    caption: '',
    author: 'Vyacheslav Argenberg',
    license: 'CC BY 4.0',
    source: 'Wikimedia Commons',
    sortOrder: '',
    ...overrides,
  });

  it('giấy phép được dùng: CC0, CC BY, CC BY-SA, phạm vi công cộng, ảnh nhóm tự chụp', () => {
    for (const license of ['CC0 1.0', 'CC BY 4.0', 'cc by-sa 3.0', 'Phạm vi công cộng', 'Public domain', 'Ảnh nhóm tự chụp']) {
      expect(isAllowedLicense(license)).toBe(true);
    }
    for (const license of ['CC BY-NC 4.0', 'CC BY-ND 4.0', 'CC BY-NC-SA 4.0', 'Copyright', '']) {
      expect(isAllowedLicense(license)).toBe(false);
    }
  });

  it('ghi công đủ ba phần: tác giả, giấy phép, nguồn', () => {
    expect(validateMedia(media())).toEqual({});
    expect(validateMedia(media({ author: '', license: '', source: '' }))).toEqual({
      author: 'Vui lòng nhập tác giả.',
      license: 'Vui lòng nhập giấy phép.',
      source: 'Vui lòng nhập nguồn ảnh.',
    });
    expect(composeCredit(' A ', 'CC BY 4.0', ' Nguồn ')).toBe('A · CC BY 4.0 · Nguồn');
  });

  it('giấy phép hạn chế bị từ chối', () => {
    expect(validateMedia(media({ license: 'CC BY-NC 4.0' })).license).toBe(
      'Giấy phép không hợp lệ: chỉ dùng CC0, CC BY, CC BY-SA, phạm vi công cộng (public domain) hoặc ảnh nhóm tự chụp.',
    );
  });

  it('ba phần không chứa dấu ngăn và ghép lại tối đa 255 ký tự', () => {
    expect(validateMedia(media({ author: 'A · B' })).author).toBe('Tác giả không hợp lệ: không chứa dấu "·".');
    expect(validateMedia(media({ source: 'x'.repeat(250) })).author).toBe(
      'Ghi công không hợp lệ: tác giả, giấy phép và nguồn ghép lại tối đa 255 ký tự.',
    );
  });

  it('đường dẫn phải là http hoặc https', () => {
    expect(validateMedia(media({ url: '' })).url).toBe('Vui lòng nhập đường dẫn.');
    expect(validateMedia(media({ url: 'ftp://x.vn/a.jpg' })).url).toBe(
      'Đường dẫn không hợp lệ: phải là đường dẫn http hoặc https, tối đa 500 ký tự.',
    );
    expect(validateMedia(media({ url: 'không phải đường dẫn' })).url).toContain('Đường dẫn không hợp lệ');
  });
});

describe('nguồn tham chiếu', () => {
  it('tiêu đề và loại nguồn bắt buộc; website bắt buộc có đường dẫn', () => {
    expect(validateReference({ title: 'Sách A', url: '', sourceType: 'BOOK' })).toEqual({});
    expect(validateReference({ title: '', url: '', sourceType: '' })).toEqual({
      title: 'Vui lòng nhập tiêu đề nguồn.',
      sourceType: 'Vui lòng nhập loại nguồn.',
    });
    expect(validateReference({ title: 'Trang A', url: '', sourceType: 'WEBSITE' }).url).toBe(
      'Vui lòng nhập đường dẫn của nguồn website.',
    );
    expect(validateReference({ title: 'Trang A', url: 'https://dsvh.gov.vn/a', sourceType: 'WEBSITE' })).toEqual({});
    expect(validateReference({ title: 'Trang A', url: 'abc', sourceType: 'BOOK' }).url).toContain('Đường dẫn không hợp lệ');
  });
});
