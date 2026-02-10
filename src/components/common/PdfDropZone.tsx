import { useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { ACCEPTED_EXTENSIONS, detectFormat } from '../../services/fileParser';
import './PdfDropZone.css';

interface PdfDropZoneProps {
  onFileSelect: (file: File) => void;
  currentFile?: File | null;
  onClear?: () => void;
}

const FORMAT_ICONS: Record<string, string> = {
  pdf: '📕',
  pptx: '📊',
  goodnotes: '📝',
  unknown: '📄',
};

export function PdfDropZone({ onFileSelect, currentFile, onClear }: PdfDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const isAcceptedFile = useCallback((file: File): boolean => {
    return detectFormat(file) !== 'unknown';
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file && isAcceptedFile(file)) {
      onFileSelect(file);
    }
  }, [onFileSelect, isAcceptedFile]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    if (inputRef.current) inputRef.current.value = '';
  }, [onFileSelect]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (currentFile) {
    const format = detectFormat(currentFile);
    const icon = FORMAT_ICONS[format] ?? '📄';

    return (
      <div className="pdf-drop-loaded">
        <div className="pdf-drop-file-icon">{icon}</div>
        <div className="pdf-drop-file-info">
          <span className="pdf-drop-file-name">{currentFile.name}</span>
          <span className="pdf-drop-file-size">{formatSize(currentFile.size)}</span>
        </div>
        {onClear && (
          <button className="pdf-drop-change-btn" onClick={onClear}>
            変更
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="pdf-drop-container">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        onChange={handleChange}
        className="pdf-drop-input"
      />
      <div
        className="pdf-drop-zone"
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="pdf-drop-icon">📥</div>
        <p className="pdf-drop-text">
          ファイルをドラッグ&ドロップ
        </p>
        <p className="pdf-drop-subtext">
          またはクリックしてファイルを選択
        </p>
        <p className="pdf-drop-formats">
          PDF / PowerPoint / GoodNotes
        </p>
      </div>
    </div>
  );
}
