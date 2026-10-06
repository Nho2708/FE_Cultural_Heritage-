import { formatFileSize, type PickedFile } from './files';
import { MESSAGES } from './messages';
import { CREDIT_SEPARATOR, isHttpUrl, isStoredImagePath } from './validation/heritage';

// Mô hình 3D của di sản: quy tắc kiểm phía giao diện (cùng luật và cùng câu với backend; backend vẫn kiểm theo nội dung tệp và là nơi quyết
// định). Chỉ nhận tệp .glb (glTF 2.0 đóng gói một tệp), tối đa 15 MB, ghi công đủ ba phần "tác giả · giấy phép · nguồn", giấy phép mở.

export const MODEL_UPLOAD = {
  /** Mô hình tải lên tối đa 15 MB. */
  maxBytes: 15 * 1024 * 1024,
  extensions: ['glb'],
  /** Loại tệp trình duyệt có thể báo: đúng loại, hoặc không rõ (nhiều hệ điều hành không biết .glb). */
  mimeTypes: ['model/gltf-binary', 'application/octet-stream'],
  /** Giá trị cho thuộc tính `accept` của ô chọn tệp. */
  accept: '.glb,model/gltf-binary',
} as const;

const GLB_RULE = 'chỉ nhận tệp .glb (glTF 2.0 đóng gói một tệp)';

const extensionOf = (name: string) => name.slice(name.lastIndexOf('.') + 1).toLowerCase();

/** Lỗi của tệp mô hình đã chọn (null là hợp lệ): rỗng, sai đuôi hoặc loại tệp, quá 15 MB. */
export function validateModelFile(file: PickedFile | null): string | null {
  if (!file) return MESSAGES.required('tệp mô hình (.glb)');
  if (file.size === 0) return MESSAGES.invalid('Tệp mô hình', 'tệp rỗng');
  const goodExtension = (MODEL_UPLOAD.extensions as readonly string[]).includes(extensionOf(file.name));
  const goodType = file.type === '' || (MODEL_UPLOAD.mimeTypes as readonly string[]).includes(file.type);
  if (!goodExtension || !goodType) return MESSAGES.invalid('Tệp mô hình', GLB_RULE);
  if (file.size > MODEL_UPLOAD.maxBytes) {
    return MESSAGES.invalid('Tệp mô hình', `tối đa 15 MB, tệp này ${formatFileSize(file.size)}`);
  }
  return null;
}

/**
 * Kiểm 12 byte đầu của tệp .glb: dấu "glTF", phiên bản 2 và độ dài khai báo khớp dung lượng thật. Tệp đổi đuôi cho đúng ".glb" nhưng
 * không phải glTF 2.0 đóng gói thì báo ngay khi chọn thay vì đợi máy chủ từ chối sau khi tải lên.
 */
export function checkGlbHeader(bytes: Uint8Array, size: number): string | null {
  if (bytes.length < 12 || String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!) !== 'glTF') {
    return MESSAGES.invalid('Tệp mô hình', `không phải tệp .glb; ${GLB_RULE}`);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(4, true) !== 2) return MESSAGES.invalid('Tệp mô hình', 'chỉ nhận glTF phiên bản 2.0');
  if (view.getUint32(8, true) !== size) return MESSAGES.invalid('Tệp mô hình', 'tệp bị cắt hoặc hỏng, hãy xuất lại từ phần mềm dựng mô hình');
  return null;
}

/** Đọc đầu tệp đã chọn và kiểm như `checkGlbHeader`; không đọc được thì không chặn (máy chủ vẫn kiểm theo nội dung). */
export async function readGlbHeader(file: Blob): Promise<string | null> {
  try {
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    return checkGlbHeader(head, file.size);
  } catch {
    return null;
  }
}

/**
 * Đường dẫn của tệp .glb đang có trong kho tệp của nền tảng: `/files/models/{32 ký tự}.glb` (có thể kèm địa chỉ máy chủ) hoặc địa chỉ của
 * Cloudinary `…/raw/upload/…/models/{32 ký tự}.glb`. Trang ngoài kho thì không bao giờ khớp. Máy chủ còn kiểm tệp có thật và đúng kho.
 */
export function isStoredModelPath(value: string): boolean {
  const url = value.trim();
  return (
    /^(?:https?:\/\/[^/\s]+)?\/files\/models\/[0-9a-f]{32}\.glb$/.test(url) ||
    /^https:\/\/res\.cloudinary\.com\/[A-Za-z0-9_-]+\/raw\/upload\/(?:v\d+\/)?(?:[A-Za-z0-9_-]+\/)*models\/[0-9a-f]{32}\.glb$/.test(url)
  );
}

/** Giấy phép gợi ý trong ô nhập của mô hình. */
export const MODEL_LICENSE_SUGGESTIONS = [
  'CC BY 4.0',
  'CC BY-SA 4.0',
  'CC0 1.0',
  'Phạm vi công cộng',
  'Mô hình nhóm tự dựng',
] as const;

const ALLOWED_MODEL_LICENSE =
  /^(?:CC0|CC BY-SA|CC BY)(?![\p{L}\p{N}_-])|^(?:public domain|phạm vi công cộng|mô hình nhóm tự dựng|nhóm tự dựng)(?![\p{L}\p{N}_-])/iu;
const TEAM_BUILT_LICENSE = /^(?:mô hình nhóm tự dựng|nhóm tự dựng)(?![\p{L}\p{N}_-])/iu;

/** CC0, CC BY, CC BY-SA (kèm số phiên bản), phạm vi công cộng hoặc mô hình nhóm tự dựng; CC BY-NC, CC BY-ND, giấy phép không rõ bị từ chối. */
export function isAllowedModelLicense(license: string | null | undefined): boolean {
  const value = license?.trim();
  return !!value && ALLOWED_MODEL_LICENSE.test(value);
}

/** Mô hình nhóm tự dựng: được bỏ trống đường dẫn nguồn. */
export function isTeamBuiltLicense(license: string | null | undefined): boolean {
  const value = license?.trim();
  return !!value && TEAM_BUILT_LICENSE.test(value);
}

/** Phần nguồn trong dòng ghi công của mô hình nhóm tự dựng không có trang nguồn. */
export const TEAM_SOURCE = 'Nhóm thực hiện';

/** Dòng ghi công do hệ thống ghép: "tác giả · giấy phép · nguồn" (không có trang nguồn thì phần nguồn là "Nhóm thực hiện"). */
export function composeModelCredit(author: string, license: string, sourceUrl: string): string {
  return [author.trim(), license.trim(), sourceUrl.trim() || TEAM_SOURCE].join(CREDIT_SEPARATOR);
}

export const MODEL_LIMITS = { title: 255, url: 500, author: 255, license: 100, credit: 500 } as const;

export type ModelField = 'title' | 'file' | 'fileUrl' | 'posterUrl' | 'author' | 'license' | 'licenseUrl' | 'sourceUrl';

/** Giá trị các ô của biểu mẫu mô hình 3D (mọi ô là chuỗi; `file` là tệp đã chọn, nằm ngoài). */
export type ModelValues = Record<Exclude<ModelField, 'file'>, string>;

/** Cách khai báo: tải tệp lên, dán đường dẫn tệp đã có trong kho, hoặc sửa thông tin (đường dẫn tệp bỏ trống là giữ tệp). */
export type ModelSource = { kind: 'upload'; file: PickedFile | null } | { kind: 'path' } | { kind: 'edit' };

const SEPARATOR = CREDIT_SEPARATOR.trim();
const noSeparator = (value: string, label: string) =>
  value.includes(SEPARATOR) ? MESSAGES.invalid(label, `không chứa dấu "${SEPARATOR}"`) : null;
const tooLong = (value: string, label: string, max: number) =>
  value.length > max ? MESSAGES.invalid(label, `tối đa ${max} ký tự`) : null;
const badHttp = (value: string, label: string) =>
  value !== '' && !(isHttpUrl(value) && value.length <= MODEL_LIMITS.url)
    ? MESSAGES.invalid(label, `phải là đường dẫn http hoặc https, tối đa ${MODEL_LIMITS.url} ký tự`)
    : null;

/** Kiểm biểu mẫu mô hình 3D, cùng luật và cùng câu với backend. Khóa lỗi trùng tên trường của request. */
export function validateModel(values: ModelValues, source: ModelSource): Partial<Record<ModelField, string>> {
  const title = values.title.trim();
  const fileUrl = values.fileUrl.trim();
  const poster = values.posterUrl.trim();
  const author = values.author.trim();
  const license = values.license.trim();
  const licenseUrl = values.licenseUrl.trim();
  const sourceUrl = values.sourceUrl.trim();
  const licenseAllowed = isAllowedModelLicense(license);

  const checks: Record<ModelField, string | null> = {
    title: tooLong(title, 'Tên mô hình', MODEL_LIMITS.title),
    file: source.kind === 'upload' ? validateModelFile(source.file) : null,
    fileUrl:
      source.kind === 'path' && fileUrl === ''
        ? MESSAGES.required('đường dẫn tệp mô hình (.glb đã tải lên kho tệp)')
        : source.kind !== 'upload' && fileUrl !== '' && !(fileUrl.length <= MODEL_LIMITS.url && isStoredModelPath(fileUrl))
          ? MESSAGES.invalid(
              'Đường dẫn tệp mô hình',
              'phải là đường dẫn tệp .glb đã tải lên kho tệp của nền tảng, không dùng đường dẫn tới trang ngoài',
            )
          : null,
    posterUrl:
      poster !== '' && !((isHttpUrl(poster) || isStoredImagePath(poster)) && poster.length <= MODEL_LIMITS.url)
        ? MESSAGES.invalid(
            'Ảnh xem trước',
            `phải là đường dẫn http hoặc https (hoặc đường dẫn ảnh đã tải lên), tối đa ${MODEL_LIMITS.url} ký tự`,
          )
        : null,
    author:
      author === ''
        ? MESSAGES.required('tác giả')
        : (tooLong(author, 'Tác giả', MODEL_LIMITS.author) ??
          noSeparator(author, 'Tác giả') ??
          (license && licenseAllowed && composeModelCredit(author, license, sourceUrl).length > MODEL_LIMITS.credit
            ? MESSAGES.invalid('Ghi công', `tác giả, giấy phép và nguồn ghép lại tối đa ${MODEL_LIMITS.credit} ký tự`)
            : null)),
    license:
      license === ''
        ? MESSAGES.required('giấy phép')
        : (tooLong(license, 'Giấy phép', MODEL_LIMITS.license) ??
          (!licenseAllowed
            ? MESSAGES.invalid(
                'Giấy phép',
                'chỉ dùng CC0, CC BY, CC BY-SA, phạm vi công cộng (public domain) hoặc mô hình nhóm tự dựng; không nhận CC BY-NC, CC BY-ND',
              )
            : noSeparator(license, 'Giấy phép'))),
    licenseUrl: badHttp(licenseUrl, 'Đường dẫn giấy phép'),
    sourceUrl:
      badHttp(sourceUrl, 'Đường dẫn nguồn') ??
      (sourceUrl === '' && licenseAllowed && !isTeamBuiltLicense(license)
        ? MESSAGES.required('đường dẫn nguồn (trang nơi tải mô hình; chỉ mô hình nhóm tự dựng được bỏ trống)')
        : null),
  };

  const errors: Partial<Record<ModelField, string>> = {};
  for (const key of Object.keys(checks) as ModelField[]) {
    const message = checks[key];
    if (message) errors[key] = message;
  }
  return errors;
}
