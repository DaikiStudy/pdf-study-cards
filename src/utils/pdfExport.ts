import type { Deck } from '../types';
import { getCategoryLabel } from './categoryLabel';
import { downloadBlob } from './download';

let fontCache: ArrayBuffer | null = null;

async function loadFont(): Promise<ArrayBuffer> {
  if (fontCache) return fontCache;
  const res = await fetch(
    'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf'
  );
  if (!res.ok) throw new Error('フォントの読み込みに失敗しました');
  fontCache = await res.arrayBuffer();
  return fontCache;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function exportDeckAsPdf(deck: Deck): Promise<void> {
  const [{ jsPDF }, fontData] = await Promise.all([
    import('jspdf'),
    loadFont(),
  ]);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const fontBase64 = arrayBufferToBase64(fontData);
  doc.addFileToVFS('NotoSansJP.ttf', fontBase64);
  doc.addFont('NotoSansJP.ttf', 'NotoSansJP', 'normal');
  doc.setFont('NotoSansJP');

  const marginLeft = 15;
  const marginTop = 20;
  const marginBottom = 20;
  const contentWidth = 210 - marginLeft - 15;
  const pageHeight = 297;
  let y = marginTop;

  function checkNewPage(needed: number) {
    if (y + needed > pageHeight - marginBottom) {
      doc.addPage();
      y = marginTop;
    }
  }

  function wrapText(text: string, fontSize: number, maxWidth: number): string[] {
    doc.setFontSize(fontSize);
    return doc.splitTextToSize(text, maxWidth) as string[];
  }

  // Title page
  doc.setFontSize(18);
  doc.text(deck.name, marginLeft, y);
  y += 10;

  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `生成日: ${new Date().toLocaleDateString('ja-JP')}  カード数: ${deck.cards.length}問`,
    marginLeft, y
  );
  doc.setTextColor(0, 0, 0);
  y += 10;

  for (let idx = 0; idx < deck.cards.length; idx++) {
    const card = deck.cards[idx];

    // Estimate height
    const qLines = wrapText(`Q${idx + 1}. ${card.question}`, 11, contentWidth - 5);
    let estimatedH = qLines.length * 5 + 8;
    if (card.choices) estimatedH += card.choices.length * 5;
    const aLines = wrapText(`A: ${card.answer}`, 10, contentWidth - 5);
    estimatedH += aLines.length * 4.5 + 4;
    if (card.explanation) estimatedH += 15;

    checkNewPage(Math.min(estimatedH, 80));

    // Category badge
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`[${getCategoryLabel(card.category)}] p.${card.sourcePage}`, marginLeft, y);
    doc.setTextColor(0, 0, 0);
    y += 5;

    // Question
    doc.setFontSize(11);
    for (const line of qLines) {
      doc.text(line, marginLeft, y);
      y += 5;
    }
    y += 1;

    // Choices
    if (card.questionType === 'multiple-choice' && card.choices) {
      doc.setFontSize(10);
      for (const choice of card.choices) {
        checkNewPage(5);
        const cLines = wrapText(`  ${choice}`, 10, contentWidth - 10);
        for (const line of cLines) {
          doc.text(line, marginLeft + 3, y);
          y += 4.5;
        }
      }
      y += 1;
    }

    // Answer
    doc.setFontSize(10);
    for (const line of aLines) {
      checkNewPage(5);
      doc.text(line, marginLeft, y);
      y += 4.5;
    }
    y += 1;

    // Explanation
    if (card.explanation) {
      checkNewPage(10);
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      const expLines = wrapText(`解説: ${card.explanation}`, 9, contentWidth - 5);
      for (const line of expLines) {
        checkNewPage(4);
        doc.text(line, marginLeft, y);
        y += 4;
      }
      doc.setTextColor(0, 0, 0);
      y += 2;
    }

    // Figure description
    if (card.figureDescription) {
      checkNewPage(6);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`[図] ${card.figureDescription}`, marginLeft, y);
      doc.setTextColor(0, 0, 0);
      y += 5;
    }

    // Separator
    y += 3;
    checkNewPage(2);
    doc.setDrawColor(220, 220, 220);
    doc.line(marginLeft, y, marginLeft + contentWidth, y);
    y += 5;
  }

  const blob = doc.output('blob');
  downloadBlob(blob, `${deck.name}-問題集.pdf`);
}
