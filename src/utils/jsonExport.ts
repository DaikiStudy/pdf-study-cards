import type { Deck } from '../types';
import { downloadBlob } from './download';

export function exportDeckAsJson(deck: Deck): void {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    deck,
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, `${deck.name}-backup.json`);
}

export function exportAllDecksAsJson(decks: Deck[]): void {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    decks,
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, `pdf-study-cards-backup-${Date.now()}.json`);
}

export function parseImportedJson(jsonString: string): Deck[] {
  const data = JSON.parse(jsonString);
  if (data.version === 1) {
    if (data.decks) return data.decks;
    if (data.deck) return [data.deck];
  }
  throw new Error('不正なバックアップファイルです');
}
