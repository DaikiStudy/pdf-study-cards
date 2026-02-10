import type { PdfContent } from '../types';

export type SupportedFormat = 'pdf' | 'pptx' | 'goodnotes' | 'unknown';

const FORMAT_LABELS: Record<SupportedFormat, string> = {
  pdf: 'PDF',
  pptx: 'PowerPoint',
  goodnotes: 'GoodNotes',
  unknown: '不明',
};

export const ACCEPTED_EXTENSIONS = '.pdf,.pptx,.ppt,.goodnotes';
export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
];

export function detectFormat(file: File): SupportedFormat {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (ext === 'pdf' || file.type === 'application/pdf') return 'pdf';
  if (ext === 'pptx' || ext === 'ppt') return 'pptx';
  if (ext === 'goodnotes') return 'goodnotes';

  return 'unknown';
}

export function getFormatLabel(format: SupportedFormat): string {
  return FORMAT_LABELS[format];
}

export async function parseFile(file: File): Promise<PdfContent> {
  const format = detectFormat(file);

  switch (format) {
    case 'pdf': {
      const { parsePdf } = await import('./pdfParser');
      return parsePdf(file);
    }
    case 'pptx': {
      const { parsePptx } = await import('./pptxParser');
      return parsePptx(file);
    }
    case 'goodnotes': {
      const { parseGoodnotes } = await import('./goodnotesParser');
      return parseGoodnotes(file);
    }
    case 'unknown':
      throw new Error(
        `対応していないファイル形式です。\n対応形式: PDF, PPTX, GoodNotes (.goodnotes)`
      );
  }
}
