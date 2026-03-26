import type { RefObject } from 'react';
import { UploadCloud } from 'lucide-react';

interface UploadDropzoneProps {
  inputRef: RefObject<HTMLInputElement>;
  dragging: boolean;
  uploading: boolean;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function UploadDropzone({
  inputRef,
  dragging,
  uploading,
  onDragOver,
  onDragLeave,
  onDrop,
  onInputChange,
}: UploadDropzoneProps) {
  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed cursor-pointer transition-all py-16 px-6 select-none"
      style={{ borderColor: dragging ? 'var(--accent)' : 'var(--border)', background: dragging ? 'var(--accent-dim)' : 'var(--bg-surface)' }}
    >
      <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
        <UploadCloud size={28} style={{ color: 'var(--accent)' }} />
      </div>
      <div className="text-center">
        <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
          {uploading ? '上传中…' : '拖放 CSV 文件到此，或点击浏览'}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Only .csv files · UTF-8 encoded</p>
      </div>
      <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={onInputChange} />
      {uploading && (
        <div className="absolute inset-0 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      )}
    </div>
  );
}
