import { useState } from 'react';
import type { AppSettings } from '../../types';
import { testApiKey } from '../../services/gemini';
import { AdBanner } from '../common/AdBanner';
import './SettingsPage.css';

interface SettingsPageProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export function SettingsPage({ settings, onSettingsChange }: SettingsPageProps) {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

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

      <AdBanner slot="settingsBottom" className="ad-banner--bottom" />
    </div>
  );
}
