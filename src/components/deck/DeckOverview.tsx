import type { Deck } from '../../types';
import { isDueForReview } from '../../utils/sm2';
import { AdBanner } from '../common/AdBanner';
import './DeckOverview.css';

interface DeckOverviewProps {
  deck: Deck;
  onStartStudy: () => void;
  onBack: () => void;
}

export function DeckOverview({ deck, onStartStudy, onBack }: DeckOverviewProps) {
  const dueCards = deck.cards.filter(isDueForReview);
  const masteredCards = deck.cards.filter(c => c.repetitions >= 3);
  const learningCards = deck.cards.filter(c => c.repetitions > 0 && c.repetitions < 3);
  const newCards = deck.cards.filter(c => c.repetitions === 0);

  return (
    <div className="deck-overview">
      <button className="deck-overview-back" onClick={onBack}>
        ← デッキ一覧
      </button>

      <h2 className="deck-overview-title">{deck.name}</h2>

      <div className="deck-overview-stats">
        <div className="deck-stat deck-stat--total">
          <span className="deck-stat-num">{deck.cards.length}</span>
          <span className="deck-stat-label">全カード</span>
        </div>
        <div className="deck-stat deck-stat--due">
          <span className="deck-stat-num">{dueCards.length}</span>
          <span className="deck-stat-label">復習待ち</span>
        </div>
        <div className="deck-stat deck-stat--mastered">
          <span className="deck-stat-num">{masteredCards.length}</span>
          <span className="deck-stat-label">習得済み</span>
        </div>
        <div className="deck-stat deck-stat--learning">
          <span className="deck-stat-num">{learningCards.length}</span>
          <span className="deck-stat-label">学習中</span>
        </div>
        <div className="deck-stat deck-stat--new">
          <span className="deck-stat-num">{newCards.length}</span>
          <span className="deck-stat-label">未学習</span>
        </div>
      </div>

      <button
        className="deck-overview-study-btn"
        onClick={onStartStudy}
        disabled={dueCards.length === 0}
      >
        {dueCards.length > 0
          ? `学習開始（${dueCards.length}枚）`
          : '復習待ちカードはありません'}
      </button>

      <div className="deck-overview-cards">
        <h3 className="deck-overview-cards-title">カード一覧</h3>
        {deck.cards.map(card => (
          <div key={card.id} className="deck-card-item">
            <span className={`deck-card-tag deck-card-tag--${card.category}`}>
              {card.category === 'red-text' ? '赤字' : card.category === 'important' ? '重要' : '一般'}
            </span>
            <div className="deck-card-content">
              <p className="deck-card-q">{card.question}</p>
              <p className="deck-card-a">{card.answer}</p>
            </div>
            <span className="deck-card-page">p.{card.sourcePage}</span>
          </div>
        ))}
      </div>

      <AdBanner slot="deckBottom" className="ad-banner--bottom" />
    </div>
  );
}
