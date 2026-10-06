import { describe, expect, it } from 'vitest';
import {
  checkGlbHeader,
  composeModelCredit,
  isAllowedModelLicense,
  isStoredModelPath,
  isTeamBuiltLicense,
  readGlbHeader,
  validateModel,
  validateModelFile,
  type ModelValues,
} from './model3d';

const file = (name: string, size = 1000, type = 'model/gltf-binary') => ({ name, size, type });

/** 12 byte đầu của một tệp .glb: dấu "glTF", phiên bản và độ dài. */
function header(size: number, { magic = 'glTF', version = 2 }: { magic?: string; version?: number } = {}) {
  const bytes = new Uint8Array(12);
  for (let i = 0; i < 4; i++) bytes[i] = magic.charCodeAt(i);
  const view = new DataView(bytes.buffer);
  view.setUint32(4, version, true);
  view.setUint32(8, size, true);
  return bytes;
}

const KEY = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

const valid: ModelValues = {
  title: 'Mô hình Cổng Ngọ Môn',
  fileUrl: '',
  posterUrl: '',
  author: 'Nguyễn Văn An',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  sourceUrl: 'https://sketchfab.com/3d-models/ngo-mon',
};

describe('kiểm tệp mô hình trước khi tải lên', () => {
  it('nhận .glb không phân biệt hoa thường, tối đa đúng 15 MB, loại tệp đúng hoặc không rõ', () => {
    expect(validateModelFile(file('a.glb'))).toBeNull();
    expect(validateModelFile(file('A.GLB', 15 * 1024 * 1024, 'application/octet-stream'))).toBeNull();
    expect(validateModelFile(file('a.glb', 100, ''))).toBeNull();
  });

  it('chưa chọn, rỗng, quá 15 MB, sai đuôi và sai loại bị từ chối', () => {
    expect(validateModelFile(null)).toBe('Vui lòng nhập tệp mô hình (.glb).');
    expect(validateModelFile(file('a.glb', 0))).toBe('Tệp mô hình không hợp lệ: tệp rỗng.');
    expect(validateModelFile(file('a.glb', 15 * 1024 * 1024 + 1))).toBe('Tệp mô hình không hợp lệ: tối đa 15 MB, tệp này 15,0 MB.');
    expect(validateModelFile(file('a.gltf', 100, 'model/gltf+json'))).toContain('chỉ nhận tệp .glb');
    expect(validateModelFile(file('a.obj', 100, ''))).toContain('chỉ nhận tệp .glb');
    expect(validateModelFile(file('a.glb', 100, 'image/png'))).toContain('chỉ nhận tệp .glb');
  });
});

describe('kiểm đầu tệp .glb', () => {
  it('đúng dấu glTF, phiên bản 2, độ dài khớp dung lượng', () => {
    expect(checkGlbHeader(header(2048), 2048)).toBeNull();
  });

  it('sai dấu đầu tệp, quá ngắn, glTF 1.0, độ dài không khớp', () => {
    expect(checkGlbHeader(header(2048, { magic: 'PNG ' }), 2048)).toContain('không phải tệp .glb');
    expect(checkGlbHeader(new Uint8Array(5), 5)).toContain('không phải tệp .glb');
    expect(checkGlbHeader(header(2048, { version: 1 }), 2048)).toContain('phiên bản 2.0');
    expect(checkGlbHeader(header(4096), 2048)).toContain('bị cắt hoặc hỏng');
  });

  it('đọc đầu tệp đã chọn', async () => {
    const bytes = new Uint8Array(40);
    bytes.set(header(40));
    expect(await readGlbHeader(new Blob([bytes]))).toBeNull();
    expect(await readGlbHeader(new Blob(['không phải mô hình 3D']))).toContain('không phải tệp .glb');
  });

  it('không đọc được thì không chặn', async () => {
    const broken = { size: 40, slice: () => ({ arrayBuffer: () => Promise.reject(new Error('lỗi')) }) } as unknown as Blob;
    expect(await readGlbHeader(broken)).toBeNull();
  });
});

describe('đường dẫn tệp trong kho', () => {
  it('nhận đường dẫn của kho cục bộ (kể cả kèm địa chỉ máy chủ) và của Cloudinary loại raw', () => {
    expect(isStoredModelPath(`/files/models/${KEY}.glb`)).toBe(true);
    expect(isStoredModelPath(`http://localhost:5080/files/models/${KEY}.glb`)).toBe(true);
    expect(isStoredModelPath(`https://res.cloudinary.com/dsv-demo/raw/upload/v1/dsvhvn/models/${KEY}.glb`)).toBe(true);
    expect(isStoredModelPath(`https://res.cloudinary.com/dsv-demo/raw/upload/dsvhvn/models/${KEY}.glb`)).toBe(true);
  });

  it('từ chối trang ngoài, kho ảnh, đuôi khác, mã sai và đường dẫn thoát thư mục', () => {
    expect(isStoredModelPath(`https://example.com/files/models/${KEY}.glb`.replace('https://example.com', 'ftp://x'))).toBe(false);
    expect(isStoredModelPath(`https://sketchfab.com/models/${KEY}.glb`)).toBe(false);
    expect(isStoredModelPath(`/files/images/${KEY}.glb`)).toBe(false);
    expect(isStoredModelPath(`/files/models/${KEY}.gltf`)).toBe(false);
    expect(isStoredModelPath('/files/models/ngo-mon.glb')).toBe(false);
    expect(isStoredModelPath(`/files/models/../${KEY}.glb`)).toBe(false);
    expect(isStoredModelPath(`https://res.cloudinary.com/dsv-demo/image/upload/models/${KEY}.glb`)).toBe(false);
    expect(isStoredModelPath('')).toBe(false);
  });
});

describe('giấy phép mở của mô hình', () => {
  it('nhận CC0, CC BY, CC BY-SA kèm phiên bản, phạm vi công cộng và mô hình nhóm tự dựng', () => {
    for (const license of ['CC0 1.0', 'CC BY 4.0', 'cc by-sa 3.0', 'CC BY', 'Phạm vi công cộng', 'Public domain', 'Mô hình nhóm tự dựng', 'Nhóm tự dựng']) {
      expect(isAllowedModelLicense(license)).toBe(true);
    }
  });

  it('từ chối CC BY-NC, CC BY-ND, giấy phép không rõ và rỗng', () => {
    for (const license of ['CC BY-NC 4.0', 'CC BY-ND 4.0', 'CC BY-NC-SA', 'Bản quyền thuộc tác giả', 'ảnh nhóm tự chụp', '', '  ']) {
      expect(isAllowedModelLicense(license)).toBe(false);
    }
    expect(isAllowedModelLicense(null)).toBe(false);
  });

  it('chỉ mô hình nhóm tự dựng được bỏ trống nguồn', () => {
    expect(isTeamBuiltLicense('Mô hình nhóm tự dựng')).toBe(true);
    expect(isTeamBuiltLicense('nhóm tự dựng')).toBe(true);
    expect(isTeamBuiltLicense('CC BY 4.0')).toBe(false);
  });

  it('ghép dòng ghi công "tác giả · giấy phép · nguồn", không có nguồn thì là "Nhóm thực hiện"', () => {
    expect(composeModelCredit(' An ', ' CC BY 4.0 ', ' https://x.vn/a ')).toBe('An · CC BY 4.0 · https://x.vn/a');
    expect(composeModelCredit('Nhóm', 'Mô hình nhóm tự dựng', '')).toBe('Nhóm · Mô hình nhóm tự dựng · Nhóm thực hiện');
  });
});

describe('kiểm biểu mẫu mô hình', () => {
  const upload = { kind: 'upload', file: file('ngo-mon.glb') } as const;

  it('tải tệp lên với ghi công đủ thì hợp lệ', () => {
    expect(validateModel(valid, upload)).toEqual({});
  });

  it('thiếu tệp khi tải lên, thiếu đường dẫn khi dán', () => {
    expect(validateModel(valid, { kind: 'upload', file: null }).file).toBe('Vui lòng nhập tệp mô hình (.glb).');
    expect(validateModel(valid, { kind: 'path' }).fileUrl).toBe('Vui lòng nhập đường dẫn tệp mô hình (.glb đã tải lên kho tệp).');
  });

  it('dán đường dẫn phải là tệp trong kho; khi sửa thì được bỏ trống để giữ tệp', () => {
    expect(validateModel({ ...valid, fileUrl: 'https://sketchfab.com/a.glb' }, { kind: 'path' }).fileUrl).toContain('không dùng đường dẫn tới trang ngoài');
    expect(validateModel({ ...valid, fileUrl: `/files/models/${KEY}.glb` }, { kind: 'path' })).toEqual({});
    expect(validateModel({ ...valid, fileUrl: '' }, { kind: 'edit' })).toEqual({});
    expect(validateModel({ ...valid, fileUrl: 'https://x.vn/a.glb' }, { kind: 'edit' }).fileUrl).toBeTruthy();
  });

  it('thiếu tác giả hoặc giấy phép', () => {
    const errors = validateModel({ ...valid, author: ' ', license: '' }, upload);
    expect(errors.author).toBe('Vui lòng nhập tác giả.');
    expect(errors.license).toBe('Vui lòng nhập giấy phép.');
  });

  it('giấy phép hạn chế bị từ chối', () => {
    expect(validateModel({ ...valid, license: 'CC BY-NC 4.0' }, upload).license).toContain('không nhận CC BY-NC, CC BY-ND');
    expect(validateModel({ ...valid, license: 'CC BY-ND 4.0' }, upload).license).toBeTruthy();
  });

  it('mô hình giấy phép mở bắt buộc có nguồn; nhóm tự dựng được bỏ trống', () => {
    expect(validateModel({ ...valid, sourceUrl: '' }, upload).sourceUrl).toContain('chỉ mô hình nhóm tự dựng được bỏ trống');
    expect(validateModel({ ...valid, license: 'Mô hình nhóm tự dựng', sourceUrl: '' }, upload)).toEqual({});
  });

  it('giấy phép sai không kéo thêm lỗi nguồn', () => {
    expect(validateModel({ ...valid, license: 'Bản quyền', sourceUrl: '' }, upload).sourceUrl).toBeUndefined();
  });

  it('đường dẫn nguồn và giấy phép phải là http hoặc https', () => {
    expect(validateModel({ ...valid, sourceUrl: 'sketchfab.com/ngo-mon' }, upload).sourceUrl).toContain('đường dẫn http hoặc https');
    expect(validateModel({ ...valid, licenseUrl: 'javascript:alert(1)' }, upload).licenseUrl).toContain('đường dẫn http hoặc https');
  });

  it('tác giả và giấy phép không chứa dấu ngăn của ghi công', () => {
    expect(validateModel({ ...valid, author: 'An · Bình' }, upload).author).toContain('không chứa dấu "·"');
    expect(validateModel({ ...valid, license: 'CC BY 4.0 · x' }, upload).license).toContain('không chứa dấu "·"');
  });

  it('ghi công ghép lại tối đa 500 ký tự; tên mô hình tối đa 255', () => {
    expect(validateModel({ ...valid, author: 'A'.repeat(255), sourceUrl: `https://x.vn/${'a'.repeat(300)}` }, upload).author).toContain('tối đa 500');
    expect(validateModel({ ...valid, title: 'T'.repeat(256) }, upload).title).toBe('Tên mô hình không hợp lệ: tối đa 255 ký tự.');
  });

  it('ảnh xem trước là đường dẫn http, https hoặc ảnh đã tải lên', () => {
    expect(validateModel({ ...valid, posterUrl: 'https://x.vn/a.jpg' }, upload)).toEqual({});
    expect(validateModel({ ...valid, posterUrl: `/files/images/${KEY}.jpg` }, upload)).toEqual({});
    expect(validateModel({ ...valid, posterUrl: 'a.jpg' }, upload).posterUrl).toContain('Ảnh xem trước không hợp lệ');
  });
});
