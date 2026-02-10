import { useState } from 'react';
import type { FlashCard as FlashCardType } from '../../types';
import { getCategoryLabel } from '../../utils/categoryLabel';
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
            {getCategoryLabel(card.category)}
          </span>
          <p className="flashcard-label">Q</p>
          <p className="flashcard-text">{card.question}</p>

          {card.questionType === 'multiple-choice' && card.choices && (
            <div className="flashcard-choices">
              {card.choices.map((choice, idx) => (
                <div key={idx} className="flashcard-choice">{choice}</div>
              ))}
            </div>
          )}

          {card.figureDescription && (
            <p className="flashcard-figure-desc">[図] {card.figureDescription}</p>
          )}

          <p className="flashcard-hint">タップして回答を表示</p>
        </div>
        <div className="flashcard-face flashcard-back">
          <p className="flashcard-label">A</p>
          <p className="flashcard-text">{card.answer}</p>

          {card.explanation && (
            <div className="flashcard-explanation">
              <p className="flashcard-explanation-label">解説</p>
              <p className="flashcard-explanation-text">{card.explanation}</p>
            </div>
          )}

          <p className="flashcard-source">p.{card.sourcePage}</p>
        </div>
      </div>
    </div>
  );
}
