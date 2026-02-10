import type { CardCategory } from '../types';

export function getCategoryLabel(category: CardCategory): string {
  switch (category) {
    case 'red-text': return '赤字';
    case 'important': return '重要';
    case 'general': return '一般';
    case 'exam-question': return '試験問題';
  }
}
