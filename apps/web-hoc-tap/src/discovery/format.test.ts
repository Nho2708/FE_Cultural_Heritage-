import { describe, expect, it } from 'vitest';
import {
  cardSubtitle,
  citationsOf,
  coordinatesText,
  creditLine,
  displayImageUrl,
  parseContent,
  parseInline,
  periodRange,
  recognitionText,
  safeUrl,
  sourceSummary,
} from './format';

describe('chữ hiển thị của trang khám phá', () => {
  it('cấp xếp hạng kèm năm; chưa xếp hạng thì không nhắc', () => {
    expect(recognitionText('UNESCO', 1993)).toBe('Di sản thế giới (UNESCO) 1993');
    expect(recognitionText('NATIONAL', null)).toBe('Quốc gia');
    expect(recognitionText('NONE', 2000)).toBeNull();
    expect(recognitionText(null, null)).toBeNull();
    expect(cardSubtitle({ provinceName: 'Thành phố Huế', recognitionLevel: 'UNESCO', recognizedYear: 1993 })).toBe(
      'Thành phố Huế · Di sản thế giới (UNESCO) 1993',
    );
    expect(cardSubtitle({ provinceName: null, recognitionLevel: 'NONE', recognizedYear: null })).toBe('');
  });

  it('ghi công ảnh tách ba phần, thiếu phần nào bỏ phần đó, rỗng cả ba thì dùng chuỗi gộp', () => {
    expect(creditLine({ author: 'Christophe95', license: 'CC BY-SA 4.0', source: 'Wikimedia Commons', credit: 'khác' })).toBe(
      'Ảnh: Christophe95 · CC BY-SA 4.0 · Wikimedia Commons',
    );
    expect(creditLine({ author: null, license: 'CC0 1.0', source: ' ', credit: null })).toBe('Ảnh: CC0 1.0');
    expect(creditLine({ author: null, license: null, source: null, credit: 'Ảnh nhóm tự chụp' })).toBe('Ảnh: Ảnh nhóm tự chụp');
    expect(creditLine({ author: null, license: null, source: null, credit: null })).toBeNull();
  });

  it('tọa độ đọc được theo dấu phẩy thập phân', () => {
    expect(coordinatesText(16.4694, 107.5778)).toBe('16,4694° B · 107,5778° Đ');
    expect(coordinatesText(-1.5, -70)).toBe('1,5000° N · 70,0000° T');
  });

  it('tách nội dung thành tiêu đề, đoạn và danh sách', () => {
    const blocks = parseContent('## Giới thiệu\nDòng một\ntiếp dòng hai\n\nĐoạn hai\n\n### Gợi ý\n- Ý một\n- Ý hai\n\nCuối');
    expect(blocks).toEqual([
      { kind: 'heading', level: 2, text: 'Giới thiệu' },
      { kind: 'paragraph', text: 'Dòng một tiếp dòng hai' },
      { kind: 'paragraph', text: 'Đoạn hai' },
      { kind: 'heading', level: 3, text: 'Gợi ý' },
      { kind: 'list', items: ['Ý một', 'Ý hai'] },
      { kind: 'paragraph', text: 'Cuối' },
    ]);
    expect(parseContent(null)).toEqual([]);
    expect(parseContent('<script>alert(1)</script>')).toEqual([{ kind: 'paragraph', text: '<script>alert(1)</script>' }]);
  });

  it('chữ đậm **…** trong đoạn được tách ra; dấu ** lẻ giữ nguyên', () => {
    expect(parseInline('**Giá trị lịch sử.** Cục Di sản nhận định')).toEqual([
      { text: 'Giá trị lịch sử.', bold: true },
      { text: ' Cục Di sản nhận định', bold: false },
    ]);
    expect(parseInline('a **b** c **d**')).toEqual([
      { text: 'a ', bold: false },
      { text: 'b', bold: true },
      { text: ' c ', bold: false },
      { text: 'd', bold: true },
    ]);
    expect(parseInline('dấu ** lẻ')).toEqual([{ text: 'dấu ** lẻ', bold: false }]);
    expect(parseInline('')).toEqual([]);
  });

  it('nguồn tham khảo tách theo mẫu tiêu đề của nhóm và gom cơ quan không trùng', () => {
    const citations = citationsOf([
      {
        id: 1,
        heritageId: 1,
        title: 'Cố đô Huế — Cục Di sản văn hóa, truy cập 26/09/2026',
        url: 'https://dsvh.gov.vn/a',
        sourceType: 'GOV_DOC',
        sourceTypeLabel: 'Văn bản nhà nước',
      },
      { id: 2, heritageId: 1, title: 'Hồ sơ — Cục Di sản văn hóa', url: null, sourceType: 'WEBSITE', sourceTypeLabel: 'Website' },
      { id: 3, heritageId: 1, title: 'Sách không theo mẫu', url: null, sourceType: 'BOOK', sourceTypeLabel: 'Sách' },
    ]);
    expect(citations[0]).toMatchObject({ index: 1, name: 'Cố đô Huế', agency: 'Cục Di sản văn hóa', accessedOn: '26/09/2026' });
    expect(citations[2]).toMatchObject({ index: 3, name: 'Sách không theo mẫu', agency: '' });
    expect(sourceSummary(citations)).toBe('Nguồn: Cục Di sản văn hóa.');
    expect(sourceSummary([citations[2]!])).toBeNull();
  });

  it('khoảng năm của thời kỳ, năm âm là trước Công nguyên', () => {
    expect(periodRange({ fromYear: -179, toYear: 938 })).toBe('179 TCN – 938');
    expect(periodRange({ fromYear: null, toYear: -180 })).toBe('đến 180 TCN');
    expect(periodRange({ fromYear: 1945, toYear: null })).toBe('từ 1945');
    expect(periodRange({ fromYear: null, toYear: null })).toBe('');
  });

  it('chỉ nhận địa chỉ http/https', () => {
    expect(safeUrl('https://a.vn/x.jpg')).toBe('https://a.vn/x.jpg');
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('data:text/html;base64,AAAA')).toBeNull();
    expect(safeUrl('không phải địa chỉ')).toBeNull();
    expect(safeUrl(null)).toBeNull();
  });

  it('ảnh tải lên kho tệp có đường dẫn tương đối /files/... thì ghép với máy chủ API; đường dẫn tương đối khác vẫn bị chặn', () => {
    expect(safeUrl('/files/images/0123456789abcdef0123456789abcdef.jpg')).toBe('http://api.test/files/images/0123456789abcdef0123456789abcdef.jpg');
    expect(displayImageUrl('/files/images/0123456789abcdef0123456789abcdef-thumb.webp', 500)).toBe(
      'http://api.test/files/images/0123456789abcdef0123456789abcdef-thumb.webp',
    );
    expect(safeUrl('/admin/secret')).toBeNull();
    expect(safeUrl('//evil.test/x.jpg')).toBeNull();
  });

  it('ảnh Wikimedia Commons dùng bản thu nhỏ có sẵn; địa chỉ khác giữ nguyên', () => {
    const original = 'https://upload.wikimedia.org/wikipedia/commons/7/7d/20190923_Independence_Palace-10.jpg';
    expect(displayImageUrl(original, 400)).toBe(
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/20190923_Independence_Palace-10.jpg/500px-20190923_Independence_Palace-10.jpg',
    );
    expect(displayImageUrl(original, 1280)).toContain('/1280px-');
    expect(displayImageUrl(original, 5000)).toContain('/1920px-');
    const svg = 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Tep.svg';
    expect(displayImageUrl(svg, 500)).toBe(svg);
    expect(displayImageUrl('https://example.org/a.jpg', 500)).toBe('https://example.org/a.jpg');
    expect(displayImageUrl('javascript:alert(1)', 500)).toBeNull();
  });
});
