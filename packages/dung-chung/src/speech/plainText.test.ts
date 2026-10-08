import { describe, expect, it } from 'vitest';
import { markdownToPlainText } from './plainText';
import { splitParagraphs, splitSentences } from './sentences';

const MARKDOWN =
  '## Giới thiệu\nKhu **Hoàng thành** nằm ở trung tâm [Hà Nội](https://example.org/ha-noi).\n\n' +
  '## Gợi ý cho học sinh\n- Vẽ sơ đồ các công trình.\n* Thảo luận về *giá trị* di sản\n1. Làm bài tập\n\n> Trích dẫn ngắn\n\n---\n`mã` và ~~bỏ~~ ![ảnh](a.png)';

describe('markdownToPlainText', () => {
  it('bỏ ký hiệu Markdown, giữ chữ và cách ngắt đoạn', () => {
    const plain = markdownToPlainText(MARKDOWN);
    expect(plain).toBe(
      'Giới thiệu.\nKhu Hoàng thành nằm ở trung tâm Hà Nội.\n\n' +
        'Gợi ý cho học sinh.\nVẽ sơ đồ các công trình.\nThảo luận về giá trị di sản.\nLàm bài tập.\n\nTrích dẫn ngắn\n\nmã và bỏ ảnh',
    );
    for (const mark of ['#', '**', '](', '```', '~~', '![']) expect(plain).not.toContain(mark);
  });

  it('tiêu đề thành câu riêng, giữ dấu kết câu sẵn có', () => {
    expect(markdownToPlainText('## Lịch sử hình thành\nNăm 1010.')).toBe('Lịch sử hình thành.\nNăm 1010.');
    expect(markdownToPlainText('### Bạn có biết?\nCó.')).toBe('Bạn có biết?\nCó.');
  });

  it('bỏ ký hiệu tiêu đề nằm giữa dòng của văn bản đã bị gộp', () => {
    expect(markdownToPlainText('Di tích quốc gia đặc biệt (2009). ## Giới thiệu Khu Trung tâm là phần lõi. ### Chi tiết rất hay')).toBe(
      'Di tích quốc gia đặc biệt (2009). Giới thiệu Khu Trung tâm là phần lõi. Chi tiết rất hay',
    );
  });

  it('không đụng chữ thường', () => {
    const text = 'Năm 1010, vua Lý Thái Tổ dời đô. Hồ sơ số #1328 (ii), (iii) và (vi) - ghi danh năm 2010; snake_case_name giữ nguyên.';
    expect(markdownToPlainText(text)).toBe(text);
    expect(markdownToPlainText(null)).toBe('');
    expect(markdownToPlainText(undefined)).toBe('');
    expect(markdownToPlainText('  \n\n ')).toBe('');
  });

  it('khung mã giữ chữ bỏ hàng rào, ký tự thoát được giải', () => {
    expect(markdownToPlainText('```\ndòng một\ndòng hai\n```\nGiá 5 \\* 3 = 15')).toBe('dòng một\ndòng hai\nGiá 5 * 3 = 15');
  });
});

describe('tách câu và đoạn bỏ ký hiệu Markdown', () => {
  it('splitSentences không để lọt ký hiệu và tiêu đề là một câu riêng', () => {
    const sentences = splitSentences('## Giới thiệu\nKhu **Hoàng thành** rất đẹp. Đi thăm nhé.\n- Mục một', 'vi-VN');
    expect(sentences).toEqual(['Giới thiệu.', 'Khu Hoàng thành rất đẹp.', 'Đi thăm nhé.', 'Mục một.']);
    expect(sentences.join(' ')).not.toMatch(/[#*]/);
  });

  it('splitSentences xử lý tóm tắt cũ đã bị gộp một dòng', () => {
    const sentences = splitSentences('Tên di sản. Mô tả ngắn. ## Giới thiệu Khu di sản nằm ở Hà Nội.', 'vi-VN');
    expect(sentences.join(' ')).not.toContain('#');
  });

  it('splitParagraphs bỏ ký hiệu và vẫn tách theo đoạn', () => {
    expect(splitParagraphs('## Mở đầu\nĐoạn **một**.\n\nĐoạn hai.')).toEqual(['Mở đầu.', 'Đoạn một.', 'Đoạn hai.']);
    expect(splitParagraphs('')).toEqual([]);
  });
});
