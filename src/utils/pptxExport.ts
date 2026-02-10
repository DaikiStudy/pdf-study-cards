import type { Deck } from '../types';
import { getCategoryLabel } from './categoryLabel';
import { downloadBlob } from './download';

export async function exportDeckAsPptx(deck: Deck): Promise<void> {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_16x9';

  // Title slide
  const titleSlide = pres.addSlide();
  titleSlide.addText(deck.name, {
    x: 0.5, y: 1.5, w: 9, h: 1.5,
    fontSize: 32, fontFace: 'Yu Gothic',
    color: '1B5E20', bold: true,
  });
  titleSlide.addText(
    `${deck.cards.length} 問  |  ${new Date().toLocaleDateString('ja-JP')}`,
    { x: 0.5, y: 3.2, w: 9, fontSize: 16, fontFace: 'Yu Gothic', color: '666666' }
  );

  for (let idx = 0; idx < deck.cards.length; idx++) {
    const card = deck.cards[idx];
    const slide = pres.addSlide();

    // Category + number
    slide.addText(`${getCategoryLabel(card.category)}  Q${idx + 1}  (p.${card.sourcePage})`, {
      x: 0.3, y: 0.2, w: 9.4, h: 0.4,
      fontSize: 10, fontFace: 'Yu Gothic', color: '888888',
    });

    // Question
    slide.addText(card.question, {
      x: 0.5, y: 0.7, w: 9, h: 1.5,
      fontSize: 18, fontFace: 'Yu Gothic', color: '212121',
      valign: 'top', wrap: true,
    });

    // Choices
    let answerY = 2.5;
    if (card.questionType === 'multiple-choice' && card.choices) {
      const choicesText = card.choices.join('\n');
      slide.addText(choicesText, {
        x: 0.8, y: 2.3, w: 8.4, h: 1.2,
        fontSize: 14, fontFace: 'Yu Gothic', color: '333333',
        valign: 'top', wrap: true,
      });
      answerY = 3.7;
    }

    // Answer
    slide.addText(`A: ${card.answer}`, {
      x: 0.5, y: answerY, w: 9, h: 0.8,
      fontSize: 16, fontFace: 'Yu Gothic', color: '2E7D32',
      bold: true, valign: 'top', wrap: true,
    });

    // Explanation
    if (card.explanation) {
      slide.addText(`解説: ${card.explanation}`, {
        x: 0.5, y: answerY + 0.9, w: 9, h: 1.2,
        fontSize: 11, fontFace: 'Yu Gothic', color: '666666',
        valign: 'top', wrap: true,
      });
    }

    // Figure description
    if (card.figureDescription) {
      slide.addText(`[図] ${card.figureDescription}`, {
        x: 0.5, y: 4.8, w: 9, h: 0.4,
        fontSize: 9, fontFace: 'Yu Gothic', color: '999999', italic: true,
      });
    }
  }

  const data = await pres.write({ outputType: 'blob' });
  downloadBlob(data as Blob, `${deck.name}-問題集.pptx`);
}
