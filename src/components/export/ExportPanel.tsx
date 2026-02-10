import { useState } from 'react';
import type { Deck, ExportFormat } from '../../types';
import './ExportPanel.css';

interface ExportPanelProps {
  deck: Deck;
  hasSourceFile: boolean;
  onClose: () => void;
}

const FORMAT_OPTIONS: {
  value: ExportFormat;
  icon: string;
  label: string;
  desc: string;
  needsSource?: boolean;
}[] = [
  { value: 'pdf', icon: '📕', label: 'PDF問題集', desc: '印刷して紙ベースで学習' },
  { value: 'pptx', icon: '📊', label: 'PowerPoint', desc: 'スライド形式で共有' },
  { value: 'pdf-append', icon: '📎', label: '元PDFに追加', desc: 'スライドの後に問題を追加', needsSource: true },
  { value: 'json', icon: '💾', label: 'JSONバックアップ', desc: 'データの外部保存・復元用' },
];

export function ExportPanel({ deck, hasSourceFile, onClose }: ExportPanelProps) {
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [error, setError] = useState('');

  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      switch (exportFormat) {
        case 'pdf': {
          const { exportDeckAsPdf } = await import('../../utils/pdfExport');
          await exportDeckAsPdf(deck);
          break;
        }
        case 'pptx': {
          const { exportDeckAsPptx } = await import('../../utils/pptxExport');
          await exportDeckAsPptx(deck);
          break;
        }
        case 'pdf-append': {
          if (!deck.sourceFileId) {
            setError('元ファイルが保存されていません');
            setExporting(false);
            return;
          }
          const { getSourceFile } = await import('../../services/sourceFileStore');
          const source = await getSourceFile(deck.sourceFileId);
          if (!source) {
            setError('元ファイルが見つかりません');
            setExporting(false);
            return;
          }
          const { exportAppendedPdf } = await import('../../utils/pdfAppendExport');
          await exportAppendedPdf(deck, source.data);
          break;
        }
        case 'json': {
          const { exportDeckAsJson } = await import('../../utils/jsonExport');
          exportDeckAsJson(deck);
          break;
        }
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エクスポートに失敗しました');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="export-panel">
      <div className="export-panel-header">
        <h3 className="export-panel-title">エクスポート</h3>
        <button className="export-panel-close" onClick={onClose}>✕</button>
      </div>

      <div className="export-panel-options">
        {FORMAT_OPTIONS.map(opt => {
          const disabled = opt.needsSource && !hasSourceFile;
          return (
            <label
              key={opt.value}
              className={`export-option ${exportFormat === opt.value ? 'export-option--active' : ''} ${disabled ? 'export-option--disabled' : ''}`}
            >
              <input
                type="radio"
                name="exportFormat"
                value={opt.value}
                checked={exportFormat === opt.value}
                onChange={() => setExportFormat(opt.value)}
                disabled={disabled}
              />
              <span className="export-option-icon">{opt.icon}</span>
              <div className="export-option-text">
                <span className="export-option-label">{opt.label}</span>
                <span className="export-option-desc">
                  {disabled ? '元ファイルが保存されていません' : opt.desc}
                </span>
              </div>
            </label>
          );
        })}
      </div>

      {error && <p className="export-panel-error">{error}</p>}

      <button
        className="export-panel-btn"
        onClick={handleExport}
        disabled={exporting}
      >
        {exporting ? 'エクスポート中...' : 'エクスポート'}
      </button>
    </div>
  );
}
