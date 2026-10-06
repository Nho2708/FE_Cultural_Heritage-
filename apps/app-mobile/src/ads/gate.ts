import { ApiError, ERROR_CODES } from '@dsvhvn/dung-chung/api';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useApp } from '../state/AppProvider';
import { pollUntilUnlocked } from './poll';
import { adsAvailable, showRewardedAd } from './rewarded';

// Cổng quảng cáo có thưởng cho tóm tắt và nghe thuyết minh của khách. Máy chủ quyết định: tóm tắt trả 403 `AD_UNLOCK_REQUIRED` thì màn hình hiện lời mời; khách bấm xem
// thì app lấy đơn vị quảng cáo và mã di sản từ máy chủ, hiện quảng cáo AdMob (chỉ ở bản dựng phát triển), rồi hỏi `GET /public/ads/unlock` đến khi máy chủ báo đã mở
// (máy chủ chỉ mở khi Google xác nhận phần thưởng). Chế độ Học sinh không bao giờ có quảng cáo.

/** Phản hồi 403 của tóm tắt là lời mời xem quảng cáo. */
export function isUnlockRequired(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403 && error.code === ERROR_CODES.adUnlockRequired;
}

export type AdPhase = 'idle' | 'working' | 'verifying';
export type AdProblem = 'needBuild' | 'closedEarly' | 'rejected' | 'network';

class AdFailure extends Error {
  constructor(readonly reason: AdProblem) {
    super(reason);
  }
}

export function useAdUnlock(slug: string, onUnlocked: () => void) {
  const { services } = useApp();
  const [phase, setPhase] = useState<AdPhase>('idle');
  const [problem, setProblem] = useState<AdProblem | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const watch = useCallback(async () => {
    setProblem(null);
    if (!adsAvailable()) return setProblem('needBuild');
    setPhase('working');
    const { platform, deviceId } = services;
    try {
      const [config, status] = await Promise.all([services.adsApi.config(), services.adsApi.unlock(deviceId, slug, { platform })]);
      const unitId = Platform.OS === 'ios' ? config.iosAdUnitId : config.androidAdUnitId;
      if (!status.unlocked && status.gateRequired) {
        if (!unitId) throw new AdFailure('rejected');
        const outcome = await showRewardedAd(unitId, deviceId, status.heritageId);
        if (outcome === 'closed') throw new AdFailure('closedEarly');
        if (outcome !== 'earned') throw new AdFailure('rejected');
        if (alive.current) setPhase('verifying');
        const ok = await pollUntilUnlocked(async () => (await services.adsApi.unlock(deviceId, slug, { platform })).unlocked);
        if (!ok) throw new AdFailure('rejected');
      }
      if (alive.current) {
        setPhase('idle');
        onUnlocked();
      }
    } catch (error) {
      if (!alive.current) return;
      setPhase('idle');
      setProblem(error instanceof AdFailure ? error.reason : error instanceof ApiError && error.status > 0 ? 'rejected' : 'network');
    }
  }, [services, slug, onUnlocked]);

  return { phase, problem, watch, canWatch: adsAvailable() };
}
