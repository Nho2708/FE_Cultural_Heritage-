import { describe, expect, it } from 'vitest';
import { formatFileSize, resolveFileUrl, validateImageFile } from './files';

const file = (name: string, size = 1000, type = 'image/jpeg') => ({ name, size, type });

describe('kiểm tệp ảnh trước khi tải lên', () => {
  it('nhận JPG, JPEG, PNG, WEBP không phân biệt hoa thường, tối đa đúng 5 MB', () => {
    for (const name of ['a.jpg', 'a.JPEG', 'a.png', 'a.WebP']) expect(validateImageFile(file(name))).toBeNull();
    expect(validateImageFile(file('a.jpg', 5 * 1024 * 1024))).toBeNull();
  });

  it('chưa chọn tệp, tệp rỗng, quá 5 MB và sai định dạng đều bị từ chối bằng câu của backend', () => {
    expect(validateImageFile(null)).toBe('Vui lòng nhập tệp ảnh.');
    expect(validateImageFile(file('a.jpg', 0))).toBe('Tệp ảnh không hợp lệ: tệp rỗng.');
    expect(validateImageFile(file('a.jpg', 5 * 1024 * 1024 + 1))).toBe('Tệp ảnh không hợp lệ: tối đa 5 MB, tệp này 5,0 MB.');
    expect(validateImageFile(file('a.gif', 10, 'image/gif'))).toBe('Tệp ảnh không hợp lệ: chỉ nhận định dạng JPG, PNG hoặc WEBP.');
    expect(validateImageFile(file('ghi-chu.txt', 10, 'text/plain'))).toBe('Tệp ảnh không hợp lệ: chỉ nhận định dạng JPG, PNG hoặc WEBP.');
    expect(validateImageFile(file('chuong-trinh.jpg', 10, 'application/x-msdownload'))).toContain('chỉ nhận định dạng');
  });

  it('dung lượng đọc được', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(850 * 1024)).toBe('850 KB');
    expect(formatFileSize(4.25 * 1024 * 1024)).toBe('4,3 MB');
  });
});

describe('đường dẫn tệp trong kho', () => {
  const api = 'http://localhost:5080/api/v1';

  it('đường dẫn tương đối ghép với địa chỉ gốc của máy chủ API', () => {
    expect(resolveFileUrl('/files/images/a.jpg', api)).toBe('http://localhost:5080/files/images/a.jpg');
    expect(resolveFileUrl('/files/images/a.jpg', '/api/v1')).toBe(`${window.location.origin}/files/images/a.jpg`);
  });

  it('đường dẫn đủ địa chỉ và rỗng giữ nguyên', () => {
    expect(resolveFileUrl('https://cdn.vn/a.jpg', api)).toBe('https://cdn.vn/a.jpg');
    expect(resolveFileUrl(null, api)).toBeNull();
    expect(resolveFileUrl('', api)).toBeNull();
  });
});
