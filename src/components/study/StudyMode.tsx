import { useState, useMemo, useCallback } from 'react';
import type { Deck, Rating, FlashCard as FlashCardType } from '../../types';
import { calculateSm2, isDueForReview } from '../../utils/sm2';
import { ProgressBar } from '../common/ProgressBar';
import { FlashCard } from './FlashCard';
import { RatingButtons } from './RatingButtons';
import { AdBanner } from '../common/AdBanner';
import './StudyMode.css';

interface StudyModeProps {
  deck: Deck;
  cardsPerSession: number;
  onUpdateDeck: (deck: Deck) => void;
  onExit: () => void;
}

export function StudyMode({ deck, cardsPerSession, onUpdateDeck, onExit }: StudyModeProps) {
  const sessionCards = useMemo(() => {
    const due = deck.cards.filter(isDueForReview);
    const shuffled = [...due].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, cardsPerSession);
  }, [deck.cards, cardsPerSession]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [updatedCards, setUpdatedCards] = useState<Map<string, FlashCardType>>(new Map());

  const currentCard = sessionCards[currentIndex];
  const displayCard = currentCard ? (updatedCards.get(currentCard.id) ?? currentCard) : null;

  const handleFlip = useCallback(() => {
    setFlipped(prev => !prev);
  }, []);

  const handleRate = useCallback((rating: Rating) => {
    if (!currentCard) return;

    const cardToUpdate = updatedCards.get(currentCard.id) ?? currentCard;
    const result = calculateSm2(cardToUpdate, rating);
    const today = new Date().toISOString().split('T')[0];

    const updated: FlashCardType = {
      ...cardToUpdate,
      ...result,
      lastReviewDate: today,
    };

    const newUpdated = new Map(updatedCards);
    newUpdated.set(updated.id, updated);
    setUpdatedCards(newUpdated);

    if (rating >= 3) {
      setCorrectCount(prev => prev + 1);
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex >= sessionCards.length) {
      const newCards = deck.cards.map(c => newUpdated.get(c.id) ?? c);
      onUpdateDeck({ ...deck, cards: newCards });
      setFinished(true);
    } else {
      setCurrentIndex(nextIndex);
      setFlipped(false);
    }
  }, [currentCard, currentIndex, sessionCards.length, deck, onUpdateDeck, updatedCards]);

  if (sessionCards.length === 0) {
    return (
      <div className="study-empty">
        <p>復習するカードがありません。</p>
        <button className="study-exit-btn" onClick={onExit}>戻る</button>
      </div>
    );
  }

  if (finished) {
    const total = sessionCards.length;
    const percent = Math.round((correctCount / total) * 100);

    return (
      <div className="study-complete">
        <div className="study-complete-icon">
          {percent >= 80 ? '🎉' : percent >= 50 ? '👍' : '💪'}
        </div>
        <h2 className="study-complete-title">セッション完了！</h2>
        <div className="study-complete-stats">
          <div className="study-complete-stat">
            <span className="study-complete-num">{total}</span>
            <span className="study-complete-label">学習カード</span>
          </div>
          <div className="study-complete-stat">
            <span className="study-complete-num">{correctCount}</span>
            <span className="study-complete-label">正解</span>
          </div>
          <div className="study-complete-stat">
            <span className="study-complete-num">{percent}%</span>
            <span className="study-complete-label">正解率</span>
          </div>
        </div>
        <button className="study-exit-btn" onClick={onExit}>デッキに戻る</button>
        <AdBanner slot="studyComplete" className="ad-banner--bottom" />
      </div>
    );
  }

  return (
    <div className="study-mode">
      <div className="study-header">
        <button className="study-back-btn" onClick={onExit}>✕</button>
        <ProgressBar current={currentIndex + 1} total={sessionCards.length} />
      </div>

      {displayCard && (
        <>
          <FlashCard card={displayCard} flipped={flipped} onFlip={handleFlip} />
          {flipped && (
            <RatingButtons onRate={handleRate} />
          )}
        </>
      )}
    </div>
  );
}
