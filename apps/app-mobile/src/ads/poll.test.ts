import { pollUntilUnlocked } from './poll';

describe('chờ máy chủ mở khóa', () => {
  it('dừng ngay khi đã mở khóa', async () => {
    const check = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const sleep = jest.fn(async () => undefined);
    expect(await pollUntilUnlocked(check, { sleep })).toBe(true);
    expect(check).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it('hết 20 giây mà chưa mở thì trả false, hỏi tối đa 11 lần', async () => {
    const check = jest.fn(async () => false);
    expect(await pollUntilUnlocked(check, { sleep: async () => undefined })).toBe(false);
    expect(check).toHaveBeenCalledTimes(11);
  });

  it('lỗi mạng một lần không làm dừng việc chờ', async () => {
    const check = jest.fn().mockRejectedValueOnce(new Error('mạng')).mockResolvedValueOnce(true);
    expect(await pollUntilUnlocked(check, { sleep: async () => undefined })).toBe(true);
  });
});
