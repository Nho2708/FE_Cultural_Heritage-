import type { HeritageCard } from '@dsvhvn/dung-chung/api';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { cardLine, imageUrl, typeName } from '../guest/format';
import { useApp } from '../state/AppProvider';
import { useTheme } from '../theme/ThemeProvider';
import { Badge, Card, Notice, Txt } from './ui';

// Thẻ di sản dùng ở trang chủ, tìm kiếm và gợi ý; ảnh thu nhỏ vừa đủ độ rộng, lỗi hoặc không có ảnh thì hiện nền giữ chỗ.

export function Photo({ url, width = 500, height, style }: { url: string | null | undefined; width?: number; height: number; style?: object }) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  const source = imageUrl(url, width);
  if (!source || failed) {
    return <View style={[{ height, backgroundColor: theme.color.surfaceContainerLow }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
  }
  return <Image source={{ uri: source }} style={[{ height, width: '100%', backgroundColor: theme.color.surfaceContainerLow }, style]} resizeMode="cover" onError={() => setFailed(true)} accessibilityIgnoresInvertColors />;
}

interface TileProps {
  card: Pick<HeritageCard, 'slug' | 'name' | 'thumbnailUrl' | 'provinceName' | 'recognitionLevel' | 'recognizedYear' | 'heritageType' | 'shortDescription' | 'isMachineTranslated'>;
  onPress: () => void;
  /** Dòng phụ thay cho tỉnh và cấp xếp hạng (ví dụ khoảng cách ở mục "Gần bạn"). */
  extra?: string;
  /** Xếp ngang: ảnh bên trái (danh sách tìm kiếm). */
  horizontal?: boolean;
  width?: number;
}

export function HeritageTile({ card, onPress, extra, horizontal = false, width }: TileProps) {
  const { language } = useApp();
  const { t } = useTranslation();
  const subtitle = [cardLine(card, language), extra].filter(Boolean).join(' · ');
  const type = typeName(card.heritageType, language);
  if (horizontal) {
    return (
      <Card onPress={onPress} accessibilityLabel={card.name}>
        <View style={styles.horizontal}>
          <Photo url={card.thumbnailUrl} width={330} height={104} style={styles.thumbSmall} />
          <View style={styles.body}>
            <Txt variant="title" numberOfLines={2}>
              {card.name}
            </Txt>
            {subtitle ? (
              <Txt variant="caption" numberOfLines={2}>
                {subtitle}
              </Txt>
            ) : null}
            <View style={styles.badges}>
              {type ? <Badge label={type} /> : null}
              {card.isMachineTranslated ? <Badge label={t('language.machineLabel')} tone="warning" /> : null}
            </View>
          </View>
        </View>
      </Card>
    );
  }
  return (
    <Card onPress={onPress} accessibilityLabel={card.name} style={width ? { width } : undefined}>
      <Photo url={card.thumbnailUrl} width={500} height={132} />
      <View style={styles.body}>
        <Txt variant="title" numberOfLines={2}>
          {card.name}
        </Txt>
        {subtitle ? (
          <Txt variant="caption" numberOfLines={2}>
            {subtitle}
          </Txt>
        ) : null}
        {card.isMachineTranslated ? <Badge label={t('language.machineLabel')} tone="warning" /> : null}
      </View>
    </Card>
  );
}

/** Báo một lần cho cả danh sách: có thẻ lùi về tiếng Việt, có thẻ là bản dịch máy. */
export function ListNotes({ cards }: { cards: ReadonlyArray<Pick<HeritageCard, 'isFallback' | 'isMachineTranslated'>> }) {
  const { language } = useApp();
  const { t } = useTranslation();
  if (language === 'vi') return null;
  const fallback = cards.some((card) => card.isFallback === true);
  const machine = cards.some((card) => card.isMachineTranslated === true);
  const languageName = t(`language.names.${language}`);
  return (
    <>
      {fallback ? <Notice text={t('language.fallbackList', { language: languageName })} /> : null}
      {machine ? <Notice text={t('language.machineHint')} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  horizontal: { flexDirection: 'row' },
  thumbSmall: { width: 104 },
  body: { padding: 12, gap: 4, flexShrink: 1, flexGrow: 1 },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 },
});
