/**
 * Tách danh sách thiết bị thử của AdMob (phân cách bằng dấu phẩy, bỏ khoảng trắng và mục rỗng). Mã là mã băm mà SDK in ra log
 * ("Use RequestConfiguration.Builder().setTestDeviceIds(...)") ở lần xin quảng cáo đầu tiên trên máy chưa được khai là máy thử.
 */
export function parseTestDeviceIds(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}
