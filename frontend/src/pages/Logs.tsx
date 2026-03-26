import { useEffect, useRef, useState } from 'react';
import {
  filesApi, CsvUploadResult, CsvValidationDetail, CsvFieldSpec,
  UploadRecord,
} from '../lib/api';
import {
  UploadCloud, FileText, CheckCircle2, AlertCircle,
  X, Table2, AlertTriangle, ChevronDown, ChevronUp, Trash2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Static field specs shown in the permanent warning banner
// ---------------------------------------------------------------------------
const STATIC_FIELD_SPECS: CsvFieldSpec[] = [
  { field: 'robot_id',        type: 'string',     rule: 'Pattern: robot_XXX (3 digits)',          example: 'robot_001' },
  { field: 'timestamp',       type: 'string',     rule: 'ISO 8601 (e.g. 2024-03-15T14:23:01Z)',  example: '2024-03-15T14:23:01Z' },
  { field: 'location_x',      type: 'float',      rule: 'Any numeric value',                      example: '12.34' },
  { field: 'location_y',      type: 'float',      rule: 'Any numeric value',                      example: '-5.67' },
  { field: 'battery_level',   type: 'int',        rule: 'Integer 0–100',                          example: '85' },
  { field: 'device_a_status', type: 'string',     rule: 'Enum: ok | warning | error',             example: 'ok/warning/error' },
  { field: 'device_b_status', type: 'string',     rule: 'Enum: ok | warning | error',             example: 'ok/warning/error' },
  { field: 'speed',           type: 'float',      rule: 'Non-negative number (m/s)',              example: '1.5' },
  { field: 'error_code',      type: 'int | null', rule: 'Integer or empty (null when no error)',  example: '400（或空值）' },
];

// ---------------------------------------------------------------------------
// FieldSpecBanner — always visible, collapsible
// ---------------------------------------------------------------------------
function FieldSpecBanner() {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border" style={{ borderColor: '#92400e', background: 'rgba(120,53,15,0.15)' }}>
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <AlertTriangle size={15} style={{ color: '#fbbf24', flexShrink: 0 }} />
        <span className="flex-1 text-sm font-medium" style={{ color: '#fde68a' }}>
          CSV 格式要求：上传文件必须包含以下 9 个列，列名允许有轻微差异（大小写/符号）
        </span>
        {expanded
          ? <ChevronUp size={14} style={{ color: '#fbbf24', flexShrink: 0 }} />
          : <ChevronDown size={14} style={{ color: '#fbbf24', flexShrink: 0 }} />}
      </button>
      {expanded && (
        <div className="overflow-x-auto border-t" style={{ borderColor: '#92400e' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'rgba(120,53,15,0.25)' }}>
                {['列名', '示例值'].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-semibold whitespace-nowrap"
                    style={{ color: '#fde68a', borderBottom: '1px solid #92400e' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STATIC_FIELD_SPECS.map((spec, i) => (
                <tr key={spec.field} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(120,53,15,0.12)' }}>
                  <td className="px-4 py-2 font-mono whitespace-nowrap" style={{ color: '#fcd34d' }}>{spec.field}</td>
                  <td className="px-4 py-2 font-mono" style={{ color: '#d1d5db' }}>
                    {spec.example === '' ? <span style={{ color: '#6b7280' }}>(空)</span> : spec.example}
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

// ---------------------------------------------------------------------------
// ValidationErrorModal
// ---------------------------------------------------------------------------
interface ValidationErrorModalProps {
  detail: CsvValidationDetail;
  onClose: () => void;
}

interface DeleteConfirmModalProps {
  fileName: string;
  deleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

function ValidationErrorModal({ detail, onClose }: ValidationErrorModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border flex flex-col"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--danger)', maxHeight: '80vh' }}
      >
        {/* Modal header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <AlertCircle size={18} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <div className="flex-1">
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>CSV 校验失败</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{detail.message}</p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Missing fields */}
          {detail.missing_fields && detail.missing_fields.length > 0 && (
            <div className="rounded-lg border p-4" style={{ borderColor: 'var(--danger)', background: 'rgba(248,113,113,0.06)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--danger)' }}>
                缺少必填字段 ({detail.missing_fields.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {detail.missing_fields.map(f => (
                  <span key={f} className="px-2 py-0.5 rounded-md text-xs font-mono"
                    style={{ background: 'rgba(248,113,113,0.15)', color: 'var(--danger)' }}>{f}</span>
                ))}
              </div>
            </div>
          )}

          {/* Unknown columns */}
          {detail.unknown_columns && detail.unknown_columns.length > 0 && (
            <div className="rounded-lg border p-4" style={{ borderColor: '#92400e', background: 'rgba(120,53,15,0.15)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#fbbf24' }}>
                无法识别的列（已忽略，不影响校验）
              </p>
              <div className="flex flex-wrap gap-1.5">
                {detail.unknown_columns.map(c => (
                  <span key={c} className="px-2 py-0.5 rounded-md text-xs font-mono"
                    style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>{c}</span>
                ))}
              </div>
            </div>
          )}

          {/* Per-row errors table */}
          {detail.errors && detail.errors.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                字段校验错误（{detail.errors.length} 条）
              </p>
              <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'var(--bg-elevated)' }}>
                      {['行号', '字段', '原始値', '错误原因'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap"
                          style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{h}</th>
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
          <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--danger)', color: '#fff' }}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ fileName, deleting, onConfirm, onClose }: DeleteConfirmModalProps) {
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
          <button onClick={onClose} disabled={deleting} className="px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
            取消
          </button>
          <button onClick={onConfirm} disabled={deleting} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--danger)', color: '#fff', opacity: deleting ? 0.7 : 1 }}>
            {deleting ? '删除中…' : '确认删除'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Logs page
// ---------------------------------------------------------------------------
export default function Logs() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<CsvUploadResult | null>(null);
  const [history, setHistory] = useState<UploadRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [validationDetail, setValidationDetail] = useState<CsvValidationDetail | null>(null);
  const [simpleError, setSimpleError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<UploadRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reset = () => {
    setResult(null);
    setSimpleError('');
    setSuccessMessage('');
    setValidationDetail(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const loadHistory = () => {
    setHistoryLoading(true);
    filesApi.history()
      .then(res => setHistory(res.data))
      .catch(() => setSimpleError('历史记录加载失败，请刷新页面重试。'))
      .finally(() => setHistoryLoading(false));
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(''), 3000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setSimpleError('请选择 .csv 文件。');
      return;
    }
    setSimpleError('');
    setValidationDetail(null);
    setResult(null);
    setUploading(true);
    try {
      const res = await filesApi.uploadCsv(file);
      setResult(res.data);
      loadHistory();
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      if (detail && typeof detail === 'object') {
        setValidationDetail(detail as CsvValidationDetail);
      } else {
        setSimpleError(typeof detail === 'string' ? detail : '上传失败，请重试。');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (item: UploadRecord) => {
    setDeleteTarget(item);
  };

  const handleBrowse = (item: UploadRecord) => {
    window.open(`/logs/${item.id}/view`, '_blank');
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await filesApi.remove(deleteTarget.id);
      setHistory(prev => prev.filter(record => record.id !== deleteTarget.id));
      if (result?.url === deleteTarget.file_url) {
        setResult(null);
      }
      setSimpleError('');
      setSuccessMessage(`已删除文件：${deleteTarget.original_filename}`);
      setDeleteTarget(null);
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setSimpleError(typeof detail === 'string' ? detail : '删除失败，请重试。');
    } finally {
      setDeleting(false);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => handleFile(e.target.files?.[0]);
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]); };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Log Files</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>上传 CSV 格式的机器人日志文件</p>
      </div>

      {/* Permanent format warning banner */}
      <FieldSpecBanner />

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
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
            <div className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          </div>
        )}
      </div>

      {/* Simple error banner */}
      {simpleError && (
        <div className="flex items-start gap-3 rounded-xl border p-4 text-sm"
          style={{ color: 'var(--danger)', borderColor: 'var(--danger)', background: 'rgba(248,113,113,0.06)' }}>
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{simpleError}</span>
          <button onClick={() => setSimpleError('')} style={{ color: 'var(--text-muted)' }}><X size={15} /></button>
        </div>
      )}

      {/* Success banner */}
      {successMessage && (
        <div className="flex items-start gap-3 rounded-xl border p-4 text-sm"
          style={{ color: 'var(--success)', borderColor: 'var(--success)', background: 'rgba(52,211,153,0.08)' }}>
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} style={{ color: 'var(--text-muted)' }}><X size={15} /></button>
        </div>
      )}

      {/* Success result */}
      {result && (
        <div className="space-y-4">
          {/* Unknown columns warning (non-blocking) */}
          {result.unknown_columns.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border p-4 text-sm"
              style={{ borderColor: '#92400e', background: 'rgba(120,53,15,0.15)', color: '#fde68a' }}>
              <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: '#fbbf24' }} />
              <span className="flex-1">
                以下列名无法识别，已忽略：{' '}
                {result.unknown_columns.map(c => (
                  <span key={c} className="font-mono px-1.5 py-0.5 rounded text-xs mr-1"
                    style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>{c}</span>
                ))}
              </span>
            </div>
          )}

          {/* Summary card */}
          <div className="rounded-xl border p-5 flex items-start gap-4"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(52,211,153,0.12)' }}>
              <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                {result.original_filename}
              </p>
              <div className="flex flex-wrap gap-4 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="flex items-center gap-1"><FileText size={12} /> {result.row_count} rows</span>
                <span className="flex items-center gap-1"><Table2 size={12} /> {result.headers.length} columns</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {result.headers.map(h => (
                  <span key={h} className="px-2 py-0.5 rounded-md text-xs font-mono"
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>{h}</span>
                ))}
              </div>
            </div>
            <button onClick={reset} className="shrink-0" style={{ color: 'var(--text-muted)' }}>
              <X size={15} />
            </button>
          </div>

          {/* Preview table */}
          {result.preview.length > 0 && (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <div className="px-4 py-3 border-b text-xs font-medium"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                预览 — 前 {result.preview.length} 行（已完成类型转换）
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'var(--bg-elevated)' }}>
                      {result.headers.map(h => (
                        <th key={h} className="px-4 py-2.5 text-left font-medium whitespace-nowrap"
                          style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.preview.map((row, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-elevated)' }}>
                        {result.headers.map(h => (
                          <td key={h} className="px-4 py-2.5 whitespace-nowrap font-mono"
                            style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>
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
      )}

      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="px-4 py-3 border-b text-sm font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
          历史上传记录
        </div>
        {historyLoading ? (
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
                        onClick={() => handleBrowse(item)}
                        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border"
                        style={{ color: 'var(--accent)', borderColor: 'var(--accent)', background: 'var(--accent-dim)' }}
                      >
                        浏览数据
                      </button>
                    </td>
                    <td className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                      <button onClick={() => handleDelete(item)} className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--danger)' }}>
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

      {/* Validation error modal */}
      {validationDetail && (
        <ValidationErrorModal detail={validationDetail} onClose={() => setValidationDetail(null)} />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          fileName={deleteTarget.original_filename}
          deleting={deleting}
          onConfirm={confirmDelete}
          onClose={() => !deleting && setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
