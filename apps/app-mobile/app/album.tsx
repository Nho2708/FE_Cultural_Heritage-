import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ErrorState, Loading } from '../src/components/ui';
import { AlbumScreen } from '../src/hocsinh/levelOne/AlbumScreen';
import { useStudentAlbum } from '../src/hocsinh/queries';
import { useApp, useAuth } from '../src/state/AppProvider';

// Album di sản của học sinh (cấp 1), mở từ trạm cuối con đường, bước Nhận thẻ và trang kết quả. Chỉ học sinh đã đăng nhập mới vào được;
// chạm "Xem về di sản này" mở trang chi tiết di sản (cùng trang với khách).

export default function Album() {
  const { mode } = useApp();
  const { session } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const album = useStudentAlbum();

  if (mode !== 'student' || !session) return <Redirect href="/" />;
  if (album.isLoading) return <Loading label={t('hs.common.loading')} />;
  if (album.isError || !album.data) return <ErrorState message={t('hs.common.error')} retryLabel={t('hs.common.retry')} onRetry={() => void album.refetch()} />;

  return (
    <AlbumScreen
      album={album.data}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(hoc-sinh)/hoc'))}
      onOpenHeritage={(slug) => router.push({ pathname: '/di-san/[slug]', params: { slug } })}
    />
  );
}
