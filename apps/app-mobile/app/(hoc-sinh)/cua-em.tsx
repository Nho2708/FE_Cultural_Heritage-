import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, View } from 'react-native';
import { SCHOOL_LEVEL_LABEL } from '@dsvhvn/dung-chung/theme';
import { Button, Card, Divider, Screen, Txt } from '../../src/components/ui';
import { APP_CHANNEL, APP_VERSION } from '../../src/config/env';
import { useApp, useAuth } from '../../src/state/AppProvider';

// Của em: hồ sơ (mã học sinh, lớp, cấp học, trường), đổi mật khẩu, đăng xuất, đổi sang chế độ Khách tham quan (cũng đăng xuất vì token không ở lại trên máy khi không còn dùng).

function ask(title: string, yes: string, no: string, onYes: () => void) {
  Alert.alert(title, undefined, [
    { text: no, style: 'cancel' },
    { text: yes, style: 'destructive', onPress: onYes },
  ]);
}

export default function Account() {
  const { t } = useTranslation();
  const { signOut, chooseMode } = useApp();
  const { session } = useAuth();
  const router = useRouter();
  if (!session) return null;
  const user = session.user;

  const rows: Array<[string, string | null | undefined]> = [
    [t('hs.account.code'), user.studentCode],
    [t('hs.account.classLabel'), user.class?.name],
    [t('hs.account.level'), user.schoolLevel ? SCHOOL_LEVEL_LABEL[user.schoolLevel] : null],
    [t('hs.account.school'), user.organization?.name],
  ];

  return (
    <Screen>
      <Txt variant="heading" accessibilityRole="header">
        {user.fullName ?? t('hs.account.title')}
      </Txt>
      <Card>
        {rows.map(([label, value], index) => (
          <View key={label}>
            {index > 0 ? <Divider /> : null}
            <View style={{ padding: 14, gap: 2 }}>
              <Txt variant="caption">{label}</Txt>
              <Txt variant="label">{value ?? '-'}</Txt>
            </View>
          </View>
        ))}
      </Card>
      <Button label={t('hs.account.changePassword')} variant="secondary" onPress={() => router.push('/doi-mat-khau')} full />
      <Button
        label={t('hs.account.signOut')}
        variant="secondary"
        full
        onPress={() =>
          ask(t('hs.account.signOutConfirm'), t('hs.account.yes'), t('hs.account.no'), () => {
            signOut();
            router.replace('/');
          })
        }
      />
      <Button
        label={t('hs.account.switchToVisitor')}
        variant="ghost"
        onPress={() =>
          ask(t('hs.account.switchConfirm'), t('hs.account.yes'), t('hs.account.no'), () => {
            chooseMode('guest');
            router.replace('/');
          })
        }
      />
      <Txt variant="caption" muted>
        {t('hs.account.version')}: {APP_VERSION} ({APP_CHANNEL})
      </Txt>
    </Screen>
  );
}
