import { ApiError, ERROR_CODES } from '@dsvhvn/dung-chung/api';
import { useCallback, useEffect, useRef, useState } from 'react';
import { adsApi } from '../lib/api/client';
import { getDeviceKey } from '../lib/guest/deviceKey';
import { playRewardedAd, type RewardedHandle } from './gpt';

// Một lượt "xem quảng cáo để mở tóm tắt" của khách ở web, từng bước:
// 1. xin máy chủ mã giao dịch một lần cho di sản này (máy chủ trả "đã mở khóa" thì khỏi xem);
// 2. nạp và hiện quảng cáo có thưởng của Google (Ad Manager);
// 3. khách xem đủ và đóng quảng cáo thì báo máy chủ "đã nhận thưởng" kèm mã giao dịch; máy chủ kiểm rồi ghi lượt mở khóa 24 giờ;
// 4. xong thì gọi `onUnlocked` để hộp thoại hỏi lại tóm tắt.
// Quảng cáo chỉ hiện sau khi khách tự bấm; mọi lỗi dừng ở một thông báo rõ và cho bấm thử lại. Báo thưởng lỗi mạng thì giữ mã giao dịch để gửi lại (gửi trùng là thành công, không ghi thêm).

/** Việc đang làm: nhàn rỗi, xin mã, nạp quảng cáo, quảng cáo đang hiện, báo máy chủ. */
export type UnlockPhase = 'idle' | 'starting' | 'loading' | 'watching' | 'verifying';

/** Vì sao chưa mở được. `rateLimited` kèm số phút chờ nếu máy chủ cho biết. */
export type UnlockProblem =
  | { kind: 'closed' | 'noFill' | 'unsupported' | 'blocked' | 'timeout' | 'rejected' | 'network' | 'unavailable' }
  | { kind: 'rateLimited'; minutes: number | null }
  | { kind: 'resend' };

interface Pending {
  transactionId: string;
  adUnit: string;
}

export function useRewardedUnlock(slug: string, onUnlocked: () => void) {
  const [phase, setPhase] = useState<UnlockPhase>('idle');
  const [problem, setProblem] = useState<UnlockProblem | null>(null);
  const handle = useRef<RewardedHandle | null>(null);
  const pending = useRef<Pending | null>(null);
  const alive = useRef(true);
  const unlocked = useRef(onUnlocked);
  useEffect(() => {
    unlocked.current = onUnlocked;
  });

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      handle.current?.cancel();
    };
  }, []);

  const fail = useCallback((next: UnlockProblem) => {
    if (!alive.current) return;
    setProblem(next);
    setPhase('idle');
  }, []);

  const problemOf = useCallback((error: unknown): UnlockProblem => {
    if (error instanceof ApiError) {
      if (error.code === ERROR_CODES.adRewardRateLimited) return { kind: 'rateLimited', minutes: error.retryAfterSeconds ? Math.ceil(error.retryAfterSeconds / 60) : null };
      if (error.code === ERROR_CODES.adRewardRejected) return { kind: 'rejected' };
      if (error.code === ERROR_CODES.adUnavailable) return { kind: 'unavailable' };
    }
    return { kind: 'network' };
  }, []);

  const report = useCallback(
    async (input: Pending) => {
      setPhase('verifying');
      setProblem(null);
      try {
        // Gửi trùng hoặc di sản đã mở khóa vẫn là thành công (máy chủ không ghi thêm), nên không cần đọc kết quả.
        await adsApi.reportWebReward(getDeviceKey(), { slug, ...input });
        pending.current = null;
        if (!alive.current) return;
        setPhase('idle');
        unlocked.current();
      } catch (error) {
        const next = problemOf(error);
        // Lỗi mạng: giữ mã để gửi lại; lỗi do máy chủ từ chối thì mã không còn dùng được.
        if (next.kind === 'network') fail({ kind: 'resend' });
        else {
          pending.current = null;
          fail(next);
        }
      }
    },
    [slug, problemOf, fail],
  );

  const start = useCallback(async () => {
    if (phase !== 'idle') return;
    setProblem(null);
    setPhase('starting');
    let started;
    try {
      started = await adsApi.startWeb(getDeviceKey(), slug);
    } catch (error) {
      fail(problemOf(error));
      return;
    }
    if (!alive.current) return;
    if (started.alreadyUnlocked || !started.transactionId || !started.adUnitPath) {
      // Đã mở khóa (ở tab khác, hoặc cổng không áp dụng): khỏi xem quảng cáo.
      if (started.alreadyUnlocked) {
        setPhase('idle');
        unlocked.current();
      } else fail({ kind: 'unavailable' });
      return;
    }
    const input: Pending = { transactionId: started.transactionId, adUnit: started.adUnitPath };
    setPhase('loading');
    const current = playRewardedAd(input.adUnit, { onVisible: () => alive.current && setPhase('watching') });
    handle.current = current;
    const outcome = await current.result;
    if (handle.current === current) handle.current = null;
    if (!alive.current) return;
    if (outcome === 'granted') {
      pending.current = input;
      await report(input);
    } else fail({ kind: outcome });
  }, [phase, slug, fail, problemOf, report]);

  /** Gửi lại lời báo thưởng đã xin được nhưng chưa tới máy chủ (mất mạng giữa chừng). */
  const resend = useCallback(() => {
    if (pending.current) void report(pending.current);
  }, [report]);

  return { phase, problem, start, resend };
}
