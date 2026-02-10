import type { Deck } from '../../types';
import { isDueForReview } from '../../utils/sm2';
import './DeckList.css';

interface DeckListProps {
  decks: Deck[];
  onSelectDeck: (deckId: string) => void;
  onDeleteDeck: (deckId: string) => void;
  onNavigateUpload: () => void;
}

export function DeckList({ decks, onSelectDeck, onDeleteDeck, onNavigateUpload }: DeckListProps) {
  if (decks.length === 0) {
    return (
      <div className="decklist-empty">
        <div className="decklist-empty-icon">📚</div>
        <h2 className="decklist-empty-title">デッキがありません</h2>
        <p className="decklist-empty-text">PDFを読み込んでフラッシュカードを作成しましょう</p>
        <button className="decklist-create-btn" onClick={onNavigateUpload}>
          PDFを読み込む
        </button>
      </div>
    );
  }

  return (
    <div className="decklist">
      <div className="decklist-header">
        <h2 className="decklist-title">デッキ一覧</h2>
        <button className="decklist-add-btn" onClick={onNavigateUpload}>
          + 新しいPDF
        </button>
      </div>

      <div className="decklist-items">
        {decks.map(deck => {
          const dueCount = deck.cards.filter(isDueForReview).length;
          const masteredCount = deck.cards.filter(c => c.repetitions >= 3).length;

          return (
            <div key={deck.id} className="decklist-item" onClick={() => onSelectDeck(deck.id)}>
              <div className="decklist-item-main">
                <h3 className="decklist-item-name">{deck.name}</h3>
                <div className="decklist-item-meta">
                  <span>{deck.cards.length}枚</span>
                  <span>{deck.totalPages}ページ</span>
                </div>
              </div>
              <div className="decklist-item-stats">
                {dueCount > 0 ? (
                  <span className="decklist-badge decklist-badge--due">{dueCount}枚 復習</span>
                ) : (
                  <span className="decklist-badge decklist-badge--done">完了</span>
                )}
                <span className="decklist-mastered">{masteredCount}/{deck.cards.length} 習得</span>
              </div>
              <button
                className="decklist-delete-btn"
                onClick={e => { e.stopPropagation(); onDeleteDeck(deck.id); }}
                title="削除"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
