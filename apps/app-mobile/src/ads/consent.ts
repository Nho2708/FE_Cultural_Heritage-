// Hộp đồng ý quảng cáo của Google (UMP) được hỏi một lần mỗi khi mở app ở chế độ Khách, và chỉ hiện với khách ở vùng bắt buộc (châu Âu, Anh...). Khách phải đổi ý lại được, nên Cài đặt có nút mở lại
// "tùy chọn quyền riêng tư" của Google. Nút chỉ hiện khi Google báo vùng của khách yêu cầu có lựa chọn này; chỗ khác thì giải thích vì sao không có.

/**
 * - `required`: có tùy chọn quyền riêng tư để mở lại (hiện nút).
 * - `not-required`: vùng của khách không cần hộp đồng ý (giải thích, không có nút).
 * - `unavailable`: bản dựng này không có mô-đun quảng cáo (Expo Go, bản web thử).
 * - `failed`: hỏi Google không được (thường do mạng); cho thử lại.
 */
export type PrivacyOptionsState = 'required' | 'not-required' | 'unavailable' | 'failed';

/** Đổi trạng thái `privacyOptionsRequirementStatus` của thư viện quảng cáo thành trạng thái của màn hình Cài đặt. Trạng thái chưa rõ coi như không kiểm được. */
export function privacyOptionsStateOf(status: unknown): PrivacyOptionsState {
  if (status === 'REQUIRED') return 'required';
  if (status === 'NOT_REQUIRED') return 'not-required';
  return 'failed';
}
