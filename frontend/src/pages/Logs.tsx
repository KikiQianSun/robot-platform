import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { filesApi, type CsvUploadResult, type CsvValidationDetail, type UploadRecord } from '../lib/api';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { FieldSpecBanner } from './components/FieldSpecBanner';
import { HistoryTable } from './components/HistoryTable';
import { UploadDropzone } from './components/UploadDropzone';
import { UploadResultPanel } from './components/UploadResultPanel';
import { ValidationErrorModal } from './components/ValidationErrorModal';

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
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]); };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Log Files</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>上传 CSV 格式的机器人日志文件</p>
      </div>

      <FieldSpecBanner />

      <UploadDropzone
        inputRef={inputRef}
        dragging={dragging}
        uploading={uploading}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onInputChange={onInputChange}
      />

      {simpleError && (
        <div className="flex items-start gap-3 rounded-xl border p-4 text-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', background: 'rgba(248,113,113,0.06)' }}>
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{simpleError}</span>
          <button onClick={() => setSimpleError('')} style={{ color: 'var(--text-muted)' }}><X size={15} /></button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-3 rounded-xl border p-4 text-sm" style={{ color: 'var(--success)', borderColor: 'var(--success)', background: 'rgba(52,211,153,0.08)' }}>
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} style={{ color: 'var(--text-muted)' }}><X size={15} /></button>
        </div>
      )}

      {result && <UploadResultPanel result={result} onReset={reset} />}

      <HistoryTable
        history={history}
        loading={historyLoading}
        onBrowse={handleBrowse}
        onDelete={setDeleteTarget}
      />

      {validationDetail && <ValidationErrorModal detail={validationDetail} onClose={() => setValidationDetail(null)} />}

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
