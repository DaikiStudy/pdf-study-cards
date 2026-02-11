import type { PdfContent, PdfPage, PdfTextItem } from '../types';

interface PdfjsTextItem {
  str: string;
  transform: number[];
}

interface PdfjsTextStyle {
  fontFamily: string;
  ascent: number;
  descent: number;
  vertical: boolean;
}

function isRedColor(r: number, g: number, b: number): boolean {
  return r > 180 && g < 100 && b < 100;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('')}`;
}

interface PageResult {
  page: PdfPage;
  redTexts: { text: string; page: number }[];
}

async function processPage(
  pdf: { getPage: (n: number) => Promise<unknown> },
  pageNum: number,
): Promise<PageResult> {
  const page = await pdf.getPage(pageNum) as {
    getTextContent: () => Promise<{
      items: unknown[];
      styles: Record<string, PdfjsTextStyle | undefined>;
    }>;
    getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[][] }>;
  };

  const textContent = await page.getTextContent();
  const operatorList = await page.getOperatorList();

  const colorMap = new Map<number, { r: number; g: number; b: number }>();
  let currentColor = { r: 0, g: 0, b: 0 };

  for (let j = 0; j < operatorList.fnArray.length; j++) {
    const fn = operatorList.fnArray[j];
    const args = operatorList.argsArray[j];

    // OPS.setFillRGBColor = 21
    if (fn === 21 && args.length >= 3) {
      currentColor = {
        r: args[0] as number,
        g: args[1] as number,
        b: args[2] as number,
      };
    }
    // OPS.showText = 39, OPS.showSpacedText = 40
    if (fn === 39 || fn === 40) {
      colorMap.set(j, { ...currentColor });
    }
  }

  const textItems: PdfTextItem[] = [];
  const redTexts: { text: string; page: number }[] = [];
  let textOpIdx = 0;

  for (const item of textContent.items) {
    const textItem = item as PdfjsTextItem;
    if (!textItem.str || textItem.str.trim() === '') continue;

    const style = textContent.styles[
      (item as unknown as { fontName: string }).fontName
    ] as PdfjsTextStyle | undefined;

    const fontSize = Math.abs(textItem.transform[0]);
    const isBold = style?.fontFamily?.toLowerCase().includes('bold') ?? false;

    const color = colorMap.get(textOpIdx) ?? { r: 0, g: 0, b: 0 };
    const colorHex = rgbToHex(color.r, color.g, color.b);
    const isRed = isRedColor(color.r * 255, color.g * 255, color.b * 255);

    if (isRed) {
      redTexts.push({ text: textItem.str.trim(), page: pageNum });
    }

    textItems.push({
      text: textItem.str,
      color: colorHex,
      fontSize,
      isBold,
    });

    textOpIdx++;
  }

  const fullText = textItems.map(t => t.text).join(' ').replace(/\s+/g, ' ').trim();

  return {
    page: { pageNum, textItems, fullText },
    redTexts,
  };
}

const BATCH_SIZE = 5;

export async function parsePdf(
  file: File,
  onProgress?: (current: number, total: number) => void,
): Promise<PdfContent> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: PdfPage[] = [];
  const redTextItems: { text: string; page: number }[] = [];

  for (let start = 1; start <= pdf.numPages; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE - 1, pdf.numPages);
    const batch = Array.from({ length: end - start + 1 }, (_, j) => start + j);

    const results = await Promise.all(batch.map(pageNum => processPage(pdf, pageNum)));

    for (const result of results) {
      pages.push(result.page);
      redTextItems.push(...result.redTexts);
    }

    onProgress?.(end, pdf.numPages);
  }

  return {
    pages,
    totalPages: pdf.numPages,
    redTextItems,
  };
}
