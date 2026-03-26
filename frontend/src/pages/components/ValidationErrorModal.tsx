import type { CsvValidationDetail } from '../../lib/api';
import { AlertCircle, X } from 'lucide-react';

interface ValidationErrorModalProps {
  detail: CsvValidationDetail;
  onClose: () => void;
}

export function ValidationErrorModal({ detail, onClose }: ValidationErrorModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl rounded-2xl border flex flex-col" style={{ background: 'var(--bg-surface)', borderColor: 'var(--danger)', maxHeight: '80vh' }}>
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <AlertCircle size={18} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <div className="flex-1">
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>CSV 校验失败</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{detail.message}</p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {detail.missing_fields && detail.missing_fields.length > 0 && (
            <div className="rounded-lg border p-4" style={{ borderColor: 'var(--danger)', background: 'rgba(248,113,113,0.06)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--danger)' }}>缺少必填字段 ({detail.missing_fields.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {detail.missing_fields.map(f => (
                  <span key={f} className="px-2 py-0.5 rounded-md text-xs font-mono" style={{ background: 'rgba(248,113,113,0.15)', color: 'var(--danger)' }}>{f}</span>
                ))}
              </div>
            </div>
          )}

          {detail.unknown_columns && detail.unknown_columns.length > 0 && (
            <div className="rounded-lg border p-4" style={{ borderColor: '#92400e', background: 'rgba(120,53,15,0.15)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#fbbf24' }}>无法识别的列（已忽略，不影响校验）</p>
              <div className="flex flex-wrap gap-1.5">
                {detail.unknown_columns.map(c => (
                  <span key={c} className="px-2 py-0.5 rounded-md text-xs font-mono" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>{c}</span>
                ))}
              </div>
            </div>
          )}

          {detail.errors && detail.errors.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>字段校验错误（{detail.errors.length} 条）</p>
              <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'var(--bg-elevated)' }}>
                      {['行号', '字段', '原始値', '错误原因'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.errors.map((err, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-elevated)' }}>
                        <td className="px-3 py-2 font-mono" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{err.row}</td>
                        <td className="px-3 py-2 font-mono whitespace-nowrap" style={{ color: '#fcd34d', borderBottom: '1px solid var(--border)' }}>{err.field}</td>
                        <td className="px-3 py-2 font-mono max-w-[120px] truncate" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }} title={err.raw_value}>
                          {err.raw_value === '' ? <span style={{ opacity: 0.4 }}>(空)</span> : err.raw_value}
                        </td>
                        <td className="px-3 py-2" style={{ color: 'var(--danger)', borderBottom: '1px solid var(--border)' }}>{err.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t flex justify-end" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--danger)', color: '#fff' }}>关闭</button>
        </div>
      </div>
    </div>
  );
}
