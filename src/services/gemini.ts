import type { PdfContent, PdfPage, GeminiCardResponse, HandoutMode } from '../types';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

const JSON_SCHEMA_INSTRUCTIONS = `以下のJSON配列形式で返してください（他の文章は不要、JSONのみ）:
[
  {
    "question": "問題文",
    "answer": "回答",
    "explanation": "解説（必須・根拠や背景知識を含める）",
    "category": "red-text" | "important" | "general" | "exam-question",
    "questionType": "free-form" | "multiple-choice",
    "choices": ["a) 選択肢1", "b) 選択肢2", "c) 選択肢3", "d) 選択肢4"],
    "correctChoiceIndex": 0,
    "sourcePage": ページ番号,
    "figureDescription": "図の説明（図に関する問題の場合のみ）",
    "examInfo": "試験情報（exam-questionの場合のみ、例: 2023年国家試験問42）"
  }
]`;

const COMMON_INSTRUCTIONS = `## 指示
1. 赤字テキストは最も重要として優先的に問題化（category: "red-text"）
2. AIの判断で重要な概念・定義・キーワードも問題化（category: "important"）
3. 内容を網羅する一般問題も作成（category: "general"）
4. **既存の試験問題の検出**: スライド内に「国家試験」「○○年」「問○○」などの既存の試験・過去問が含まれている場合は、category: "exam-question"として分離し、examInfoにその試験情報を記述してください。AI生成の問題とは重複させないでください。
5. **問題形式の混合**:
   - 自由記述（questionType: "free-form"）: 定義・穴埋め・○×・短答・比較など
   - 選択肢（questionType: "multiple-choice"）: choices配列とcorrectChoiceIndexを含める
   - 全体の30-50%程度を選択肢形式にしてください
6. **解説（explanation）は全ての問題に必須です。** 根拠や背景知識を簡潔に含めてください。
7. **図・グラフ・表がある場合**: 図の内容を問う問題を作成し、figureDescriptionに図の日本語説明を記述してください。
8. 全ページの内容を漏れなく網羅してください。取りこぼしがないようにしてください。
9. 回答は簡潔かつ正確に。`;

function buildTextPrompt(content: PdfContent): string {
  const redTexts = content.redTextItems.map(r => `- [p.${r.page}] ${r.text}`).join('\n');

  const pageTexts = content.pages
    .filter(p => p.fullText.length > 0)
    .map(p => `--- ページ ${p.pageNum} ---\n${p.fullText}`)
    .join('\n\n');

  return `あなたは学習支援AIです。以下はスライドから抽出したテキストです。このコンテンツからQ&A形式のフラッシュカードを作成してください。

## 赤字テキスト（特に重要）
${redTexts || '（赤字テキストは検出されませんでした）'}

## スライド本文
${pageTexts}

${COMMON_INSTRUCTIONS}

${JSON_SCHEMA_INSTRUCTIONS}`;
}

function buildMultimodalParts(
  content: PdfContent,
  handoutMode: HandoutMode,
  pageImages: Map<number, string>
): GeminiPart[] {
  const handoutNote =
    handoutMode === '4-per-page'
      ? 'このPDFは1ページに4枚のスライドが配置された配布資料形式です。各スライドを個別に認識してください。'
      : handoutMode === '6-per-page'
        ? 'このPDFは1ページに6枚のスライドが配置された配布資料形式です。各スライドを個別に認識してください。'
        : '通常の1スライド1ページ形式です。';

  const parts: GeminiPart[] = [];

  parts.push({
    text: `あなたは学習支援AIです。以下はスライドのページ画像とテキストです。
このコンテンツからQ&A形式のフラッシュカードを作成してください。

## ページレイアウト
${handoutNote}

${COMMON_INSTRUCTIONS}

${JSON_SCHEMA_INSTRUCTIONS}`,
  });

  const redTexts = content.redTextItems.map(r => `- [p.${r.page}] ${r.text}`).join('\n');
  if (redTexts) {
    parts.push({ text: `## 赤字テキスト（特に重要）\n${redTexts}` });
  }

  for (const page of content.pages) {
    if (page.fullText.length === 0 && !pageImages.has(page.pageNum)) continue;

    const img = pageImages.get(page.pageNum);
    if (img) {
      parts.push({ inlineData: { mimeType: 'image/png', data: img } });
    }
    if (page.fullText.length > 0) {
      parts.push({ text: `--- ページ ${page.pageNum} テキスト ---\n${page.fullText}` });
    }
  }

  return parts;
}

async function callGeminiApi(
  parts: GeminiPart[],
  apiKey: string
): Promise<GeminiCardResponse[]> {
  const response = await fetch(`${API_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = (error as { error?: { message?: string } })?.error?.message || response.statusText;
    throw new Error(`Gemini API エラー: ${message}`);
  }

  const data = await response.json() as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini APIから有効な応答がありませんでした');
  }

  const jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  let raw: unknown[];
  try {
    raw = JSON.parse(jsonStr);
  } catch {
    throw new Error('AIの応答をパースできませんでした。もう一度お試しください。');
  }

  if (!Array.isArray(raw)) {
    throw new Error('AIの応答が不正な形式です。もう一度お試しください。');
  }

  return raw
    .filter((c: unknown): c is Record<string, unknown> =>
      typeof c === 'object' && c !== null && 'question' in c && 'answer' in c
    )
    .map(c => ({
      question: String(c.question ?? ''),
      answer: String(c.answer ?? ''),
      explanation: String(c.explanation ?? ''),
      category: (['red-text', 'important', 'general', 'exam-question'].includes(String(c.category))
        ? String(c.category) as GeminiCardResponse['category']
        : 'general'),
      questionType: c.questionType === 'multiple-choice' ? 'multiple-choice' as const : 'free-form' as const,
      choices: Array.isArray(c.choices) ? c.choices.map(String) : undefined,
      correctChoiceIndex: typeof c.correctChoiceIndex === 'number' ? c.correctChoiceIndex : undefined,
      sourcePage: Number(c.sourcePage) || 1,
      figureDescription: c.figureDescription ? String(c.figureDescription) : undefined,
      examInfo: c.examInfo ? String(c.examInfo) : undefined,
    }))
    .filter(c => c.question && c.answer);
}

/** ページ配列をN個のチャンクに分割 */
function splitPages(pages: PdfPage[], chunks: number): PdfPage[][] {
  const nonEmpty = pages.filter(p => p.fullText.length > 0);
  if (nonEmpty.length === 0) return [pages.length > 0 ? [pages[0]] : []];
  const actualChunks = Math.min(chunks, nonEmpty.length);
  const size = Math.ceil(nonEmpty.length / actualChunks);
  const result: PdfPage[][] = [];
  for (let i = 0; i < nonEmpty.length; i += size) {
    result.push(nonEmpty.slice(i, i + size));
  }
  return result;
}

/** 自動分割数を算出（5ページごとに1チャンク、最小1・最大10） */
export function suggestChunkCount(totalPages: number): number {
  if (totalPages <= 5) return 1;
  return Math.min(10, Math.ceil(totalPages / 5));
}

export interface ChunkedGenerateOptions {
  useVision: boolean;
  handoutMode: HandoutMode;
  sourceFileData?: ArrayBuffer;
}

/** チャンク分割でカードを生成（Vision対応・進捗コールバック付き） */
export async function generateFlashCardsChunked(
  content: PdfContent,
  apiKey: string,
  chunkCount: number,
  options: ChunkedGenerateOptions,
  onProgress?: (completed: number, total: number) => void,
): Promise<GeminiCardResponse[]> {
  const chunks = splitPages(content.pages, chunkCount);
  const allCards: GeminiCardResponse[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkContent: PdfContent = {
      pages: chunks[i],
      totalPages: chunks[i].length,
      redTextItems: content.redTextItems.filter(r =>
        chunks[i].some(p => p.pageNum === r.page)
      ),
    };

    let parts: GeminiPart[];

    if (options.useVision && options.sourceFileData) {
      const { renderPagesToBase64 } = await import('./pageRenderer');
      const pageNums = chunks[i].map(p => p.pageNum);
      const images = await renderPagesToBase64(options.sourceFileData, pageNums, 1.5);
      parts = buildMultimodalParts(chunkContent, options.handoutMode, images);
    } else {
      parts = [{ text: buildTextPrompt(chunkContent) }];
    }

    const cards = await callGeminiApi(parts, apiKey);
    allCards.push(...cards);
    onProgress?.(i + 1, chunks.length);
  }

  return allCards;
}

export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'こんにちは。テストです。「OK」とだけ返してください。' }] }],
        generationConfig: { maxOutputTokens: 10 },
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
