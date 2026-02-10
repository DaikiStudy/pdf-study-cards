import { useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import './PdfDropZone.css';

interface PdfDropZoneProps {
  onFileSelect: (file: File) => void;
  currentFile?: File | null;
  onClear?: () => void;
}

export function PdfDropZone({ onFileSelect, currentFile, onClear }: PdfDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      onFileSelect(file);
    }
  }, [onFileSelect]);

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
    return (
      <div className="pdf-drop-loaded">
        <div className="pdf-drop-file-icon">📄</div>
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
        accept="application/pdf"
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
          PDFファイルをドラッグ&ドロップ
        </p>
        <p className="pdf-drop-subtext">
          またはクリックしてファイルを選択
        </p>
      </div>
    </div>
  );
}
