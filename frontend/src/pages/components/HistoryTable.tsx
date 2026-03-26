import type { UploadRecord } from '../../lib/api';
import { Trash2 } from 'lucide-react';

interface HistoryTableProps {
  history: UploadRecord[];
  loading: boolean;
  onBrowse: (item: UploadRecord) => void;
  onDelete: (item: UploadRecord) => void;
}

export function HistoryTable({ history, loading, onBrowse, onDelete }: HistoryTableProps) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
      <div className="px-4 py-3 border-b text-sm font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
        历史上传记录
      </div>
      {loading ? (
        <div className="p-4 text-sm" style={{ color: 'var(--text-muted)' }}>加载中...</div>
      ) : history.length === 0 ? (
        <div className="p-4 text-sm" style={{ color: 'var(--text-muted)' }}>暂无历史上传记录</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['文件名', '上传时间', '行数', '浏览', '操作'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-medium whitespace-nowrap" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((item, i) => (
                <tr key={item.id} style={{ background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-elevated)' }}>
                  <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>{item.original_filename}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{new Date(item.uploaded_at).toLocaleString()}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{item.row_count}</td>
                  <td className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                    <button
                      onClick={() => onBrowse(item)}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border"
                      style={{ color: 'var(--accent)', borderColor: 'var(--accent)', background: 'var(--accent-dim)' }}
                    >
                      浏览数据
                    </button>
                  </td>
                  <td className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                    <button onClick={() => onDelete(item)} className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--danger)' }}>
                      <Trash2 size={13} /> 删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
