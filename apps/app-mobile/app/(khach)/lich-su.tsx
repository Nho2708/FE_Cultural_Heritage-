import { LANGUAGES } from '@dsvhvn/dung-chung/i18n';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, Switch, View } from 'react-native';
import { AdChoices } from '../../src/components/AdChoices';
import { confirmAction } from '../../src/components/confirm';
import { Button, Card, Divider, Notice, Screen, Section, Txt, styles as ui } from '../../src/components/ui';
import { API_BASE_URL, APP_CHANNEL, APP_VERSION, PRIVACY_POLICY_URL } from '../../src/config/env';
import { useHistory } from '../../src/guest/HistoryProvider';
import type { HistoryEntry, HistoryKind } from '../../src/guest/historyCore';
import { localeOf } from '../../src/i18n/dates';
import { useApp } from '../../src/state/AppProvider';
import { useTheme } from '../../src/theme/ThemeProvider';

// Lịch sử và cài đặt của khách. Lịch sử (từ khóa đã tìm, di sản đã xem, nghe, xem 3D) lưu ở máy chủ theo mã thiết bị ẩn danh, xóa được từng mục hoặc xóa hết, tự xóa sau 90 ngày.
// Cài đặt: ngôn ngữ, vị trí, thông tin quảng cáo, đổi chế độ.

const GROUPS: Array<{ kind: HistoryKind; title: 'searches' | 'viewed' | 'listened' | 'viewed3d' }> = [
  { kind: 'search', title: 'searches' },
  { kind: 'view', title: 'viewed' },
  { kind: 'listen', title: 'listened' },
  { kind: 'model', title: 'viewed3d' },
];

export default function HistoryAndSettings() {
  const { t } = useTranslation();
  const { language, locationEnabled, setLocationEnabled, chooseMode } = useApp();
  const theme = useTheme();
  const router = useRouter();
  const history = useHistory();

  const toggleLocation = async (next: boolean) => {
    if (!next) return setLocationEnabled(false);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      setLocationEnabled(permission.granted);
    } catch {
      setLocationEnabled(false);
    }
  };

  const openEntry = (entry: HistoryEntry) => {
    if (entry.kind === 'search') router.push({ pathname: '/(khach)/tim-kiem', params: { q: entry.key } });
    else router.push({ pathname: '/di-san/[slug]', params: { slug: entry.key } });
  };

  const languageName = LANGUAGES.find((option) => option.code === language)?.nativeName ?? language;

  return (
    <Screen>
      <Section
        title={t('history.title')}
        right={history.entries.length > 0 ? <Button label={t('history.clearAll')} variant="ghost" onPress={() => confirmAction(t('history.clearAll'), t('history.clearConfirm'), t('common.clear'), t('common.cancel'), history.clear)} /> : null}
      >
        {history.entries.length === 0 ? (
          <Notice text={t('history.empty')} />
        ) : (
          GROUPS.map(({ kind, title }) => {
            const items = history.entries.filter((entry) => entry.kind === kind).slice(0, 12);
            if (items.length === 0) return null;
            return (
              <View key={kind} style={{ gap: 6 }}>
                <Txt variant="label">{t(`history.${title}`)}</Txt>
                <Card>
                  {items.map((entry, index) => (
                    <View key={`${entry.kind}-${entry.key}-${entry.at}`}>
                      {index > 0 ? <Divider /> : null}
                      <View style={[ui.row, local.entry]}>
                        <Pressable accessibilityRole="button" accessibilityLabel={entry.label} onPress={() => openEntry(entry)} style={[ui.grow, { minHeight: theme.touchTarget, justifyContent: 'center' }]}>
                          <Txt numberOfLines={2}>{entry.label}</Txt>
                          <Txt variant="caption">{new Date(entry.at).toLocaleDateString(localeOf(language))}</Txt>
                        </Pressable>
                        <Button label="✕" accessibilityLabel={t('history.remove')} variant="ghost" onPress={() => history.remove(entry)} />
                      </View>
                    </View>
                  ))}
                </Card>
              </View>
            );
          })
        )}
        <Txt variant="caption" muted>
          {t('history.retention')}
        </Txt>
      </Section>

      <Section title={t('settings.title')}>
        <Card>
          <View style={local.setting}>
            <Txt variant="label">{t('settings.language')}</Txt>
            <View style={ui.row}>
              <Txt style={ui.grow}>{languageName}</Txt>
              <Button label={t('language.title')} variant="secondary" onPress={() => router.push('/chon-ngon-ngu')} />
            </View>
          </View>
          <Divider />
          <View style={local.setting}>
            <Txt variant="label">{t('intro.title')}</Txt>
            <Txt variant="caption">{t('intro.replayText')}</Txt>
            <Button label={t('intro.replay')} variant="secondary" onPress={() => router.push('/gioi-thieu')} />
          </View>
          <Divider />
          <View style={local.setting}>
            <Txt variant="label">{t('intro.videoTitle')}</Txt>
            <Txt variant="caption">{t('intro.videoText')}</Txt>
            <Button label={t('intro.watchVideo')} variant="secondary" onPress={() => router.push('/video-gioi-thieu')} />
          </View>
          <Divider />
          <View style={local.setting}>
            <View style={ui.row}>
              <View style={ui.grow}>
                <Txt variant="label">{t('settings.location')}</Txt>
                <Txt variant="caption">{locationEnabled ? t('settings.locationOn') : t('settings.locationOff')}</Txt>
              </View>
              <Switch
                value={locationEnabled}
                onValueChange={(next) => void toggleLocation(next)}
                accessibilityLabel={t('settings.location')}
                trackColor={{ true: theme.color.primary, false: theme.color.border }}
              />
            </View>
          </View>
          <Divider />
          <View style={local.setting}>
            <AdChoices />
          </View>
          <Divider />
          <View style={local.setting}>
            <Txt variant="label">{t('settings.privacy')}</Txt>
            <Txt variant="caption">{t('settings.privacyText')}</Txt>
            <Button label={t('settings.openPrivacy')} variant="secondary" onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)} />
          </View>
          <Divider />
          <View style={local.setting}>
            <Txt variant="label">{t('settings.mode')}</Txt>
            <Txt variant="caption">{t('settings.modeText')}</Txt>
            <Button
              label={t('settings.switchToStudent')}
              variant="secondary"
              onPress={() => chooseMode('student')}
            />
          </View>
        </Card>
        <Txt variant="caption" muted>
          {t('settings.version')}: {APP_VERSION} ({APP_CHANNEL})
        </Txt>
        <Txt variant="caption" muted>
          {t('settings.apiAddress')}: {API_BASE_URL}
        </Txt>
      </Section>
    </Screen>
  );
}

const local = StyleSheet.create({
  entry: { paddingHorizontal: 12, paddingVertical: 4 },
  setting: { padding: 14, gap: 6 },
});
