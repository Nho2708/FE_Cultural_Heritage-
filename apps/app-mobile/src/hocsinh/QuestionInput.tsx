import { clearMatch, fillNextBlank, moveOrderItem, optionLetter, setBlank, setMatch, setStatement, splitBlanks, toggleOrderItem } from '@dsvhvn/dung-chung';
import type { AttemptQuestion, QuestionSubmission } from '@dsvhvn/dung-chung/api';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Photo } from '../components/Heritage';
import { Button, Txt, styles as ui } from '../components/ui';
import { useTheme } from '../theme/ThemeProvider';

// Ô trả lời của tám dạng câu trên điện thoại (chạm, không kéo thả). Một bộ thành phần, ba cách trình bày theo cấp học của lớp em: cấp 1 nút to và hình lớn, cấp 2 cân bằng,
// cấp 3 gọn. Mọi vị trí trong câu trả lời tính theo thứ tự đang hiện trên màn hình (máy chủ đã xáo cố định theo lượt). Mỗi thao tác trả về cả câu trả lời mới;
// việc lưu do hook làm bài đảm nhiệm.

export type QuizLevel = 1 | 2 | 3;

export interface QuestionInputProps {
  question: AttemptQuestion;
  answer: QuestionSubmission | null;
  onChange: (next: QuestionSubmission) => void;
  level: QuizLevel;
  disabled?: boolean;
}

const OPTION_PADDING: Record<QuizLevel, number> = { 1: 20, 2: 16, 3: 12 };

function useChoiceStyle(level: QuizLevel) {
  const theme = useTheme();
  return (selected: boolean) => ({
    minHeight: level === 1 ? 64 : theme.touchTarget + 8,
    padding: OPTION_PADDING[level],
    borderRadius: theme.radius.option,
    borderWidth: 2,
    borderColor: selected ? theme.color.primary : theme.color.border,
    backgroundColor: selected ? theme.color.primaryContainer : theme.color.surface,
  });
}

function Letter({ index, selected, level }: { index: number; selected: boolean; level: QuizLevel }) {
  const theme = useTheme();
  const size = level === 1 ? 44 : 32;
  return (
    <View style={[local.letter, { width: size, height: size, borderRadius: size / 2, backgroundColor: selected ? theme.color.primary : theme.color.surfaceContainerLow }]}>
      <Text style={{ color: selected ? theme.color.onPrimary : theme.color.onSurfaceVariant, fontWeight: '700', fontSize: level === 1 ? 20 : 15 }}>{selected && level === 1 ? '✓' : optionLetter(index)}</Text>
    </View>
  );
}

// ---- Chọn một phương án: Một đáp án đúng, Đúng/Sai, Đọc tư liệu ----

function OptionsInput({ question, answer, onChange, level, disabled }: QuestionInputProps) {
  const theme = useTheme();
  const choice = useChoiceStyle(level);
  const selected = answer?.selectedIndex ?? null;
  return (
    <View accessibilityRole="radiogroup" style={{ gap: 12 }}>
      {question.options.map((option, index) => (
        <Pressable
          key={index}
          accessibilityRole="radio"
          accessibilityState={{ selected: selected === index, disabled }}
          accessibilityLabel={`${optionLetter(index)}. ${option.content ?? ''}`}
          disabled={disabled}
          onPress={() => onChange({ selectedIndex: index })}
          style={[local.optionRow, choice(selected === index)]}
        >
          <Letter index={index} selected={selected === index} level={level} />
          <Txt variant={level === 1 ? 'title' : 'body'} style={[ui.grow, { color: selected === index ? theme.color.onPrimaryContainer : theme.color.onBackground }]}>
            {option.content}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}

// ---- Chọn hình đúng (cấp 1) ----

function ImageChoiceInput({ question, answer, onChange, level, disabled }: QuestionInputProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const selected = answer?.selectedIndex ?? null;
  return (
    <View accessibilityRole="radiogroup" style={local.grid}>
      {question.options.map((option, index) => {
        const on = selected === index;
        return (
          <Pressable
            key={index}
            accessibilityRole="radio"
            accessibilityState={{ selected: on, disabled }}
            accessibilityLabel={option.content ?? t('hs.quiz.imageN', { letter: optionLetter(index) })}
            disabled={disabled}
            onPress={() => onChange({ selectedIndex: index })}
            style={[local.imageCard, { borderRadius: theme.radius.option, borderColor: on ? theme.color.primary : theme.color.border, backgroundColor: on ? theme.color.primaryContainer : theme.color.surface }]}
          >
            <Photo url={option.imageUrl} width={500} height={level === 1 ? 130 : 110} />
            <View style={[ui.row, { padding: 8 }]}>
              <Txt variant={level === 1 ? 'title' : 'label'} style={ui.grow}>
                {option.content ?? t('hs.quiz.imageN', { letter: optionLetter(index) })}
              </Txt>
              {on ? <Text style={{ color: theme.color.primary, fontSize: 22, fontWeight: '700' }}>✓</Text> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---- Ghép cặp ----

type PickState = { side: 'left' | 'right'; index: number } | null;

function MatchingInput({ question, answer, onChange, level, disabled }: QuestionInputProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const count = question.leftItems.length;
  const matches = answer?.matches ?? null;
  const [pick, setPick] = useState<PickState>(null);
  const usedRight = new Set((matches ?? []).filter((m): m is number => m !== null && m !== undefined));

  const commit = (left: number, right: number) => {
    onChange({ matches: setMatch(matches, count, left, right) });
    setPick(null);
  };
  const onLeft = (left: number) => {
    if (pick?.side === 'right') commit(left, pick.index);
    else setPick(pick?.side === 'left' && pick.index === left ? null : { side: 'left', index: left });
  };
  const onRight = (right: number) => {
    if (pick?.side === 'left') commit(pick.index, right);
    else setPick(pick?.side === 'right' && pick.index === right ? null : { side: 'right', index: right });
  };

  return (
    <View style={{ gap: 16 }}>
      <Txt variant="caption">{level === 1 ? t('hs.quiz.matchHintOne') : t('hs.quiz.matchHint')}</Txt>
      <View style={{ gap: 12 }}>
        {question.leftItems.map((item, left) => {
          const right = matches?.[left] ?? null;
          const picked = pick?.side === 'left' && pick.index === left;
          return (
            <View
              key={left}
              style={[local.matchCard, { borderRadius: theme.radius.option, borderColor: picked ? theme.color.primary : right !== null ? theme.color.correct : theme.color.border, backgroundColor: picked ? theme.color.primaryContainer : theme.color.surface }]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: picked, disabled }}
                accessibilityLabel={t('hs.quiz.matchLeftLabel', { n: left + 1, name: item.content ?? '', state: right !== null ? t('hs.quiz.matchedWith', { name: question.rightItems[right] ?? '' }) : t('hs.quiz.notMatched') })}
                disabled={disabled}
                onPress={() => onLeft(left)}
              >
                {item.imageUrl ? <Photo url={item.imageUrl} width={500} height={level === 1 ? 140 : 110} /> : null}
                {item.content ? (
                  <Txt variant="label" style={{ padding: 8 }}>
                    {item.content}
                  </Txt>
                ) : null}
              </Pressable>
              <View style={[ui.row, { minHeight: 44, paddingHorizontal: 10, paddingBottom: 8 }]}>
                {right !== null ? (
                  <>
                    <Txt variant={level === 1 ? 'title' : 'label'} color={theme.color.correct} style={ui.grow}>
                      ✓ {question.rightItems[right]}
                    </Txt>
                    <Button label="✕" variant="ghost" accessibilityLabel={t('hs.quiz.unmatch', { n: left + 1 })} disabled={disabled} onPress={() => onChange({ matches: clearMatch(matches, count, left) })} />
                  </>
                ) : (
                  <Txt variant="caption">{t('hs.quiz.notMatched')}</Txt>
                )}
              </View>
            </View>
          );
        })}
      </View>
      <View style={ui.wrap}>
        {question.rightItems.map((name, right) => {
          const used = usedRight.has(right);
          const picked = pick?.side === 'right' && pick.index === right;
          return (
            <Pressable
              key={right}
              accessibilityRole="button"
              accessibilityState={{ selected: picked, disabled: disabled || used }}
              disabled={disabled || used}
              onPress={() => onRight(right)}
              style={[local.pill, { minHeight: level === 1 ? 56 : 44, opacity: used ? 0.4 : 1, borderColor: picked ? theme.color.primary : theme.color.border, backgroundColor: picked ? theme.color.primary : theme.color.surface }]}
            >
              <Txt variant={level === 1 ? 'title' : 'label'} color={picked ? theme.color.onPrimary : theme.color.onBackground}>
                {name}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ---- Sắp xếp ----

function OrderingInput({ question, answer, onChange, level, disabled }: QuestionInputProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const choice = useChoiceStyle(level);
  const order = answer?.order ?? [];
  const total = question.items.length;
  const rank = new Map(order.map((item, position) => [item, position]));
  const complete = order.length === total && total > 0;

  return (
    <View style={{ gap: 14 }}>
      <Txt variant="caption">{t('hs.quiz.orderHint')}</Txt>
      {question.items.map((text, item) => {
        const position = rank.get(item);
        const placed = position !== undefined;
        return (
          <View key={item} style={[ui.row, { gap: 8 }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: placed, disabled }}
              accessibilityLabel={placed ? t('hs.quiz.orderPlaced', { text, n: position + 1 }) : t('hs.quiz.orderNotPlaced', { text })}
              disabled={disabled}
              onPress={() => onChange({ order: toggleOrderItem(order, item) })}
              style={[local.optionRow, choice(placed), ui.grow]}
            >
              <View style={[local.rank, { borderColor: placed ? theme.color.primary : theme.color.border, backgroundColor: placed ? theme.color.primary : 'transparent', borderStyle: placed ? 'solid' : 'dashed' }]}>
                <Text style={{ color: placed ? theme.color.onPrimary : 'transparent', fontWeight: '700' }}>{placed ? position + 1 : '·'}</Text>
              </View>
              <Txt variant={level === 1 ? 'title' : 'body'} style={ui.grow}>
                {text}
              </Txt>
            </Pressable>
            {placed && level !== 1 ? (
              <View>
                <Button label="▲" variant="ghost" accessibilityLabel={t('hs.quiz.moveUp', { text })} disabled={disabled || position === 0} onPress={() => onChange({ order: moveOrderItem(order, position, -1) })} />
                <Button label="▼" variant="ghost" accessibilityLabel={t('hs.quiz.moveDown', { text })} disabled={disabled || position === order.length - 1} onPress={() => onChange({ order: moveOrderItem(order, position, 1) })} />
              </View>
            ) : null}
          </View>
        );
      })}
      <View style={[ui.row, { gap: 12 }]}>
        <Txt variant="caption" style={ui.grow}>
          {complete ? t('hs.quiz.orderComplete') : t('hs.quiz.orderProgress', { done: order.length, total })}
        </Txt>
        {order.length > 0 ? <Button label={t('hs.quiz.orderReset')} variant="ghost" disabled={disabled} onPress={() => onChange({ order: [] })} /> : null}
      </View>
    </View>
  );
}

// ---- Điền từ ----

function FillBlankInput({ question, answer, onChange, level, disabled }: QuestionInputProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const count = question.blankCount;
  const blanks = answer?.blanks ?? null;
  const segments = splitBlanks(question.content);
  const bank = question.wordBank;
  const taken = new Map<string, number>();
  for (const word of blanks ?? []) if (word) taken.set(word, (taken.get(word) ?? 0) + 1);

  return (
    <View style={{ gap: 16 }}>
      <View style={styles2.sentence}>
        {segments.map((text, index) => (
          <View key={index} style={styles2.segment}>
            <Txt variant={level === 1 ? 'heading' : 'question'} style={[{ flexShrink: 1 }, level === 1 ? { fontSize: theme.text.questionSize } : null]}>
              {text}
            </Txt>
            {index < count && index < segments.length - 1 ? (
              bank.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('hs.quiz.blankN', { n: index + 1, state: blanks?.[index] ? t('hs.quiz.blankFilled', { word: blanks[index] }) : t('hs.quiz.blankEmpty') })}
                  disabled={disabled}
                  onPress={() => blanks?.[index] && onChange({ blanks: setBlank(blanks, count, index, '') })}
                  style={[local.blank, { borderColor: blanks?.[index] ? theme.color.primary : theme.color.border, backgroundColor: blanks?.[index] ? theme.color.primaryContainer : theme.color.surfaceContainerLow }]}
                >
                  <Txt variant="label">{blanks?.[index] || '______'}</Txt>
                </Pressable>
              ) : (
                <TextInput
                  accessibilityLabel={t('hs.quiz.blankN', { n: index + 1, state: '' })}
                  value={blanks?.[index] ?? ''}
                  editable={!disabled}
                  maxLength={255}
                  autoCorrect={false}
                  onChangeText={(value) => onChange({ blanks: setBlank(blanks, count, index, value) })}
                  style={[local.blankInput, { borderColor: theme.color.border, color: theme.color.onBackground, backgroundColor: theme.color.surface, fontSize: theme.text.bodySize }]}
                />
              )
            ) : null}
          </View>
        ))}
      </View>
      {bank.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Txt variant="caption">{t('hs.quiz.wordBank')}</Txt>
          <View style={ui.wrap}>
            {bank.map((word, index) => {
              const left = taken.get(word) ?? 0;
              const isUsed = left > 0;
              if (isUsed) taken.set(word, left - 1);
              return (
                <Pressable
                  key={index}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: disabled || isUsed }}
                  disabled={disabled || isUsed}
                  onPress={() => onChange({ blanks: fillNextBlank(blanks, count, word) })}
                  style={[local.pill, { minHeight: level === 1 ? 56 : 44, opacity: isUsed ? 0.4 : 1, borderColor: theme.color.border, backgroundColor: theme.color.surface }]}
                >
                  <Txt variant={level === 1 ? 'title' : 'label'}>{word}</Txt>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ---- Nhiều mệnh đề Đúng/Sai ----

function MultiTrueFalseInput({ question, answer, onChange, level, disabled }: QuestionInputProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const count = question.statements.length;
  const statements = answer?.statements ?? null;
  return (
    <View style={{ gap: 12 }}>
      {question.statements.map((text, index) => {
        const value = statements?.[index] ?? null;
        const label = `${String.fromCharCode(97 + index)})`;
        return (
          <View key={index} style={[local.statement, { borderRadius: theme.radius.option, borderColor: theme.color.border, backgroundColor: theme.color.surface }]}>
            <Txt variant={level === 1 ? 'title' : 'body'}>
              <Txt variant="label" muted>
                {label}{' '}
              </Txt>
              {text}
            </Txt>
            <View accessibilityRole="radiogroup" accessibilityLabel={t('hs.quiz.statementN', { label })} style={ui.row}>
              {([true, false] as const).map((option) => (
                <Pressable
                  key={String(option)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: value === option, disabled }}
                  disabled={disabled}
                  onPress={() => onChange({ statements: setStatement(statements, count, index, option) })}
                  style={[local.tf, { minHeight: theme.touchTarget, borderColor: value === option ? theme.color.primary : theme.color.border, backgroundColor: value === option ? theme.color.primary : theme.color.surface }]}
                >
                  <Txt variant="label" color={value === option ? theme.color.onPrimary : theme.color.onBackground}>
                    {option ? t('hs.quiz.true') : t('hs.quiz.false')}
                  </Txt>
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Ô trả lời theo dạng của câu. */
export function QuestionInput(props: QuestionInputProps) {
  switch (props.question.questionType) {
    case 'IMAGE_CHOICE':
      return <ImageChoiceInput {...props} />;
    case 'MATCHING':
      return <MatchingInput {...props} />;
    case 'ORDERING':
      return <OrderingInput {...props} />;
    case 'FILL_BLANK':
      return <FillBlankInput {...props} />;
    case 'MULTI_TRUE_FALSE':
      return <MultiTrueFalseInput {...props} />;
    default:
      return <OptionsInput {...props} />;
  }
}

const local = StyleSheet.create({
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  letter: { alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  imageCard: { width: '47.5%', borderWidth: 2, overflow: 'hidden' },
  matchCard: { borderWidth: 2, overflow: 'hidden' },
  pill: { borderWidth: 2, borderRadius: 999, paddingHorizontal: 18, justifyContent: 'center' },
  rank: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  blank: { minWidth: 96, minHeight: 44, borderBottomWidth: 3, borderRadius: 6, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  blankInput: { minWidth: 120, minHeight: 44, borderWidth: 2, borderRadius: 6, paddingHorizontal: 10 },
  statement: { borderWidth: 2, padding: 12, gap: 10 },
  tf: { flex: 1, borderWidth: 2, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});

const styles2 = StyleSheet.create({
  sentence: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', rowGap: 10, columnGap: 6 },
  segment: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, flexShrink: 1, maxWidth: '100%' },
});
