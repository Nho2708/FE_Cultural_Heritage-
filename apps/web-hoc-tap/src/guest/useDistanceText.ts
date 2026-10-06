import { formatDistance } from '@dsvhvn/dung-chung';
import { useI18n } from '../i18n/context';
import { localeOf } from '../i18n/format';

/** Chữ khoảng cách "Gần bạn" theo ngôn ngữ đang chọn ("Cách 350 m", "1.2 km away"). */
export function useDistanceText() {
  const { language, t } = useI18n();
  return (meters: number) => t.guest.nearby.away(formatDistance(meters, localeOf(language)));
}
