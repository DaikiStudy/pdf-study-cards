import type { PdfContent, GeminiCardResponse } from '../types';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

function buildPrompt(content: PdfContent): string {
  const redTexts = content.redTextItems.map(r => `- [p.${r.page}] ${r.text}`).join('\n');

  const pageTexts = content.pages
    .filter(p => p.fullText.length > 0)
    .map(p => `--- ページ ${p.pageNum} ---\n${p.fullText}`)
    .join('\n\n');

  return `あなたは学習支援AIです。以下はPDFスライドから抽出したテキストです。このコンテンツからQ&A形式の暗記カードを作成してください。

## 赤字テキスト（特に重要）
${redTexts || '（赤字テキストは検出されませんでした）'}

## スライド本文
${pageTexts}

## 指示
1. 赤字部分は最も重要な内容として優先的に問題化してください（category: "red-text"）
2. 赤字以外でもAIの判断で重要と思われる概念・定義・キーワードも問題にしてください（category: "important"）
3. スライドの内容を網羅的にカバーする一般的な問題も作成してください（category: "general"）
4. 問題形式は多様にしてください：定義問題、穴埋め問題、○×問題、短答問題、比較問題など
5. 回答は簡潔かつ正確に
6. 各問題にはソースページ番号を含めてください

以下のJSON配列形式で返してください（他の文章は不要、JSONのみ）:
[
  {
    "question": "問題文",
    "answer": "回答",
    "category": "red-text" | "important" | "general",
    "sourcePage": ページ番号
  }
]`;
}

export async function generateFlashCards(
  content: PdfContent,
  apiKey: string
): Promise<GeminiCardResponse[]> {
  const prompt = buildPrompt(content);

  const response = await fetch(`${API_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
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

  let cards: GeminiCardResponse[];
  try {
    cards = JSON.parse(jsonStr);
  } catch {
    throw new Error('AIの応答をパースできませんでした。もう一度お試しください。');
  }

  if (!Array.isArray(cards)) {
    throw new Error('AIの応答が不正な形式です。もう一度お試しください。');
  }

  return cards.filter(
    c => c.question && c.answer && c.category && c.sourcePage
  );
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
