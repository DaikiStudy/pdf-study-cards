import { useState, useCallback } from 'react';
import type { Deck, AppSettings, PdfContent, GeminiCardResponse, HandoutMode } from '../../types';
import { PdfDropZone } from '../common/PdfDropZone';
import { parseFile, detectFormat, getFormatLabel } from '../../services/fileParser';
import { generateFlashCardsChunked, suggestChunkCount } from '../../services/gemini';
import { createNewCard } from '../../utils/sm2';
import { getCategoryLabel } from '../../utils/categoryLabel';
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
  const [handoutMode, setHandoutMode] = useState<HandoutMode>('normal');
  const [saveSource, setSaveSource] = useState(true);
  const [sourceFileData, setSourceFileData] = useState<ArrayBuffer | null>(null);

  const handleFileSelect = useCallback(async (f: File) => {
    setFile(f);
    setPhase('select');
    setError('');
    setGeneratedCards([]);
    setChunkCount(1);
    setHandoutMode('normal');
    const buf = await f.arrayBuffer();
    setSourceFileData(buf);
  }, []);

  const handleClear = useCallback(() => {
    setFile(null);
    setPhase('select');
    setError('');
    setGeneratedCards([]);
    setPdfContent(null);
    setChunkCount(1);
    setChunkProgress({ completed: 0, total: 0 });
    setHandoutMode('normal');
    setSourceFileData(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!file) return;

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
        settings.geminiApiKey || '',
        chunkCount,
        {
          useVision: settings.useVisionMode && detectFormat(file) === 'pdf',
          handoutMode,
          sourceFileData: sourceFileData ?? undefined,
        },
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
  }, [file, settings.geminiApiKey, chunkCount, handoutMode, settings.useVisionMode, sourceFileData]);

  const handleSaveDeck = useCallback(async () => {
    if (!file || generatedCards.length === 0) return;

    let sourceFileId: string | undefined;
    if (saveSource && sourceFileData) {
      const { storeSourceFile } = await import('../../services/sourceFileStore');
      sourceFileId = crypto.randomUUID();
      await storeSourceFile(sourceFileId, file.name, detectFormat(file) as 'pdf' | 'pptx' | 'goodnotes', sourceFileData);
    }

    const deck: Deck = {
      id: crypto.randomUUID(),
      name: file.name.replace(/\.(pdf|pptx|ppt|goodnotes)$/i, ''),
      createdAt: new Date().toISOString(),
      totalPages: pdfContent?.totalPages ?? 0,
      sourceFileId,
      sourceFileName: file.name,
      sourceFileFormat: detectFormat(file) as 'pdf' | 'pptx' | 'goodnotes',
      handoutMode,
      cards: generatedCards.map(c =>
        createNewCard(crypto.randomUUID(), c.question, c.answer, c.category, c.sourcePage, {
          explanation: c.explanation,
          questionType: c.questionType,
          choices: c.choices,
          correctChoiceIndex: c.correctChoiceIndex,
          figureDescription: c.figureDescription,
        })
      ),
    };

    onDeckCreated(deck);
  }, [file, generatedCards, pdfContent, onDeckCreated, saveSource, sourceFileData, handoutMode]);

  const redCount = generatedCards.filter(c => c.category === 'red-text').length;
  const importantCount = generatedCards.filter(c => c.category === 'important').length;
  const generalCount = generatedCards.filter(c => c.category === 'general').length;
  const examCount = generatedCards.filter(c => c.category === 'exam-question').length;
  const mcCount = generatedCards.filter(c => c.questionType === 'multiple-choice').length;

  return (
    <div className="upload-page">
      <h2 className="upload-title">ファイルからカード生成</h2>

      <PdfDropZone
        onFileSelect={handleFileSelect}
        currentFile={file}
        onClear={handleClear}
      />

      {!settings.geminiApiKey && file && phase === 'select' && (
        <div className="upload-info">
          <p>共有APIキーを使用します（無料）。自分のキーを設定するとより安定します。</p>
          <button className="upload-link-btn" onClick={onNavigateSettings}>
            APIキーを設定（任意）
          </button>
        </div>
      )}

      {file && phase === 'select' && (
        <div className="upload-generate-section">
          <div className="upload-option-row">
            <div className="upload-chunk-setting">
              <label className="upload-chunk-label">分割数</label>
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

            <div className="upload-handout-setting">
              <label className="upload-chunk-label">ページレイアウト</label>
              <div className="upload-handout-options">
                {(['normal', '4-per-page', '6-per-page'] as HandoutMode[]).map(mode => (
                  <label key={mode} className={`upload-handout-option ${handoutMode === mode ? 'upload-handout-option--active' : ''}`}>
                    <input
                      type="radio"
                      name="handoutMode"
                      value={mode}
                      checked={handoutMode === mode}
                      onChange={() => setHandoutMode(mode)}
                    />
                    {mode === 'normal' ? '通常' : mode === '4-per-page' ? '4枚/ページ' : '6枚/ページ'}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="upload-options-footer">
            <label className="upload-save-source">
              <input
                type="checkbox"
                checked={saveSource}
                onChange={e => setSaveSource(e.target.checked)}
              />
              元ファイルを保存(エクスポート用)
            </label>
            {settings.useVisionMode && detectFormat(file) === 'pdf' && (
              <span className="upload-vision-badge">画像認識ON</span>
            )}
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
          {file && (
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
            {examCount > 0 && (
              <div className="upload-stat upload-stat--exam">
                <span className="upload-stat-num">{examCount}</span>
                <span className="upload-stat-label">試験問題</span>
              </div>
            )}
            {mcCount > 0 && (
              <div className="upload-stat upload-stat--mc">
                <span className="upload-stat-num">{mcCount}</span>
                <span className="upload-stat-label">選択式</span>
              </div>
            )}
          </div>

          <div className="upload-card-list">
            {generatedCards.slice(0, 5).map((c, i) => (
              <div key={i} className="upload-card-preview">
                <div className="upload-card-tags">
                  <span className={`upload-card-tag upload-card-tag--${c.category}`}>
                    {getCategoryLabel(c.category)}
                  </span>
                  {c.questionType === 'multiple-choice' && (
                    <span className="upload-card-tag upload-card-tag--mc">選択式</span>
                  )}
                </div>
                <p className="upload-card-q">Q: {c.question}</p>
                <p className="upload-card-a">A: {c.answer}</p>
                {c.explanation && (
                  <p className="upload-card-explanation">解説: {c.explanation}</p>
                )}
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
