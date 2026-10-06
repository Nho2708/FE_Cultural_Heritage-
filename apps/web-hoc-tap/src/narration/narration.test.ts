import { describe, expect, it } from 'vitest';
import { pickVoice, splitParagraphs, splitSentences } from './sentences';

// Tách câu để đọc từng câu và tô sáng; chọn giọng đọc của thiết bị theo mã giọng.

describe('tách câu', () => {
  it('tiếng Việt và tiếng Anh: tách theo dấu kết câu, không tách ở số thập phân', () => {
    expect(splitSentences('Hoàng thành Thăng Long là di sản thế giới. Năm 2010, khu trung tâm được ghi danh! Có đúng 1.5 km tường thành?', 'vi-VN')).toEqual([
      'Hoàng thành Thăng Long là di sản thế giới.',
      'Năm 2010, khu trung tâm được ghi danh!',
      'Có đúng 1.5 km tường thành?',
    ]);
    expect(splitSentences('The citadel was built in 1010. It became a World Heritage Site in 2010.', 'en-US')).toEqual([
      'The citadel was built in 1010.',
      'It became a World Heritage Site in 2010.',
    ]);
  });

  it('tiếng Trung, Nhật, Hàn: nhận dấu "。" và "！" không có khoảng trắng', () => {
    expect(splitSentences('升龙皇城是世界遗产。2010年被列入名录！', 'zh-CN')).toHaveLength(2);
    expect(splitSentences('昇龍皇城は世界遺産です。2010年に登録されました。', 'ja-JP')).toHaveLength(2);
    expect(splitSentences('탕롱 황성은 세계유산입니다. 2010년에 등재되었습니다.', 'ko-KR')).toHaveLength(2);
  });

  it('chữ không có dấu kết câu là một câu; chữ rỗng không có câu nào; khoảng trắng thừa bị bỏ', () => {
    expect(splitSentences('Không có dấu chấm', 'vi-VN')).toEqual(['Không có dấu chấm']);
    expect(splitSentences('   ', 'vi-VN')).toEqual([]);
    expect(splitSentences('Một   câu.\n\n  Hai câu.', 'vi-VN')).toEqual(['Một câu.', 'Hai câu.']);
  });

  it('mã ngôn ngữ lạ vẫn tách được', () => {
    expect(splitSentences('A. B.', 'không-phải-mã')).toHaveLength(2);
  });
});

describe('tách đoạn', () => {
  it('đoạn cách nhau bằng dòng trống hoặc xuống dòng; bỏ đoạn rỗng', () => {
    expect(splitParagraphs('Đoạn một.\n\nĐoạn hai.\nĐoạn ba.\n\n\n')).toEqual(['Đoạn một.', 'Đoạn hai.', 'Đoạn ba.']);
    expect(splitParagraphs('')).toEqual([]);
  });
});

describe('chọn giọng đọc', () => {
  const voices = [{ lang: 'en-GB' }, { lang: 'ko_KR' }, { lang: 'zh-TW' }, { lang: 'vi-VN' }, { lang: 'en-US' }];

  it('ưu tiên giọng trùng cả vùng, sau đó giọng cùng ngôn ngữ', () => {
    expect(pickVoice(voices, 'en-US')).toEqual({ lang: 'en-US' });
    expect(pickVoice(voices, 'ko-KR')).toEqual({ lang: 'ko_KR' });
    expect(pickVoice(voices, 'vi-VN')).toEqual({ lang: 'vi-VN' });
    expect(pickVoice(voices, 'zh-CN')).toEqual({ lang: 'zh-TW' });
  });

  it('không có giọng cho ngôn ngữ thì trả undefined', () => {
    expect(pickVoice(voices, 'ja-JP')).toBeUndefined();
    expect(pickVoice([], 'ja-JP')).toBeUndefined();
  });
});
