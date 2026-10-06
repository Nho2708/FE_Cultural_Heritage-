// Chuyển trình duyệt sang cổng thanh toán (VNPay). Tách thành một đối tượng để kiểm thử thay được: jsdom không cho
// đổi địa chỉ trang.

export const gateway = {
  /** Mở địa chỉ cổng thanh toán ngay trong tab hiện tại; tab quay về trang Kết quả thanh toán sau khi trả. */
  open(url: string): void {
    window.location.assign(url);
  },
};

/** Chỉ chuyển tới địa chỉ http hoặc https hợp lệ do máy chủ trả; bất kỳ dạng khác (javascript:, data:…) bị từ chối. */
export function isGatewayUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

/** Trả true nếu đã chuyển trình duyệt đi. */
export function goToGateway(url: string): boolean {
  if (!isGatewayUrl(url)) return false;
  gateway.open(url);
  return true;
}
