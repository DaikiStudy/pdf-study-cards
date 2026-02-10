import { useState, useEffect, useRef } from 'react';
import type { AppSettings, Deck } from '../../types';
import { testApiKey } from '../../services/gemini';
import { getStorageUsage, clearAllSourceFiles } from '../../services/sourceFileStore';
import { exportAllDecksAsJson, parseImportedJson } from '../../utils/jsonExport';
import { AdBanner } from '../common/AdBanner';
import './SettingsPage.css';

interface SettingsPageProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  decks: Deck[];
  onImportDecks: (decks: Deck[]) => void;
}

export function SettingsPage({ settings, onSettingsChange, decks, onImportDecks }: SettingsPageProps) {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [storageInfo, setStorageInfo] = useState<{ count: number; totalBytes: number } | null>(null);
  const [importStatus, setImportStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getStorageUsage().then(setStorageInfo).catch(() => {});
  }, []);

  const handleApiKeyChange = (key: string) => {
    onSettingsChange({ ...settings, geminiApiKey: key });
    setTestStatus('idle');
  };

  const handleTestConnection = async () => {
    if (!settings.geminiApiKey) return;
    setTestStatus('testing');
    const ok = await testApiKey(settings.geminiApiKey);
    setTestStatus(ok ? 'success' : 'error');
  };

  const handleExportAll = () => {
    if (decks.length === 0) return;
    exportAllDecksAsJson(decks);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = parseImportedJson(text);
      onImportDecks(imported);
      setImportStatus(`${imported.length}件のデッキをインポートしました`);
    } catch {
      setImportStatus('インポートに失敗しました。ファイルを確認してください。');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearSourceFiles = async () => {
    if (!confirm('保存されているソースファイルをすべて削除しますか？')) return;
    await clearAllSourceFiles();
    setStorageInfo({ count: 0, totalBytes: 0 });
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="settings-page">
      <h2 className="settings-title">設定</h2>

      <section className="settings-section">
        <h3 className="settings-section-title">Gemini API キー</h3>
        <p className="settings-section-desc">
          Google AI StudioでAPIキーを取得して入力してください。
          キーはブラウザのローカルストレージにのみ保存されます。
        </p>
        <div className="settings-api-row">
          <input
            type="password"
            className="settings-input"
            placeholder="AIza..."
            value={settings.geminiApiKey}
            onChange={e => handleApiKeyChange(e.target.value)}
          />
          <button
            className="settings-test-btn"
            onClick={handleTestConnection}
            disabled={!settings.geminiApiKey || testStatus === 'testing'}
          >
            {testStatus === 'testing' ? 'テスト中...' : '接続テスト'}
          </button>
        </div>
        {testStatus === 'success' && (
          <p className="settings-status settings-status--success">接続成功！APIキーは有効です。</p>
        )}
        {testStatus === 'error' && (
          <p className="settings-status settings-status--error">接続失敗。APIキーを確認してください。</p>
        )}
      </section>

      <section className="settings-section">
        <h3 className="settings-section-title">学習設定</h3>
        <div className="settings-field">
          <label className="settings-label">1セッションのカード数</label>
          <input
            type="number"
            className="settings-input settings-input--small"
            min={5}
            max={100}
            value={settings.cardsPerSession}
            onChange={e => onSettingsChange({
              ...settings,
              cardsPerSession: Math.max(5, Math.min(100, Number(e.target.value) || 20)),
            })}
          />
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-section-title">カード生成設定</h3>
        <div className="settings-field">
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={settings.useVisionMode}
              onChange={e => onSettingsChange({ ...settings, useVisionMode: e.target.checked })}
            />
            <span className="settings-toggle-label">
              Vision モード（図表認識）
            </span>
          </label>
        </div>
        <p className="settings-section-desc">
          ONにするとPDFの各ページを画像としてGeminiに送信し、図表やレイアウトを認識します。
          API使用量が増えますが、より正確なカードが生成されます。
        </p>
      </section>

      <section className="settings-section">
        <h3 className="settings-section-title">データ管理</h3>

        <div className="settings-data-row">
          <div className="settings-data-info">
            <span className="settings-data-label">デッキ数</span>
            <span className="settings-data-value">{decks.length}件</span>
          </div>
          <div className="settings-data-actions">
            <button
              className="settings-btn settings-btn--secondary"
              onClick={handleExportAll}
              disabled={decks.length === 0}
            >
              全デッキをJSONエクスポート
            </button>
            <label className="settings-btn settings-btn--secondary settings-btn--file">
              JSONインポート
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFile}
                hidden
              />
            </label>
          </div>
        </div>
        {importStatus && (
          <p className={`settings-status ${importStatus.includes('失敗') ? 'settings-status--error' : 'settings-status--success'}`}>
            {importStatus}
          </p>
        )}

        {storageInfo && (
          <div className="settings-data-row">
            <div className="settings-data-info">
              <span className="settings-data-label">ソースファイル（IndexedDB）</span>
              <span className="settings-data-value">
                {storageInfo.count}件 / {formatBytes(storageInfo.totalBytes)}
              </span>
            </div>
            {storageInfo.count > 0 && (
              <button
                className="settings-btn settings-btn--danger"
                onClick={handleClearSourceFiles}
              >
                全て削除
              </button>
            )}
          </div>
        )}
      </section>

      <AdBanner slot="settingsBottom" className="ad-banner--bottom" />
    </div>
  );
}
