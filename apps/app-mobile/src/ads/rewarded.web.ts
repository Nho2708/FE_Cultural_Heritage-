// Bản web (chỉ để thử bản dựng) không có quảng cáo của Google trong app; xem `rewarded.ts` cho bản ứng dụng gốc.

export type RewardedOutcome = 'earned' | 'closed' | 'failed' | 'unavailable';

export function adsAvailable(): boolean {
  return false;
}

export async function showRewardedAd(_unitId: string, _deviceKey: string, _heritageId: number): Promise<RewardedOutcome> {
  return 'unavailable';
}
