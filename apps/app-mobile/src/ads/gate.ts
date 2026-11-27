import { ApiError, ERROR_CODES, type AdConfig } from '@dsvhvn/dung-chung/api';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useApp } from '../state/AppProvider';
import { pollUntilUnlocked } from './poll';
import { adsAvailable, preloadRewardedAd, showRewardedAd } from './rewarded';

// Cổng quảng cáo có thưởng cho tóm tắt và nghe thuyết minh của khách. Máy chủ quyết định: tóm tắt trả 403 `AD_UNLOCK_REQUIRED` thì màn hình hiện lời mời; lúc đó app
// lấy đơn vị quảng cáo và mã di sản từ máy chủ rồi tải sẵn quảng cáo AdMob (chỉ ở bản dựng phát triển). Khách bấm xem thì chiếu quảng cáo, rồi hỏi
// `GET /public/ads/unlock` đến khi máy chủ báo đã mở (máy chủ chỉ mở khi Google xác nhận phần thưởng). Chế độ Học sinh không bao giờ có quảng cáo.

/** Phản hồi 403 của tóm tắt là lời mời xem quảng cáo. */
export function isUnlockRequired(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403 && error.code === ERROR_CODES.adUnlockRequired;
}

export type AdPhase = 'idle' | 'working' | 'verifying';
export type AdProblem = 'needBuild' | 'closedEarly' | 'notReady' | 'rejected' | 'network';

class AdFailure extends Error {
  constructor(readonly reason: AdProblem) {
    super(reason);
  }
}

function unitIdOf(config: AdConfig): string | null {
  return Platform.OS === 'ios' ? config.iosAdUnitId : config.androidAdUnitId;
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

  // Tải sẵn quảng cáo ngay khi hiện lời mời: quảng cáo video có khi tải gần một phút, khách bấm "Xem quảng cáo" thì chiếu được ngay hoặc chờ ít hơn. Lỗi thì bỏ qua, lúc bấm tải lại.
  useEffect(() => {
    if (!adsAvailable()) return;
    let cancelled = false;
    const { platform, deviceId } = services;
    void Promise.all([services.adsApi.config(), services.adsApi.unlock(deviceId, slug, { platform })])
      .then(([config, status]) => {
        const unitId = unitIdOf(config);
        if (!cancelled && unitId && !status.unlocked && status.gateRequired) preloadRewardedAd(unitId, deviceId, status.heritageId);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [services, slug]);

  const watch = useCallback(async () => {
    setProblem(null);
    if (!adsAvailable()) return setProblem('needBuild');
    setPhase('working');
    const { platform, deviceId } = services;
    try {
      const [config, status] = await Promise.all([services.adsApi.config(), services.adsApi.unlock(deviceId, slug, { platform })]);
      const unitId = unitIdOf(config);
      if (!status.unlocked && status.gateRequired) {
        if (!unitId) throw new AdFailure('rejected');
        const outcome = await showRewardedAd(unitId, deviceId, status.heritageId);
        if (outcome === 'closed') throw new AdFailure('closedEarly');
        if (outcome === 'noFill') throw new AdFailure('notReady');
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
