import type { GuestRecommendation, HeritageCard } from '@dsvhvn/dung-chung/api';
import { asSuggestionTab, suggestionIntro, visibleSuggestions } from './suggestions';

function suggestion(slug: string): GuestRecommendation {
  const heritage = { id: 1, slug, name: slug } as unknown as HeritageCard;
  return { heritage, reasons: ['SAME_TYPE'], becauseOfHeritageId: null, becauseOfName: null };
}

describe('suggestions for a visitor', () => {
  it('hides the heritage being viewed and keeps at most six', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(suggestion);
    expect(visibleSuggestions(items, 'b').map((item) => item.heritage.slug)).toEqual(['a', 'c', 'd', 'e', 'f', 'g']);
    expect(visibleSuggestions(items).map((item) => item.heritage.slug)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(visibleSuggestions(undefined, 'a')).toEqual([]);
  });

  it('tells personal suggestions from the featured list shown before any history exists', () => {
    expect(suggestionIntro({ isPersonalized: true })).toBe('personal');
    expect(suggestionIntro({ isPersonalized: false })).toBe('featured');
  });

  it('opens the Near you tab only when asked for it', () => {
    expect(asSuggestionTab('gan-ban')).toBe('gan-ban');
    expect(asSuggestionTab('goi-y')).toBe('goi-y');
    expect(asSuggestionTab(undefined)).toBe('goi-y');
    expect(asSuggestionTab('khac')).toBe('goi-y');
  });
});
