import type { PdfContent } from '../types';
import { parsePdf } from './pdfParser';

export async function parseGoodnotes(file: File): Promise<PdfContent> {
  const JSZip = (await import('jszip')).default;

  let zip;
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    throw new Error(
      'GoodNotesファイルを開けませんでした。\n' +
      'GoodNotesアプリから「PDF形式で書き出し」してから読み込んでください。'
    );
  }

  // GoodNotesファイル内に埋め込まれたPDFを探す
  const pdfFiles = Object.keys(zip.files).filter(
    name => name.toLowerCase().endsWith('.pdf')
  );

  if (pdfFiles.length > 0) {
    // 最大サイズのPDFを選択（メインコンテンツの可能性が高い）
    let bestPdf = pdfFiles[0];
    let bestSize = 0;

    for (const name of pdfFiles) {
      const data = await zip.files[name].async('arraybuffer');
      if (data.byteLength > bestSize) {
        bestSize = data.byteLength;
        bestPdf = name;
      }
    }

    const pdfData = await zip.files[bestPdf].async('arraybuffer');
    const pdfFile = new File([pdfData], 'extracted.pdf', { type: 'application/pdf' });
    return parsePdf(pdfFile);
  }

  // PDFが見つからない場合、テキストデータを探す
  const textFiles = Object.keys(zip.files).filter(
    name => name.toLowerCase().endsWith('.txt') || name.toLowerCase().endsWith('.json')
  );

  if (textFiles.length > 0) {
    let allText = '';
    for (const name of textFiles) {
      const content = await zip.files[name].async('string');
      allText += content + '\n';
    }

    if (allText.trim().length > 0) {
      return {
        pages: [{
          pageNum: 1,
          textItems: [{ text: allText.trim(), color: '#000000', fontSize: 12, isBold: false }],
          fullText: allText.trim(),
        }],
        totalPages: 1,
        redTextItems: [],
      };
    }
  }

  throw new Error(
    'GoodNotesファイルからテキストを抽出できませんでした。\n' +
    'GoodNotesアプリで「共有」→「PDF形式で書き出し」してから読み込んでください。'
  );
}
