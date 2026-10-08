import { normalizeCode } from '@dsvhvn/dung-chung';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Field } from '../../src/components/Field';
import { Button, Notice, Screen, Txt } from '../../src/components/ui';
import { serverErrorText } from '../../src/hocsinh/serverErrorText';
import { useAuth, useServices } from '../../src/state/AppProvider';

// Nhập mã bài học: em chỉ gõ mã (viết hoa, bỏ khoảng trắng và dấu gạch). Máy chủ kiểm mã, bài đã xuất bản và bài thuộc lớp của em; sai thì báo chung một câu và giới hạn
// số lần nhập sai. Cùng mã này mở luôn bài kiểm tra của bài, em không nhập lần hai.

export default function EnterCode() {
  const { t } = useTranslation();
  const { studentApi } = useServices();
  const { session } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const code = normalizeCode(value);
    if (code === '') return setError(t('hs.code.required'));
    setError(null);
    setLoading(true);
    try {
      const { data } = await studentApi.lessonByCode(code);
      queryClient.setQueryData(['student', session?.user.id ?? null, 'lesson', code], data);
      setValue('');
      router.push({ pathname: '/bai-hoc/[ma]', params: { ma: code } });
    } catch (failure) {
      setError(serverErrorText(failure, t('hs.common.error')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Txt variant="heading" accessibilityRole="header">
        {t('hs.code.title')}
      </Txt>
      <Txt muted>{t('hs.code.hint')}</Txt>
      {error ? <Notice tone="error" text={error} /> : null}
      <Field
        label={t('hs.code.label')}
        value={value}
        onChangeText={(text) => setValue(normalizeCode(text))}
        placeholder={t('hs.code.placeholder')}
        // Mã gồm chữ in hoa và số ngẫu nhiên: bàn phím tiếng Việt kiểu Telex biến "UW" thành "Ư", "AS" thành "Á"... nên dùng kiểu nhập không gõ dấu (Android; iOS bỏ qua).
        keyboardType="visible-password"
        autoCapitalize="characters"
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
      />
      <Button label={t('hs.code.submit')} loading={loading} onPress={() => void submit()} full />
    </Screen>
  );
}
