import { useState, useCallback } from 'react';
import type { Deck, AppSettings, PdfContent, GeminiCardResponse } from '../../types';
import { PdfDropZone } from '../common/PdfDropZone';
import { parseFile, detectFormat, getFormatLabel } from '../../services/fileParser';
import { generateFlashCardsChunked, suggestChunkCount } from '../../services/gemini';
import { createNewCard } from '../../utils/sm2';
import { AdBanner } from '../common/AdBanner';
import './UploadPage.css';

interface UploadPageProps {
  settings: AppSettings;
  onDeckCreated: (deck: Deck) => void;
  onNavigateSettings: () => void;
}

type Phase = 'select' | 'parsing' | 'generating' | 'preview' | 'error';

export function UploadPage({ settings, onDeckCreated, onNavigateSettings }: UploadPageProps) {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('select');
  const [error, setError] = useState('');
  const [generatedCards, setGeneratedCards] = useState<GeminiCardResponse[]>([]);
  const [pdfContent, setPdfContent] = useState<PdfContent | null>(null);
  const [chunkCount, setChunkCount] = useState(1);
  const [chunkProgress, setChunkProgress] = useState({ completed: 0, total: 0 });

  const handleFileSelect = useCallback((f: File) => {
    setFile(f);
    setPhase('select');
    setError('');
    setGeneratedCards([]);
    setChunkCount(1);
  }, []);

  const handleClear = useCallback(() => {
    setFile(null);
    setPhase('select');
    setError('');
    setGeneratedCards([]);
    setPdfContent(null);
    setChunkCount(1);
    setChunkProgress({ completed: 0, total: 0 });
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!file) return;

    if (!settings.geminiApiKey) {
      setError('Gemini APIキーが設定されていません。設定画面でAPIキーを入力してください。');
      setPhase('error');
      return;
    }

    try {
      setPhase('parsing');
      setError('');
      const content = await parseFile(file);
      setPdfContent(content);

      if (content.pages.every(p => p.fullText.length === 0)) {
        const fmt = getFormatLabel(detectFormat(file));
        setError(`${fmt}ファイルからテキストを抽出できませんでした。画像ベースのファイルは対応していません。`);
        setPhase('error');
        return;
      }

      // 初回パース時に推奨分割数をセット
      const suggested = suggestChunkCount(content.totalPages);
      if (chunkCount === 1 && suggested > 1) {
        setChunkCount(suggested);
      }

      setPhase('generating');
      setChunkProgress({ completed: 0, total: chunkCount });

      const cards = await generateFlashCardsChunked(
        content,
        settings.geminiApiKey,
        chunkCount,
        (completed, total) => setChunkProgress({ completed, total }),
      );

      if (cards.length === 0) {
        setError('カードを生成できませんでした。別のファイルをお試しください。');
        setPhase('error');
        return;
      }

      setGeneratedCards(cards);
      setPhase('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setPhase('error');
    }
  }, [file, settings.geminiApiKey, chunkCount]);

  const handleSaveDeck = useCallback(() => {
    if (!file || generatedCards.length === 0) return;

    const deck: Deck = {
      id: crypto.randomUUID(),
      name: file.name.replace(/\.(pdf|pptx|ppt|goodnotes)$/i, ''),
      createdAt: new Date().toISOString(),
      totalPages: pdfContent?.totalPages ?? 0,
      cards: generatedCards.map(c =>
        createNewCard(crypto.randomUUID(), c.question, c.answer, c.category, c.sourcePage)
      ),
    };

    onDeckCreated(deck);
  }, [file, generatedCards, pdfContent, onDeckCreated]);

  const redCount = generatedCards.filter(c => c.category === 'red-text').length;
  const importantCount = generatedCards.filter(c => c.category === 'important').length;
  const generalCount = generatedCards.filter(c => c.category === 'general').length;

  return (
    <div className="upload-page">
      <h2 className="upload-title">ファイルからカード生成</h2>

      <PdfDropZone
        onFileSelect={handleFileSelect}
        currentFile={file}
        onClear={handleClear}
      />

      {!settings.geminiApiKey && (
        <div className="upload-warning">
          <p>Gemini APIキーが未設定です。</p>
          <button className="upload-link-btn" onClick={onNavigateSettings}>
            設定画面でAPIキーを入力
          </button>
        </div>
      )}

      {file && phase === 'select' && settings.geminiApiKey && (
        <div className="upload-generate-section">
          <div className="upload-chunk-setting">
            <label className="upload-chunk-label" htmlFor="chunk-count">
              分割数
            </label>
            <div className="upload-chunk-control">
              <button
                className="upload-chunk-btn"
                onClick={() => setChunkCount(c => Math.max(1, c - 1))}
                disabled={chunkCount <= 1}
              >-</button>
              <span className="upload-chunk-value">{chunkCount}</span>
              <button
                className="upload-chunk-btn"
                onClick={() => setChunkCount(c => Math.min(10, c + 1))}
                disabled={chunkCount >= 10}
              >+</button>
            </div>
            <p className="upload-chunk-hint">
              {chunkCount === 1
                ? '全ページを一括で生成'
                : `${chunkCount}セクションに分けて網羅的に生成`}
            </p>
          </div>
          <button className="upload-generate-btn" onClick={handleGenerate}>
            カードを生成する
          </button>
        </div>
      )}

      {phase === 'parsing' && (
        <div className="upload-loading">
          <div className="upload-spinner" />
          <p>ファイルを解析中...</p>
        </div>
      )}

      {phase === 'generating' && (
        <div className="upload-loading">
          <div className="upload-spinner" />
          <p>AIがカードを生成中...</p>
          {chunkProgress.total > 1 && (
            <>
              <div className="upload-chunk-progress">
                <div
                  className="upload-chunk-progress-bar"
                  style={{ width: `${(chunkProgress.completed / chunkProgress.total) * 100}%` }}
                />
              </div>
              <p className="upload-loading-sub">
                セクション {chunkProgress.completed}/{chunkProgress.total} 完了
              </p>
            </>
          )}
          {chunkProgress.total <= 1 && (
            <p className="upload-loading-sub">しばらくお待ちください</p>
          )}
        </div>
      )}

      {phase === 'error' && (
        <div className="upload-error">
          <p>{error}</p>
          {!settings.geminiApiKey && (
            <button className="upload-link-btn" onClick={onNavigateSettings}>
              設定画面へ
            </button>
          )}
          {settings.geminiApiKey && file && (
            <button className="upload-retry-btn" onClick={handleGenerate}>
              再試行
            </button>
          )}
        </div>
      )}

      {phase === 'preview' && (
        <div className="upload-preview">
          <h3 className="upload-preview-title">生成結果</h3>
          <div className="upload-stats">
            <div className="upload-stat">
              <span className="upload-stat-num">{generatedCards.length}</span>
              <span className="upload-stat-label">カード合計</span>
            </div>
            {redCount > 0 && (
              <div className="upload-stat upload-stat--red">
                <span className="upload-stat-num">{redCount}</span>
                <span className="upload-stat-label">赤字</span>
              </div>
            )}
            <div className="upload-stat upload-stat--important">
              <span className="upload-stat-num">{importantCount}</span>
              <span className="upload-stat-label">重要</span>
            </div>
            <div className="upload-stat upload-stat--general">
              <span className="upload-stat-num">{generalCount}</span>
              <span className="upload-stat-label">一般</span>
            </div>
          </div>

          <div className="upload-card-list">
            {generatedCards.slice(0, 5).map((c, i) => (
              <div key={i} className="upload-card-preview">
                <span className={`upload-card-tag upload-card-tag--${c.category}`}>
                  {c.category === 'red-text' ? '赤字' : c.category === 'important' ? '重要' : '一般'}
                </span>
                <p className="upload-card-q">Q: {c.question}</p>
                <p className="upload-card-a">A: {c.answer}</p>
              </div>
            ))}
            {generatedCards.length > 5 && (
              <p className="upload-more">...他 {generatedCards.length - 5} 枚</p>
            )}
          </div>

          <button className="upload-save-btn" onClick={handleSaveDeck}>
            デッキを保存して学習開始
          </button>
        </div>
      )}

      <AdBanner slot="uploadBottom" className="ad-banner--bottom" />
    </div>
  );
}
