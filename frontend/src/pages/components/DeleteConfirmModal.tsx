import { Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  fileName: string;
  deleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteConfirmModal({ fileName, deleting, onConfirm, onClose }: DeleteConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={e => { if (e.target === e.currentTarget && !deleting) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--danger)' }}>
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <Trash2 size={18} style={{ color: 'var(--danger)' }} />
          <div className="flex-1">
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>确认删除文件</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>删除后不可恢复。</p>
          </div>
          <button onClick={onClose} disabled={deleting} style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        <div className="px-5 py-4 text-sm" style={{ color: 'var(--text-primary)' }}>
          你确定要删除文件 <span className="font-mono" style={{ color: 'var(--danger)' }}>{fileName}</span> 吗？
        </div>

        <div className="px-5 py-4 border-t flex justify-end gap-3" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} disabled={deleting} className="px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>取消</button>
          <button onClick={onConfirm} disabled={deleting} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--danger)', color: '#fff', opacity: deleting ? 0.7 : 1 }}>
            {deleting ? '删除中…' : '确认删除'}
          </button>
        </div>
      </div>
    </div>
  );
}
