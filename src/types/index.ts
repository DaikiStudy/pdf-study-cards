export type ViewId = 'home' | 'upload' | 'deck' | 'study' | 'settings';

export type CardCategory = 'red-text' | 'important' | 'general' | 'exam-question';

export type QuestionType = 'free-form' | 'multiple-choice';

export type HandoutMode = 'normal' | '4-per-page' | '6-per-page';

export type ExportFormat = 'pdf' | 'pptx' | 'pdf-append' | 'json';

export interface FlashCard {
  id: string;
  question: string;
  answer: string;
  explanation: string;
  category: CardCategory;
  questionType: QuestionType;
  choices?: string[];
  correctChoiceIndex?: number;
  sourcePage: number;
  figureDescription?: string;
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
  sourceFileId?: string;
  sourceFileName?: string;
  sourceFileFormat?: 'pdf' | 'pptx' | 'goodnotes';
  handoutMode?: HandoutMode;
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
  useVisionMode: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '',
  cardsPerSession: 20,
  showAnswerFirst: false,
  useVisionMode: true,
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
  explanation: string;
  category: CardCategory;
  questionType: QuestionType;
  choices?: string[];
  correctChoiceIndex?: number;
  sourcePage: number;
  figureDescription?: string;
  examInfo?: string;
}

export interface StoredSourceFile {
  id: string;
  fileName: string;
  format: 'pdf' | 'pptx' | 'goodnotes';
  data: ArrayBuffer;
  storedAt: string;
}
