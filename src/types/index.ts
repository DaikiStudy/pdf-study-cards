export type ViewId = 'home' | 'upload' | 'deck' | 'study' | 'settings';

export type CardCategory = 'red-text' | 'important' | 'general';

export interface FlashCard {
  id: string;
  question: string;
  answer: string;
  category: CardCategory;
  sourcePage: number;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
  lastReviewDate: string | null;
}

export interface Deck {
  id: string;
  name: string;
  createdAt: string;
  cards: FlashCard[];
  totalPages: number;
}

export type Rating = 0 | 1 | 3 | 5;

export interface StudySession {
  deckId: string;
  cardsStudied: number;
  cardsCorrect: number;
  startTime: string;
}

export interface AppSettings {
  geminiApiKey: string;
  cardsPerSession: number;
  showAnswerFirst: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '',
  cardsPerSession: 20,
  showAnswerFirst: false,
};

export interface PdfTextItem {
  text: string;
  color: string;
  fontSize: number;
  isBold: boolean;
}

export interface PdfPage {
  pageNum: number;
  textItems: PdfTextItem[];
  fullText: string;
}

export interface PdfContent {
  pages: PdfPage[];
  totalPages: number;
  redTextItems: { text: string; page: number }[];
}

export interface GeminiCardResponse {
  question: string;
  answer: string;
  category: CardCategory;
  sourcePage: number;
}
