import { describe, expect, it } from 'vitest';
import { adminTopicOf } from '../../test/curriculumFixtures';
import { EMPTY_TOPIC, TOPIC_LIMITS, topicBody, topicValuesOf, validateTopic, type TopicValues } from './topicForm';

const valid: TopicValues = {
  subject: 'Lịch sử và Địa lí',
  grade: '4',
  groupTitle: 'Đồng bằng Bắc Bộ',
  title: 'Thăng Long - Hà Nội',
  description: '',
  sortOrder: '9',
  sourceUrl: '',
  localProvince: false,
};

describe('biểu mẫu chủ đề chương trình', () => {
  it('biểu mẫu trống báo thiếu môn, khối, chủ đề lớn, nội dung, thứ tự', () => {
    expect(Object.keys(validateTopic(EMPTY_TOPIC)).sort()).toEqual(['grade', 'groupTitle', 'sortOrder', 'subject', 'title']);
  });

  it('biểu mẫu hợp lệ không có lỗi', () => {
    expect(validateTopic(valid)).toEqual({});
  });

  it('khối ngoài 1-12, thứ tự không phải số nguyên, độ dài vượt cột, đường dẫn nguồn sai đều bị báo', () => {
    const errors = validateTopic({
      ...valid,
      grade: '13',
      sortOrder: '1.5',
      title: 'x'.repeat(TOPIC_LIMITS.title + 1),
      description: 'y'.repeat(TOPIC_LIMITS.description + 1),
      sourceUrl: 'ftp://nguon',
    });
    expect(Object.keys(errors).sort()).toEqual(['description', 'grade', 'sortOrder', 'sourceUrl', 'title']);
    expect(validateTopic({ ...valid, sourceUrl: 'https://hoatieu.vn/chuong-trinh' })).toEqual({});
  });

  it('thân gửi lên cắt khoảng trắng, đổi số, ô trống thành null', () => {
    expect(topicBody({ ...valid, subject: '  Lịch sử và Địa lí ', description: '   ', localProvince: true })).toEqual({
      subject: 'Lịch sử và Địa lí',
      grade: 4,
      groupTitle: 'Đồng bằng Bắc Bộ',
      title: 'Thăng Long - Hà Nội',
      description: null,
      localProvince: true,
      sortOrder: 9,
      sourceUrl: null,
    });
  });

  it('giá trị điền sẵn khi sửa lấy từ chủ đề', () => {
    expect(topicValuesOf(adminTopicOf(9, { description: 'Mô tả.', sourceUrl: 'https://nguon.test', sortOrder: 4 }))).toEqual({
      subject: 'Lịch sử và Địa lí',
      grade: '4',
      groupTitle: 'Đồng bằng Bắc Bộ',
      title: 'Thăng Long - Hà Nội',
      description: 'Mô tả.',
      sortOrder: '4',
      sourceUrl: 'https://nguon.test',
      localProvince: false,
    });
  });
});
