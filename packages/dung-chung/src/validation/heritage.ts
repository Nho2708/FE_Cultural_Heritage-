import { validateImageFile, type PickedFile } from '../files';
import { MESSAGES } from '../messages';
import type { MediaType, ReferenceSourceType } from '../api/heritage';

// Kiểm tra phía giao diện cho kho di sản, cùng luật và cùng câu với validator của backend (HeritageRequestValidator,
// TimelineRequestValidator, EventRequestValidator, MediaRequestValidator, ReferenceRequestValidator, HeritageRules).
// Khóa lỗi trùng tên trường của request để lỗi của máy chủ và lỗi ở đây hiện chung một chỗ. Backend vẫn là nơi quyết định.

export const HERITAGE_LIMITS = {
  name: 255,
  slug: 255,
  shortDescription: 300,
  content: 200_000,
  address: 500,
  placeId: 255,
  url: 500,
  caption: 500,
  credit: 255,
  referenceTitle: 500,
  timelineName: 255,
  eventName: 255,
  longText: 100_000,
  /** Nội dung tối thiểu để xuất bản. */
  minContentWords: 200,
  minYear: -100_000,
  maxSortOrder: 1_000_000,
  latitude: { min: 8.0, max: 23.5 },
  longitude: { min: 102.0, max: 117.5 },
} as const;

/** Dấu ngăn ba phần của ghi công "tác giả · giấy phép · nguồn". */
export const CREDIT_SEPARATOR = ' · ';

/** Đường dẫn sinh từ tên: bỏ dấu (đ thành d), chữ thường, mọi đoạn ký tự khác chữ và số nối bằng một dấu gạch ngang (như backend). */
export function slugify(text: string | null | undefined): string {
  if (!text?.trim()) return '';
  const folded = text.normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd').toLowerCase();
  return folded
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, HERITAGE_LIMITS.slug)
    .replace(/-+$/, '');
}

export function isValidSlug(slug: string): boolean {
  return slug.length >= 1 && slug.length <= HERITAGE_LIMITS.slug && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

/** Số từ của nội dung; mã đánh dấu Markdown như "##" không tính là từ. */
export function countWords(content: string | null | undefined): number {
  if (!content?.trim()) return 0;
  return content.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

/** Số nguyên từ ô nhập: rỗng là null, sai dạng là NaN. */
export function parseInteger(text: string): number | null {
  const value = text.trim();
  if (value === '') return null;
  return /^-?\d+$/.test(value) ? Number(value) : Number.NaN;
}

/** Số thập phân từ ô nhập, chấp nhận dấu phẩy của tiếng Việt: rỗng là null, sai dạng là NaN. */
export function parseDecimal(text: string): number | null {
  const value = text.trim().replace(',', '.');
  if (value === '') return null;
  return /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : Number.NaN;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Đường dẫn ảnh trong kho tệp của nền tảng (dạng `/files/images/{32 ký tự}.jpg`), do hệ thống sinh khi tải ảnh lên. */
export function isStoredImagePath(value: string): boolean {
  return /^(.*\/files\/images\/[0-9a-f]{32})\.(jpg|png|webp)$/.test(value.trim());
}

const isBlank = (value: string) => value.trim() === '';
const isNumber = (n: number | null): n is number => n !== null && !Number.isNaN(n);

function daysInMonth(year: number, month: number): number {
  const y = Math.abs(year);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  if (month === 2) return leap ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** Ngày có thật theo tháng (năm nhuận theo lịch Gregorian, áp dụng cả năm âm); chỉ nhập ngày khi đã có tháng. */
export function isValidDay(year: number, month: number | null, day: number | null): boolean {
  if (day === null) return true;
  if (month === null) return false;
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

interface Moment {
  year: number;
  month: number | null;
  day: number | null;
}

/** Kết thúc có trước bắt đầu không, chỉ so tới mức chi tiết mà cả hai bên cùng có. */
export function endsBeforeStart(start: Moment, end: Moment): boolean {
  if (end.year !== start.year) return end.year < start.year;
  if (start.month === null || end.month === null) return false;
  if (end.month !== start.month) return end.month < start.month;
  if (start.day === null || end.day === null) return false;
  return end.day < start.day;
}

const YEAR_RULE = `phải từ ${HERITAGE_LIMITS.minYear} đến năm hiện tại (năm âm là trước Công nguyên)`;

function validateEraYear(text: string, label: string, currentYear: number): string | null {
  const year = parseInteger(text);
  if (year === null) return null;
  return Number.isNaN(year) || year < HERITAGE_LIMITS.minYear || year > currentYear ? MESSAGES.invalid(label, YEAR_RULE) : null;
}

function validateMonth(text: string, label: string): string | null {
  const month = parseInteger(text);
  if (month === null) return null;
  return Number.isNaN(month) || month < 1 || month > 12 ? MESSAGES.invalid(label, 'phải từ 1 đến 12') : null;
}

function validateSortOrder(text: string): string | null {
  const order = parseInteger(text);
  if (order === null) return null;
  return Number.isNaN(order) || order < 0 || order > HERITAGE_LIMITS.maxSortOrder
    ? MESSAGES.invalid('Thứ tự', 'phải từ 0 đến 1.000.000')
    : null;
}

function tooLong(value: string, label: string, max: number): string | null {
  return value.trim().length > max ? MESSAGES.invalid(label, `tối đa ${max} ký tự`) : null;
}

type Errors<K extends string> = Partial<Record<K, string>>;

function compact<K extends string>(checks: Record<K, string | null>): Errors<K> {
  const errors: Errors<K> = {};
  for (const key of Object.keys(checks) as K[]) {
    const message = checks[key];
    if (message) errors[key] = message;
  }
  return errors;
}

// ---------------------------------------------------------------------------------------------------------------
// Thông tin chung của di sản

export type HeritageField =
  | 'name'
  | 'slug'
  | 'shortDescription'
  | 'content'
  | 'heritageType'
  | 'recognitionLevel'
  | 'recognizedYear'
  | 'provinceId'
  | 'address'
  | 'latitude'
  | 'longitude'
  | 'placeId';

/** Giá trị các ô của tab Thông tin chung (mọi ô là chuỗi; loại, cấp, tỉnh là giá trị enum / id hoặc rỗng). */
export type HeritageValues = Record<HeritageField, string>;

const COORDINATES_PAIR = MESSAGES.invalid('Tọa độ', 'phải nhập đủ cả vĩ độ và kinh độ hoặc bỏ trống cả hai');

function validateCoordinate(
  text: string,
  other: string,
  label: string,
  range: { min: number; max: number },
  rule: string,
): string | null {
  const value = parseDecimal(text);
  if (value === null) return isNumber(parseDecimal(other)) ? COORDINATES_PAIR : null;
  return !isNumber(value) || value < range.min || value > range.max ? MESSAGES.invalid(label, rule) : null;
}

export function validateHeritage(values: HeritageValues, currentYear: number): Errors<HeritageField> {
  const name = values.name.trim();
  const slug = values.slug.trim();
  const year = parseInteger(values.recognizedYear);

  return compact<HeritageField>({
    name:
      name === ''
        ? MESSAGES.required('tên di sản')
        : name.length > HERITAGE_LIMITS.name
          ? MESSAGES.invalid('Tên di sản', `tối đa ${HERITAGE_LIMITS.name} ký tự`)
          : slugify(name) === ''
            ? MESSAGES.invalid('Tên di sản', 'phải có ít nhất một chữ cái hoặc chữ số')
            : null,
    slug:
      slug === '' || isValidSlug(slug)
        ? null
        : MESSAGES.invalid(
            'Đường dẫn',
            `chỉ gồm chữ thường không dấu, chữ số và dấu gạch ngang giữa các đoạn, tối đa ${HERITAGE_LIMITS.slug} ký tự`,
          ),
    shortDescription: tooLong(values.shortDescription, 'Mô tả ngắn', HERITAGE_LIMITS.shortDescription),
    content: tooLong(values.content, 'Nội dung', HERITAGE_LIMITS.content),
    heritageType: null,
    recognitionLevel: null,
    recognizedYear:
      year === null || (Number.isInteger(year) && year >= 1 && year <= currentYear)
        ? null
        : MESSAGES.invalid('Năm công nhận', 'phải là năm dương lịch không lớn hơn năm hiện tại'),
    provinceId: null,
    address: tooLong(values.address, 'Địa chỉ', HERITAGE_LIMITS.address),
    latitude: validateCoordinate(values.latitude, values.longitude, 'Vĩ độ', HERITAGE_LIMITS.latitude, 'phải từ 8,0 đến 23,5'),
    longitude: validateCoordinate(
      values.longitude,
      values.latitude,
      'Kinh độ',
      HERITAGE_LIMITS.longitude,
      'phải từ 102,0 đến 117,5',
    ),
    placeId: tooLong(values.placeId, 'Mã tham chiếu ngoài', HERITAGE_LIMITS.placeId),
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Giai đoạn và sự kiện

export type TimelineField = 'name' | 'description' | 'startYear' | 'endYear' | 'sortOrder';
export type TimelineValues = Record<TimelineField, string>;

export function validateTimeline(values: TimelineValues, currentYear: number): Errors<TimelineField> {
  const start = parseInteger(values.startYear);
  const end = parseInteger(values.endYear);
  return compact<TimelineField>({
    name: isBlank(values.name)
      ? MESSAGES.required('tên giai đoạn')
      : tooLong(values.name, 'Tên giai đoạn', HERITAGE_LIMITS.timelineName),
    description: tooLong(values.description, 'Mô tả', HERITAGE_LIMITS.longText),
    startYear: validateEraYear(values.startYear, 'Năm bắt đầu', currentYear),
    endYear:
      validateEraYear(values.endYear, 'Năm kết thúc', currentYear) ??
      (isNumber(start) && isNumber(end) && end < start
        ? MESSAGES.invalid('Năm kết thúc', 'không được nhỏ hơn năm bắt đầu')
        : null),
    sortOrder: validateSortOrder(values.sortOrder),
  });
}

export type EventField =
  | 'name'
  | 'description'
  | 'startYear'
  | 'startMonth'
  | 'startDay'
  | 'endYear'
  | 'endMonth'
  | 'endDay'
  | 'sortOrder';
export type EventValues = Record<EventField, string>;

const DAY_RULE = 'phải là ngày có thật của tháng và chỉ nhập khi đã có tháng';

export function validateEvent(values: EventValues, currentYear: number): Errors<EventField> {
  const startYear = parseInteger(values.startYear);
  const startMonth = parseInteger(values.startMonth);
  const startDay = parseInteger(values.startDay);
  const endYear = parseInteger(values.endYear);
  const endMonth = parseInteger(values.endMonth);
  const endDay = parseInteger(values.endDay);

  const startYearError = isBlank(values.startYear)
    ? MESSAGES.required('năm bắt đầu')
    : validateEraYear(values.startYear, 'Năm bắt đầu', currentYear);
  const startDayError =
    startDay === null
      ? null
      : Number.isNaN(startDay) || !isNumber(startMonth) || !isNumber(startYear) || !isValidDay(startYear, startMonth, startDay)
        ? MESSAGES.invalid('Ngày bắt đầu', DAY_RULE)
        : null;
  const endYearError = validateEraYear(values.endYear, 'Năm kết thúc', currentYear);
  const endMonthError =
    validateMonth(values.endMonth, 'Tháng kết thúc') ??
    (endMonth !== null && endYear === null ? MESSAGES.invalid('Tháng kết thúc', 'chỉ nhập khi đã có năm kết thúc') : null);
  const endDayError =
    endDay === null
      ? null
      : Number.isNaN(endDay) || !isNumber(endMonth) || !isNumber(endYear) || !isValidDay(endYear, endMonth, endDay)
        ? MESSAGES.invalid('Ngày kết thúc', DAY_RULE)
        : null;

  let orderError: string | null = null;
  if (isNumber(startYear) && isNumber(endYear) && !startYearError && !endYearError) {
    const before = endsBeforeStart(
      { year: startYear, month: isNumber(startMonth) ? startMonth : null, day: isNumber(startDay) ? startDay : null },
      { year: endYear, month: isNumber(endMonth) ? endMonth : null, day: isNumber(endDay) ? endDay : null },
    );
    if (before) orderError = MESSAGES.invalid('Thời điểm kết thúc', 'không được trước thời điểm bắt đầu');
  }

  return compact<EventField>({
    name: isBlank(values.name)
      ? MESSAGES.required('tên sự kiện')
      : tooLong(values.name, 'Tên sự kiện', HERITAGE_LIMITS.eventName),
    description: tooLong(values.description, 'Mô tả', HERITAGE_LIMITS.longText),
    startYear: startYearError,
    startMonth: validateMonth(values.startMonth, 'Tháng bắt đầu'),
    startDay: startDayError,
    endYear: endYearError ?? orderError,
    endMonth: endMonthError,
    endDay: endDayError,
    sortOrder: validateSortOrder(values.sortOrder),
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Ảnh, media và ghi công

const ALLOWED_LICENSE =
  /^(?:CC0|CC BY-SA|CC BY)(?![\p{L}\p{N}_-])|^(?:public domain|phạm vi công cộng|ảnh nhóm tự chụp|nhóm tự chụp)(?![\p{L}\p{N}_-])/iu;

/** Giấy phép ảnh được dùng: CC0, CC BY, CC BY-SA, phạm vi công cộng hoặc ảnh nhóm tự chụp; CC BY-NC, CC BY-ND... bị từ chối. */
export function isAllowedLicense(license: string | null | undefined): boolean {
  const value = license?.trim();
  return !!value && ALLOWED_LICENSE.test(value);
}

/** Ghi công đủ ba phần "tác giả · giấy phép · nguồn". */
export function composeCredit(author: string, license: string, source: string): string {
  return [author.trim(), license.trim(), source.trim()].join(CREDIT_SEPARATOR);
}

export type MediaField = 'mediaType' | 'url' | 'caption' | 'author' | 'license' | 'source' | 'sortOrder';
export type MediaValues = Record<MediaField, string>;

const MEDIA_TYPES: readonly string[] = ['IMAGE', 'VIDEO', 'AUDIO'] satisfies MediaType[];
const SEPARATOR = CREDIT_SEPARATOR.trim();

export function validateMedia(values: MediaValues): Errors<MediaField> {
  const author = values.author.trim();
  const license = values.license.trim();
  const source = values.source.trim();
  const url = values.url.trim();
  const mediaType = values.mediaType.trim();
  const noSeparator = (value: string, label: string) =>
    value.includes(SEPARATOR) ? MESSAGES.invalid(label, `không chứa dấu "${SEPARATOR}"`) : null;

  return compact<MediaField>({
    mediaType: MEDIA_TYPES.includes(mediaType)
      ? null
      : mediaType === ''
        ? MESSAGES.required('loại media')
        : MESSAGES.invalid('Loại media', 'chỉ nhận IMAGE, VIDEO hoặc AUDIO'),
    url:
      url === ''
        ? MESSAGES.required('đường dẫn')
        : (isHttpUrl(url) || isStoredImagePath(url)) && url.length <= HERITAGE_LIMITS.url
          ? null
          : MESSAGES.invalid('Đường dẫn', `phải là đường dẫn http hoặc https, tối đa ${HERITAGE_LIMITS.url} ký tự`),
    caption: tooLong(values.caption, 'Chú thích', HERITAGE_LIMITS.caption),
    author:
      author === ''
        ? MESSAGES.required('tác giả')
        : (noSeparator(author, 'Tác giả') ??
          (license && source && composeCredit(author, license, source).length > HERITAGE_LIMITS.credit
            ? MESSAGES.invalid('Ghi công', `tác giả, giấy phép và nguồn ghép lại tối đa ${HERITAGE_LIMITS.credit} ký tự`)
            : null)),
    license:
      license === ''
        ? MESSAGES.required('giấy phép')
        : !isAllowedLicense(license)
          ? MESSAGES.invalid('Giấy phép', 'chỉ dùng CC0, CC BY, CC BY-SA, phạm vi công cộng (public domain) hoặc ảnh nhóm tự chụp')
          : noSeparator(license, 'Giấy phép'),
    source: source === '' ? MESSAGES.required('nguồn ảnh') : noSeparator(source, 'Nguồn ảnh'),
    sortOrder: validateSortOrder(values.sortOrder),
  });
}

export type MediaUploadField = Exclude<MediaField, 'mediaType' | 'url'> | 'file';

/**
 * Kiểm biểu mẫu tải ảnh lên: ghi công và chú thích như thêm ảnh bằng đường dẫn, thêm lỗi của tệp (khóa `file`, trùng
 * tên trường của backend). Loại luôn là ảnh và đường dẫn do hệ thống sinh nên không kiểm hai ô đó.
 */
export function validateMediaUpload(values: MediaValues, file: PickedFile | null): Errors<MediaUploadField> {
  const found = validateMedia({ ...values, mediaType: 'IMAGE', url: 'https://tai-len.local/anh.jpg' });
  return compact<MediaUploadField>({
    caption: found.caption ?? null,
    author: found.author ?? null,
    license: found.license ?? null,
    source: found.source ?? null,
    sortOrder: found.sortOrder ?? null,
    file: validateImageFile(file),
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Nguồn tham chiếu

export type ReferenceField = 'title' | 'url' | 'sourceType';
export type ReferenceValues = Record<ReferenceField, string>;

const SOURCE_TYPES: readonly string[] = ['GOV_DOC', 'WEBSITE', 'BOOK'] satisfies ReferenceSourceType[];

export function validateReference(values: ReferenceValues): Errors<ReferenceField> {
  const title = values.title.trim();
  const url = values.url.trim();
  const sourceType = values.sourceType.trim();
  const urlInvalid =
    url !== '' && !(isHttpUrl(url) && url.length <= HERITAGE_LIMITS.url)
      ? MESSAGES.invalid('Đường dẫn', `phải là đường dẫn http hoặc https, tối đa ${HERITAGE_LIMITS.url} ký tự`)
      : null;
  return compact<ReferenceField>({
    title:
      title === ''
        ? MESSAGES.required('tiêu đề nguồn')
        : tooLong(title, 'Tiêu đề nguồn', HERITAGE_LIMITS.referenceTitle),
    sourceType: SOURCE_TYPES.includes(sourceType)
      ? null
      : sourceType === ''
        ? MESSAGES.required('loại nguồn')
        : MESSAGES.invalid('Loại nguồn', 'chỉ nhận GOV_DOC (văn bản nhà nước), WEBSITE hoặc BOOK (sách)'),
    url: urlInvalid ?? (sourceType === 'WEBSITE' && url === '' ? MESSAGES.required('đường dẫn của nguồn website') : null),
  });
}
