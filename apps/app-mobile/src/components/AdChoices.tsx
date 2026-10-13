import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { privacyOptionsState, showPrivacyOptions, type PrivacyOptionsState } from '../ads/rewarded';
import { Button, Txt } from './ui';

// Mục "Quảng cáo" trong Cài đặt của khách: nút mở lại hộp tùy chọn quyền riêng tư của Google (UMP) để đổi ý về quảng cáo cá nhân hóa. Nút chỉ hiện khi Google báo vùng của khách yêu cầu
// tùy chọn này; vùng không yêu cầu, bản dựng không có quảng cáo hoặc hỏi Google lỗi thì giải thích bằng lời (lỗi thì cho thử lại).

export function AdChoices() {
  // Thử lại là dựng lại phần thân để hỏi Google một lần nữa.
  const [attempt, setAttempt] = useState(0);
  return <AdChoicesBody key={attempt} onRetry={() => setAttempt((n) => n + 1)} />;
}

function AdChoicesBody({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  const [state, setState] = useState<PrivacyOptionsState | null>(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void privacyOptionsState().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const open = async () => {
    setOpening(true);
    const opened = await showPrivacyOptions();
    setOpening(false);
    if (!opened) setState('failed');
  };

  return (
    <View style={{ gap: 6 }}>
      <Txt variant="label">{t('settings.ads')}</Txt>
      <Txt variant="caption">{t('settings.adsText')}</Txt>
      {state === null ? <Txt variant="caption">{t('common.loading')}</Txt> : null}
      {state === 'required' ? <Button label={t('settings.adsOptions')} variant="secondary" loading={opening} onPress={() => void open()} /> : null}
      {state === 'not-required' ? <Txt variant="caption">{t('settings.adsNotNeeded')}</Txt> : null}
      {state === 'unavailable' ? <Txt variant="caption">{t('settings.adsUnavailable')}</Txt> : null}
      {state === 'failed' ? (
        <>
          <Txt variant="caption">{t('settings.adsCheckFailed')}</Txt>
          <Button label={t('common.retry')} variant="ghost" onPress={onRetry} />
        </>
      ) : null}
    </View>
  );
}
