import type { Rating } from '../../types';
import './RatingButtons.css';

interface RatingButtonsProps {
  onRate: (rating: Rating) => void;
  disabled?: boolean;
}

const RATINGS: { rating: Rating; label: string; className: string }[] = [
  { rating: 0, label: 'もう一度', className: 'rating-btn--again' },
  { rating: 1, label: '難しい', className: 'rating-btn--hard' },
  { rating: 3, label: '良い', className: 'rating-btn--good' },
  { rating: 5, label: '簡単', className: 'rating-btn--easy' },
];

export function RatingButtons({ onRate, disabled }: RatingButtonsProps) {
  return (
    <div className="rating-buttons">
      {RATINGS.map(r => (
        <button
          key={r.rating}
          className={`rating-btn ${r.className}`}
          onClick={() => onRate(r.rating)}
          disabled={disabled}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
