import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dismissVoiceNotice, getVoiceNoticeVisible, subscribeVoiceNotice } from '../speech/voiceNotice';
import { useTheme } from '../theme/ThemeProvider';

// Lời báo ngắn "Máy này chưa đọc được tiếng Việt": hiện một lần khi bấm nghe mà máy chủ chưa có tiếng và điện thoại không có giọng tiếng Việt. Nổi ở đáy màn
// hình, không chặn thao tác, tự tắt sau vài giây, chạm là tắt. Đặt một lần ở gốc app.

export function VoiceNotice() {
  const visible = useSyncExternalStore(subscribeVoiceNotice, getVoiceNoticeVisible, getVoiceNoticeVisible);
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  if (!visible) return null;
  return (
    <View pointerEvents="box-none" style={[local.wrap, { bottom: insets.bottom + 16 }]}>
      <Pressable
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel={t('hs.one.noVoice')}
        accessibilityHint={t('hs.one.noVoiceDismiss')}
        onPress={dismissVoiceNotice}
        style={[local.box, { backgroundColor: theme.color.onBackground }]}
      >
        <Text style={{ fontSize: 17, lineHeight: 24, fontWeight: '700', color: theme.color.background, textAlign: 'center' }}>{t('hs.one.noVoice')}</Text>
      </Pressable>
    </View>
  );
}

const local = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  box: { minHeight: 48, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, justifyContent: 'center', maxWidth: '100%' },
});
