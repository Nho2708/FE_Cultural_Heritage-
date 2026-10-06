// Sau khi khách xem hết quảng cáo, chỉ máy chủ (nhận xác minh phía máy chủ của Google) mới mở khóa. App hỏi lại trạng thái mỗi 2 giây, tối đa 20 giây.

export const POLL_INTERVAL_MS = 2000;
export const POLL_MAX_MS = 20_000;

/** Gọi `check` đến khi trả true hoặc hết thời gian; trả true nếu đã mở khóa. Lỗi mạng của một lần hỏi không dừng việc chờ. */
export async function pollUntilUnlocked(
  check: () => Promise<boolean>,
  { intervalMs = POLL_INTERVAL_MS, maxMs = POLL_MAX_MS, sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)) } = {},
): Promise<boolean> {
  for (let waited = 0; waited <= maxMs; waited += intervalMs) {
    try {
      if (await check()) return true;
    } catch {
      // Lần sau hỏi lại.
    }
    if (waited + intervalMs > maxMs) break;
    await sleep(intervalMs);
  }
  return false;
}
