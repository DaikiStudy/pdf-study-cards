import type { FlashCard, Rating } from '../types';

export interface Sm2Result {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
}

export function calculateSm2(card: FlashCard, rating: Rating): Sm2Result {
  let { easeFactor, interval, repetitions } = card;

  if (rating < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  }

  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
  );

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);
  const nextReviewDate = nextDate.toISOString().split('T')[0];

  return { easeFactor, interval, repetitions, nextReviewDate };
}

export function isDueForReview(card: FlashCard): boolean {
  const today = new Date().toISOString().split('T')[0];
  return card.nextReviewDate <= today;
}

export function createNewCard(
  id: string,
  question: string,
  answer: string,
  category: FlashCard['category'],
  sourcePage: number
): FlashCard {
  const today = new Date().toISOString().split('T')[0];
  return {
    id,
    question,
    answer,
    category,
    sourcePage,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: today,
    lastReviewDate: null,
  };
}
