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

export async function exportAppendedPdf(
  deck: Deck,
  sourceFileData: ArrayBuffer
): Promise<void> {
  const [{ PDFDocument, rgb }, fontkit, fontData] = await Promise.all([
    import('pdf-lib'),
    import('@pdf-lib/fontkit').then(m => m.default),
    loadFont(),
  ]);

  const pdfDoc = await PDFDocument.load(sourceFileData);
  pdfDoc.registerFontkit(fontkit);

  const customFont = await pdfDoc.embedFont(fontData);

  const pageWidth = 595.28; // A4 in points
  const pageHeight = 841.89;
  const marginLeft = 42;
  const marginTop = 56;
  const marginBottom = 56;
  const contentWidth = pageWidth - marginLeft * 2;
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - marginTop;

  function checkNewPage(needed: number) {
    if (y - needed < marginBottom) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - marginTop;
    }
  }

  function drawText(text: string, x: number, size: number, color = rgb(0, 0, 0)) {
    currentPage.drawText(text, {
      x, y, size, font: customFont, color,
    });
  }

  function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
    const lines: string[] = [];
    let currentLine = '';
    for (const char of text) {
      if (char === '\n') {
        lines.push(currentLine);
        currentLine = '';
        continue;
      }
      const testLine = currentLine + char;
      const width = customFont.widthOfTextAtSize(testLine, fontSize);
      if (width > maxWidth) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // Section title
  drawText('--- 学習カード ---', marginLeft, 16, rgb(0.18, 0.49, 0.2));
  y -= 24;

  drawText(
    `${deck.cards.length}問  |  ${new Date().toLocaleDateString('ja-JP')}`,
    marginLeft, 9, rgb(0.5, 0.5, 0.5)
  );
  y -= 20;

  for (let idx = 0; idx < deck.cards.length; idx++) {
    const card = deck.cards[idx];

    checkNewPage(80);

    // Category + page
    drawText(
      `[${getCategoryLabel(card.category)}] p.${card.sourcePage}`,
      marginLeft, 7, rgb(0.5, 0.5, 0.5)
    );
    y -= 12;

    // Question
    const qLines = wrapText(`Q${idx + 1}. ${card.question}`, contentWidth, 11);
    for (const line of qLines) {
      checkNewPage(14);
      drawText(line, marginLeft, 11);
      y -= 14;
    }
    y -= 4;

    // Choices
    if (card.questionType === 'multiple-choice' && card.choices) {
      for (const choice of card.choices) {
        checkNewPage(12);
        drawText(`  ${choice}`, marginLeft + 8, 10);
        y -= 12;
      }
      y -= 2;
    }

    // Answer
    const aLines = wrapText(`A: ${card.answer}`, contentWidth, 10);
    for (const line of aLines) {
      checkNewPage(13);
      drawText(line, marginLeft, 10, rgb(0.18, 0.49, 0.2));
      y -= 13;
    }
    y -= 2;

    // Explanation
    if (card.explanation) {
      const expLines = wrapText(`解説: ${card.explanation}`, contentWidth, 8);
      for (const line of expLines) {
        checkNewPage(10);
        drawText(line, marginLeft, 8, rgb(0.35, 0.35, 0.35));
        y -= 10;
      }
      y -= 2;
    }

    y -= 8;
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  downloadBlob(blob, `${deck.name}-with-questions.pdf`);
}
