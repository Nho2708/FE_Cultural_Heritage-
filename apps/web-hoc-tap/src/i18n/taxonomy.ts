import type { HeritagePeriod, HeritageType, LanguageCode, RecognitionLevel } from '@dsvhvn/dung-chung/api';

// Tên của danh mục cố định (loại di sản, cấp xếp hạng, vùng, thời kỳ, 34 tỉnh thành) ở năm ngôn ngữ. Máy chủ không dịch các tên này: chúng nằm
// trong tệp chuỗi của giao diện, tra theo giá trị enum hoặc theo tên tiếng Việt mà máy chủ trả (tên lạ thì giữ nguyên chữ máy chủ trả).

type ByLanguage<T> = Record<LanguageCode, T>;

export const HERITAGE_TYPE_NAME: ByLanguage<Record<HeritageType, string>> = {
  vi: { TANGIBLE: 'Vật thể', INTANGIBLE: 'Phi vật thể', NATURAL: 'Thiên nhiên', MIXED: 'Hỗn hợp', DOCUMENTARY: 'Tư liệu' },
  en: { TANGIBLE: 'Tangible', INTANGIBLE: 'Intangible', NATURAL: 'Natural', MIXED: 'Mixed', DOCUMENTARY: 'Documentary' },
  ko: { TANGIBLE: '유형', INTANGIBLE: '무형', NATURAL: '자연', MIXED: '복합', DOCUMENTARY: '기록' },
  'zh-Hans': { TANGIBLE: '有形', INTANGIBLE: '非物质', NATURAL: '自然', MIXED: '混合', DOCUMENTARY: '文献' },
  ja: { TANGIBLE: '有形', INTANGIBLE: '無形', NATURAL: '自然', MIXED: '複合', DOCUMENTARY: '記録' },
};

export const RECOGNITION_LEVEL_NAME: ByLanguage<Record<RecognitionLevel, string>> = {
  vi: { UNESCO: 'Di sản thế giới (UNESCO)', NATIONAL_SPECIAL: 'Quốc gia đặc biệt', NATIONAL: 'Quốc gia', PROVINCIAL: 'Cấp tỉnh', NONE: 'Chưa xếp hạng' },
  en: { UNESCO: 'World Heritage (UNESCO)', NATIONAL_SPECIAL: 'Special National Monument', NATIONAL: 'National', PROVINCIAL: 'Provincial', NONE: 'Not ranked' },
  ko: { UNESCO: '세계유산(UNESCO)', NATIONAL_SPECIAL: '국가 특별 유적', NATIONAL: '국가', PROVINCIAL: '성급', NONE: '미지정' },
  'zh-Hans': { UNESCO: '世界遗产（联合国教科文组织）', NATIONAL_SPECIAL: '国家特别遗迹', NATIONAL: '国家级', PROVINCIAL: '省级', NONE: '未定级' },
  ja: { UNESCO: '世界遺産（UNESCO）', NATIONAL_SPECIAL: '国家特別遺跡', NATIONAL: '国家級', PROVINCIAL: '省級', NONE: '未指定' },
};

/** Vùng theo đúng giá trị máy chủ dùng (có dấu). */
export type RegionValue = 'Bắc' | 'Trung' | 'Nam';

export const REGION_NAME: ByLanguage<Record<RegionValue, string>> = {
  vi: { Bắc: 'Bắc', Trung: 'Trung', Nam: 'Nam' },
  en: { Bắc: 'North', Trung: 'Central', Nam: 'South' },
  ko: { Bắc: '북부', Trung: '중부', Nam: '남부' },
  'zh-Hans': { Bắc: '北部', Trung: '中部', Nam: '南部' },
  ja: { Bắc: '北部', Trung: '中部', Nam: '南部' },
};

/** Tên vùng khi ghép trong câu ("Miền Bắc"), dùng ở trang chủ. */
export const REGION_LONG_NAME: ByLanguage<Record<RegionValue, string>> = {
  vi: { Bắc: 'Miền Bắc', Trung: 'Miền Trung', Nam: 'Miền Nam' },
  en: { Bắc: 'Northern Viet Nam', Trung: 'Central Viet Nam', Nam: 'Southern Viet Nam' },
  ko: { Bắc: '북부 베트남', Trung: '중부 베트남', Nam: '남부 베트남' },
  'zh-Hans': { Bắc: '越南北部', Trung: '越南中部', Nam: '越南南部' },
  ja: { Bắc: 'ベトナム北部', Trung: 'ベトナム中部', Nam: 'ベトナム南部' },
};

export const PERIOD_NAME: ByLanguage<Record<HeritagePeriod, string>> = {
  vi: {
    PREHISTORIC: 'Tiền sử và cổ đại',
    NORTHERN_RULE: 'Bắc thuộc',
    INDEPENDENT_FEUDAL: 'Phong kiến độc lập',
    MODERN: 'Cận đại',
    CONTEMPORARY: 'Hiện đại',
  },
  en: {
    PREHISTORIC: 'Prehistoric and ancient',
    NORTHERN_RULE: 'Northern domination',
    INDEPENDENT_FEUDAL: 'Independent feudal era',
    MODERN: 'Early modern',
    CONTEMPORARY: 'Contemporary',
  },
  ko: { PREHISTORIC: '선사·고대', NORTHERN_RULE: '북속기', INDEPENDENT_FEUDAL: '독립 봉건 시대', MODERN: '근대', CONTEMPORARY: '현대' },
  'zh-Hans': { PREHISTORIC: '史前与古代', NORTHERN_RULE: '北属时期', INDEPENDENT_FEUDAL: '独立封建时期', MODERN: '近代', CONTEMPORARY: '现代' },
  ja: { PREHISTORIC: '先史・古代', NORTHERN_RULE: '北属期', INDEPENDENT_FEUDAL: '独立封建時代', MODERN: '近代', CONTEMPORARY: '現代' },
};

// 34 tỉnh, thành phố theo Quyết định 19/2025. Cột: tiếng Việt (tên máy chủ trả), English, 한국어, 简体中文, 日本語.
const PROVINCES: ReadonlyArray<readonly [string, string, string, string, string]> = [
  ['Thành phố Hà Nội', 'Hanoi', '하노이시', '河内市', 'ハノイ市'],
  ['Tỉnh Cao Bằng', 'Cao Bang Province', '까오방성', '高平省', 'カオバン省'],
  ['Tỉnh Tuyên Quang', 'Tuyen Quang Province', '뚜옌꽝성', '宣光省', 'トゥエンクアン省'],
  ['Tỉnh Điện Biên', 'Dien Bien Province', '디엔비엔성', '奠边省', 'ディエンビエン省'],
  ['Tỉnh Lai Châu', 'Lai Chau Province', '라이쩌우성', '莱州省', 'ライチャウ省'],
  ['Tỉnh Sơn La', 'Son La Province', '선라성', '山罗省', 'ソンラ省'],
  ['Tỉnh Lào Cai', 'Lao Cai Province', '라오까이성', '老街省', 'ラオカイ省'],
  ['Tỉnh Thái Nguyên', 'Thai Nguyen Province', '타이응우옌성', '太原省', 'タイグエン省'],
  ['Tỉnh Lạng Sơn', 'Lang Son Province', '랑선성', '谅山省', 'ランソン省'],
  ['Tỉnh Quảng Ninh', 'Quang Ninh Province', '꽝닌성', '广宁省', 'クアンニン省'],
  ['Tỉnh Bắc Ninh', 'Bac Ninh Province', '박닌성', '北宁省', 'バクニン省'],
  ['Tỉnh Phú Thọ', 'Phu Tho Province', '푸토성', '富寿省', 'フート省'],
  ['Thành phố Hải Phòng', 'Hai Phong City', '하이퐁시', '海防市', 'ハイフォン市'],
  ['Tỉnh Hưng Yên', 'Hung Yen Province', '흥옌성', '兴安省', 'フンイエン省'],
  ['Tỉnh Ninh Bình', 'Ninh Binh Province', '닌빈성', '宁平省', 'ニンビン省'],
  ['Tỉnh Thanh Hóa', 'Thanh Hoa Province', '타인호아성', '清化省', 'タインホア省'],
  ['Tỉnh Nghệ An', 'Nghe An Province', '응에안성', '义安省', 'ゲアン省'],
  ['Tỉnh Hà Tĩnh', 'Ha Tinh Province', '하띤성', '河静省', 'ハティン省'],
  ['Tỉnh Quảng Trị', 'Quang Tri Province', '꽝찌성', '广治省', 'クアンチ省'],
  ['Thành phố Huế', 'Hue City', '후에시', '顺化市', 'フエ市'],
  ['Thành phố Đà Nẵng', 'Da Nang City', '다낭시', '岘港市', 'ダナン市'],
  ['Tỉnh Quảng Ngãi', 'Quang Ngai Province', '꽝응아이성', '广义省', 'クアンガイ省'],
  ['Tỉnh Gia Lai', 'Gia Lai Province', '자라이성', '嘉莱省', 'ザライ省'],
  ['Tỉnh Khánh Hòa', 'Khanh Hoa Province', '칸호아성', '庆和省', 'カインホア省'],
  ['Tỉnh Đắk Lắk', 'Dak Lak Province', '닥락성', '得乐省', 'ダクラク省'],
  ['Tỉnh Lâm Đồng', 'Lam Dong Province', '럼동성', '林同省', 'ラムドン省'],
  ['Tỉnh Đồng Nai', 'Dong Nai Province', '동나이성', '同奈省', 'ドンナイ省'],
  ['Thành phố Hồ Chí Minh', 'Ho Chi Minh City', '호찌민시', '胡志明市', 'ホーチミン市'],
  ['Tỉnh Tây Ninh', 'Tay Ninh Province', '떠이닌성', '西宁省', 'タイニン省'],
  ['Tỉnh Đồng Tháp', 'Dong Thap Province', '동탑성', '同塔省', 'ドンタップ省'],
  ['Tỉnh Vĩnh Long', 'Vinh Long Province', '빈롱성', '永隆省', 'ヴィンロン省'],
  ['Tỉnh An Giang', 'An Giang Province', '안장성', '安江省', 'アンザン省'],
  ['Thành phố Cần Thơ', 'Can Tho City', '껀터시', '芹苴市', 'カントー市'],
  ['Tỉnh Cà Mau', 'Ca Mau Province', '까마우성', '金瓯省', 'カマウ省'],
];

const PROVINCE_INDEX: Record<LanguageCode, number> = { vi: 0, en: 1, ko: 2, 'zh-Hans': 3, ja: 4 };

const PROVINCE_BY_VI = new Map(PROVINCES.map((row) => [row[0], row] as const));

/** Tên tỉnh, thành phố ở ngôn ngữ đang chọn. Tên không có trong danh mục (hoặc tiếng Việt) giữ nguyên chữ máy chủ trả. */
export function provinceName(name: string | null | undefined, language: LanguageCode): string | null {
  if (!name) return null;
  if (language === 'vi') return name;
  return PROVINCE_BY_VI.get(name)?.[PROVINCE_INDEX[language]] ?? name;
}

export const PROVINCE_COUNT = PROVINCES.length;

