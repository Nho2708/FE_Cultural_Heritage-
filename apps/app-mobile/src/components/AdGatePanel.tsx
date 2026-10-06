import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useAdUnlock } from '../ads/gate';
import { Button, Card, Loading, Notice, Txt } from './ui';

// Lời mời xem quảng cáo hiện thay tóm tắt khi máy chủ báo di sản chưa mở khóa trên thiết bị này. Chỉ tóm tắt và nghe bị khóa; mọi nội dung khác vẫn miễn phí.
// Expo Go không có quảng cáo: hiện rõ cần bản dựng phát triển (xem README).

export function AdGatePanel({ slug, onUnlocked }: { slug: string; onUnlocked: () => void }) {
  const { t } = useTranslation();
  const gate = useAdUnlock(slug, onUnlocked);
  return (
    <Card>
      <View style={{ padding: 14, gap: 10 }}>
        <Txt variant="title" accessibilityRole="header">
          {t('ad.title')}
        </Txt>
        <Txt>{t('ad.text')}</Txt>
        <Txt variant="caption" muted>
          {t('ad.reward')}
        </Txt>
        {!gate.canWatch ? <Notice text={t('ad.needBuild')} /> : null}
        {gate.problem && gate.problem !== 'needBuild' ? <Notice text={t(`ad.${gate.problem}`)} tone="error" /> : null}
        {gate.phase === 'verifying' ? <Loading label={t('ad.verifying')} /> : null}
        <Button label={t('ad.watch')} loading={gate.phase !== 'idle'} disabled={!gate.canWatch} onPress={() => void gate.watch()} />
      </View>
    </Card>
  );
}
