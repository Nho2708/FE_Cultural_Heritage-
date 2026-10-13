import { useLocalSearchParams } from 'expo-router';
import { GuardRedirect } from '../src/components/GuardRedirect';
import { SuggestionsScreen } from '../src/guest/SuggestionsScreen';
import { asSuggestionTab } from '../src/guest/suggestions';
import { entryHref } from '../src/navigation/entry';
import { useApp, useAuth } from '../src/state/AppProvider';

// "Xem tất cả" gợi ý và di sản gần bạn: chỉ của khách (lịch sử và vị trí không dùng cho học sinh). `tab` chọn tab mở sẵn.
export default function SuggestionsPage() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { chosenLanguage, mode } = useApp();
  const { session } = useAuth();
  if (mode !== 'guest') return <GuardRedirect href={entryHref({ chosenLanguage, mode, hasSession: Boolean(session), mustChangePassword: Boolean(session?.user.mustChangePassword) })} />;
  return <SuggestionsScreen initialTab={asSuggestionTab(tab)} />;
}
