import type { PdfContent, PdfPage, PdfTextItem } from '../types';

export async function parsePptx(file: File): Promise<PdfContent> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());

  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] ?? '0');
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] ?? '0');
      return numA - numB;
    });

  if (slideFiles.length === 0) {
    throw new Error('PPTXファイルからスライドが見つかりませんでした。');
  }

  const pages: PdfPage[] = [];
  const redTextItems: { text: string; page: number }[] = [];

  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.files[slideFiles[i]].async('string');
    const textItems: PdfTextItem[] = [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');

    const runs = doc.getElementsByTagName('a:r');
    for (let j = 0; j < runs.length; j++) {
      const run = runs[j];

      const textEl = run.getElementsByTagName('a:t')[0];
      const text = textEl?.textContent?.trim();
      if (!text) continue;

      const rPr = run.getElementsByTagName('a:rPr')[0];
      let color = '#000000';
      let isBold = false;
      let fontSize = 12;

      if (rPr) {
        isBold = rPr.getAttribute('b') === '1';
        const szAttr = rPr.getAttribute('sz');
        if (szAttr) fontSize = parseInt(szAttr) / 100;

        const solidFill = rPr.getElementsByTagName('a:solidFill')[0];
        if (solidFill) {
          const srgbClr = solidFill.getElementsByTagName('a:srgbClr')[0];
          if (srgbClr) {
            color = '#' + (srgbClr.getAttribute('val') ?? '000000');
          }
        }
      }

      const isRed = isRedHex(color);
      if (isRed) {
        redTextItems.push({ text, page: i + 1 });
      }

      textItems.push({ text, color, fontSize, isBold });
    }

    const fullText = textItems.map(t => t.text).join(' ').replace(/\s+/g, ' ').trim();
    pages.push({ pageNum: i + 1, textItems, fullText });
  }

  return {
    pages,
    totalPages: slideFiles.length,
    redTextItems,
  };
}

function isRedHex(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return r > 180 && g < 100 && b < 100;
}
