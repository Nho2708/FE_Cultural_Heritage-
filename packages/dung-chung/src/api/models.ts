// Mô hình 3D của di sản: quản trị hệ thống khai báo ở tab Mô hình 3D của Biên tập di sản; khách và học sinh xem miễn phí, không cần
// đăng nhập, ở trình xem 3D dùng chung. Chỉ nhận tệp .glb (glTF 2.0 một tệp), tối đa 15 MB, ghi công đủ ba phần.

import type { ContentStatus } from './heritage';

/** `heritage_models.file_format`: chỉ có GLB. */
export type ModelFormat = 'GLB';

/** Mô hình trong tab Mô hình 3D. `isVisibleToPublic` chỉ bật khi mô hình đang hiển thị và di sản đã xuất bản. */
export interface HeritageModel {
  id: number;
  heritageId: number;
  title: string | null;
  /** Đường dẫn chuẩn của tệp trong kho tệp (`/files/models/{mã}.glb` hoặc địa chỉ của kho đám mây). */
  fileUrl: string;
  fileFormat: ModelFormat;
  /** Do máy chủ đo, không nhận từ người gửi. */
  fileSizeBytes: number;
  posterUrl: string | null;
  license: string;
  licenseUrl: string | null;
  author: string;
  sourceUrl: string | null;
  /** Dòng ghi công do hệ thống ghép: "tác giả · giấy phép · nguồn". */
  credit: string;
  /** Nháp (chưa hiện), Đã xuất bản (đang hiển thị), Đã ẩn. */
  status: ContentStatus;
  statusLabel: string;
  isVisibleToPublic: boolean;
  sortOrder: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

/** Thông tin gửi lên khi khai báo bằng đường dẫn tệp đã có trong kho. Khi tải tệp lên thì gửi cùng các trường này (trừ `fileUrl`) dạng biểu mẫu. */
export interface HeritageModelInput {
  title: string | null;
  fileUrl: string | null;
  posterUrl: string | null;
  author: string;
  license: string;
  licenseUrl: string | null;
  sourceUrl: string | null;
  sortOrder: number | null;
  /** true thì hiện luôn cho khách và học sinh (khi di sản đã xuất bản); bỏ trống là lưu nháp. */
  show?: boolean;
}

/** Sửa thông tin và ghi công (thay toàn bộ); `fileUrl` bỏ trống thì giữ tệp, có thì thay bằng tệp khác đã có trong kho. */
export type UpdateHeritageModelInput = Omit<HeritageModelInput, 'show'>;

/** Dữ liệu cho trình xem 3D dùng chung của web học tập và app. */
export interface PublicModel {
  id: number;
  title: string | null;
  fileUrl: string;
  /** `model/gltf-binary`. */
  contentType: string;
  /** Để cảnh báo trước khi tải trên mạng di động. */
  fileSizeBytes: number;
  /** Ảnh hiện trong lúc mô hình đang tải. */
  posterUrl: string | null;
  author: string;
  license: string;
  licenseUrl: string | null;
  sourceUrl: string | null;
  credit: string;
}
