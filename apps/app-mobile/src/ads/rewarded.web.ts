// Bản web (chỉ để thử bản dựng) không có quảng cáo của Google trong app; xem `rewarded.ts` cho bản ứng dụng gốc.

export type RewardedOutcome = 'earned' | 'closed' | 'noFill' | 'failed' | 'unavailable';

export type PrivacyOptionsState = 'required' | 'not-required' | 'unavailable' | 'failed';

export async function privacyOptionsState(): Promise<PrivacyOptionsState> {
  return 'unavailable';
}

export async function showPrivacyOptions(): Promise<boolean> {
  return false;
}

export function adsAvailable(): boolean {
  return false;
}

export async function prepareAds(): Promise<boolean> {
  return false;
}

export function preloadRewardedAd(_unitId: string, _deviceKey: string, _heritageId: number): void {}

export async function showRewardedAd(_unitId: string, _deviceKey: string, _heritageId: number): Promise<RewardedOutcome> {
  return 'unavailable';
}
