import type { CsvUploadResult } from '../../lib/api';
import { AlertTriangle, CheckCircle2, FileText, Table2, X } from 'lucide-react';

interface UploadResultPanelProps {
  result: CsvUploadResult;
  onReset: () => void;
}

export function UploadResultPanel({ result, onReset }: UploadResultPanelProps) {
  return (
    <div className="space-y-4">
      {result.unknown_columns.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border p-4 text-sm" style={{ borderColor: '#92400e', background: 'rgba(120,53,15,0.15)', color: '#fde68a' }}>
          <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: '#fbbf24' }} />
          <span className="flex-1">
            以下列名无法识别，已忽略：{' '}
            {result.unknown_columns.map(c => (
              <span key={c} className="font-mono px-1.5 py-0.5 rounded text-xs mr-1" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>{c}</span>
            ))}
          </span>
        </div>
      )}

      <div className="rounded-xl border p-5 flex items-start gap-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(52,211,153,0.12)' }}>
          <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{result.original_filename}</p>
          <div className="flex flex-wrap gap-4 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1"><FileText size={12} /> {result.row_count} rows</span>
            <span className="flex items-center gap-1"><Table2 size={12} /> {result.headers.length} columns</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {result.headers.map(h => (
              <span key={h} className="px-2 py-0.5 rounded-md text-xs font-mono" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>{h}</span>
            ))}
          </div>
        </div>
        <button onClick={onReset} className="shrink-0" style={{ color: 'var(--text-muted)' }}>
          <X size={15} />
        </button>
      </div>

      {result.preview.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <div className="px-4 py-3 border-b text-xs font-medium" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            预览 — 前 {result.preview.length} 行（已完成类型转换）
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--bg-elevated)' }}>
                  {result.headers.map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-medium whitespace-nowrap" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.preview.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-elevated)' }}>
                    {result.headers.map(h => (
                      <td key={h} className="px-4 py-2.5 whitespace-nowrap font-mono" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>
                        {row[h] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
