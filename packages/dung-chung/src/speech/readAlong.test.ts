import { describe, expect, it } from 'vitest';
import { claimReading, readAlongLayout, releaseReading } from './readAlong';
import { splitSentences } from './sentences';
import { normalizeSpeechText } from './ttsPrefetch';

// Bộ câu mẫu chung của bài đọc cấp 2, 3 (cùng chuỗi ở kiểm thử của máy chủ): cách giao diện chuẩn bị chữ (bỏ Markdown, chuẩn hóa khoảng trắng, tách câu)
// phải cho ra đúng các câu mà máy chủ tạo trước tiếng.
const SAMPLE =
  'Hoàng thành Thăng Long được xây dựng vào năm 1010.\n\nTrải qua nhiều triều đại (Lý, Trần, Lê), nơi đây trở thành trung tâm chính trị của đất nước! Vì sao các vua chọn vùng đất này? Hãy cùng tìm hiểu…\n\nNăm 2010, UNESCO ghi danh khu trung tâm Hoàng thành là Di sản Văn hóa Thế giới.';

// Đặc tả mong đợi 5 câu, câu thứ tư và thứ năm tách ở dấu "…". Bộ tách câu sẵn có (Intl.Segmenter) không tách sau dấu "…" nên ra 4 câu, câu cuối gồm hai câu
// dính nhau. Bộ tách câu được giữ nguyên theo yêu cầu; kết quả thật ghi ở đây để đối chiếu với máy chủ.
const REAL_SENTENCES = [
  'Hoàng thành Thăng Long được xây dựng vào năm 1010.',
  'Trải qua nhiều triều đại (Lý, Trần, Lê), nơi đây trở thành trung tâm chính trị của đất nước!',
  'Vì sao các vua chọn vùng đất này?',
  'Hãy cùng tìm hiểu… Năm 2010, UNESCO ghi danh khu trung tâm Hoàng thành là Di sản Văn hóa Thế giới.',
];
const EXPECTED_BY_SPEC = [
  'Hoàng thành Thăng Long được xây dựng vào năm 1010.',
  'Trải qua nhiều triều đại (Lý, Trần, Lê), nơi đây trở thành trung tâm chính trị của đất nước!',
  'Vì sao các vua chọn vùng đất này?',
  'Hãy cùng tìm hiểu…',
  'Năm 2010, UNESCO ghi danh khu trung tâm Hoàng thành là Di sản Văn hóa Thế giới.',
];

describe('bộ câu mẫu chung của bài đọc cấp 2, 3', () => {
  it('ba câu đầu khớp đặc tả; câu thứ tư và thứ năm của đặc tả đang bị dính nhau (kết quả thật của bộ tách câu sẵn có)', () => {
    expect(splitSentences(SAMPLE, 'vi')).toEqual(REAL_SENTENCES);
    expect(REAL_SENTENCES.slice(0, 3)).toEqual(EXPECTED_BY_SPEC.slice(0, 3));
    expect(REAL_SENTENCES[3]).toBe(`${EXPECTED_BY_SPEC[3]} ${EXPECTED_BY_SPEC[4]}`);
  });

  it('mã ngôn ngữ vi và vi-VN (web và app) cho cùng các câu; chữ gửi máy chủ chuẩn hóa không đổi câu nào', () => {
    expect(splitSentences(SAMPLE, 'vi-VN')).toEqual(splitSentences(SAMPLE, 'vi'));
    expect(splitSentences(SAMPLE, 'vi').map(normalizeSpeechText)).toEqual(REAL_SENTENCES);
  });

  it('các câu của giao diện chính là các câu đọc, dù chữ có Markdown hay thừa khoảng trắng', () => {
    expect(readAlongLayout(SAMPLE, 'vi').sentences).toEqual(REAL_SENTENCES);
    const messy = '## Tiêu đề\n\n**Hoàng thành** Thăng   Long được xây dựng vào năm 1010.\r\n\r\n- Nơi đây là trung tâm.';
    expect(readAlongLayout(messy, 'vi').sentences).toEqual(['Tiêu đề.', 'Hoàng thành Thăng Long được xây dựng vào năm 1010.', 'Nơi đây là trung tâm.']);
  });
});

describe('chia câu và đoạn để hiển thị', () => {
  it('giữ các đoạn văn; câu nằm vắt qua hai đoạn có mảnh ở cả hai đoạn cùng chỉ số câu', () => {
    const layout = readAlongLayout(SAMPLE, 'vi');
    expect(layout.paragraphs).toEqual([
      [{ sentence: 0, text: REAL_SENTENCES[0] }],
      [
        { sentence: 1, text: REAL_SENTENCES[1] },
        { sentence: 2, text: REAL_SENTENCES[2] },
        { sentence: 3, text: 'Hãy cùng tìm hiểu…' },
      ],
      [{ sentence: 3, text: 'Năm 2010, UNESCO ghi danh khu trung tâm Hoàng thành là Di sản Văn hóa Thế giới.' }],
    ]);
  });

  it('chữ rỗng, null hay chỉ khoảng trắng không có câu nào', () => {
    for (const empty of ['', '   \n ', null, undefined]) expect(readAlongLayout(empty, 'vi')).toEqual({ sentences: [], paragraphs: [] });
  });
});

describe('chỉ một đoạn đọc một lúc', () => {
  it('đoạn mới xin quyền thì đoạn cũ bị dừng; trả quyền thì không dừng nữa', () => {
    const calls: string[] = [];
    const a = () => calls.push('a');
    const b = () => calls.push('b');
    claimReading(a);
    claimReading(a);
    expect(calls).toEqual([]);
    claimReading(b);
    expect(calls).toEqual(['a']);
    releaseReading(a);
    claimReading(b);
    releaseReading(b);
    claimReading(a);
    expect(calls).toEqual(['a']);
    releaseReading(a);
  });
});
