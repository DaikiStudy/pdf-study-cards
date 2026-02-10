import { useState } from 'react';
import type { FlashCard as FlashCardType } from '../../types';
import './FlashCard.css';

interface FlashCardProps {
  card: FlashCardType;
  flipped: boolean;
  onFlip: () => void;
}

export function FlashCard({ card, flipped, onFlip }: FlashCardProps) {
  const [animating, setAnimating] = useState(false);

  const handleClick = () => {
    if (animating) return;
    setAnimating(true);
    onFlip();
    setTimeout(() => setAnimating(false), 400);
  };

  return (
    <div className="flashcard-container" onClick={handleClick}>
      <div className={`flashcard ${flipped ? 'flashcard--flipped' : ''}`}>
        <div className="flashcard-face flashcard-front">
          <span className={`flashcard-tag flashcard-tag--${card.category}`}>
            {card.category === 'red-text' ? '赤字' : card.category === 'important' ? '重要' : '一般'}
          </span>
          <p className="flashcard-label">Q</p>
          <p className="flashcard-text">{card.question}</p>
          <p className="flashcard-hint">タップして回答を表示</p>
        </div>
        <div className="flashcard-face flashcard-back">
          <p className="flashcard-label">A</p>
          <p className="flashcard-text">{card.answer}</p>
          <p className="flashcard-source">p.{card.sourcePage}</p>
        </div>
      </div>
    </div>
  );
}
