import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  filesApi,
  UploadRecordInsightsResponse,
  UploadRecordRow,
  UploadRecordRowsParams,
} from '../lib/api';
import { AlertCircle, RotateCcw, X } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  ok: 'var(--success)',
  warning: 'var(--warning)',
  error: 'var(--danger)',
};

const PAGE_SIZE = 50;
const INSIGHT_TABS = [
  { id: 'filtered', label: '当前筛选结果分析' },
  { id: 'all', label: '全文件分析' },
] as const;
const TIME_WINDOWS = [
  { id: '6m', label: '近半年' },
  { id: '1y', label: '近一年' },
  { id: '2y', label: '近两年' },
] as const;

export default function LogViewer() {
  const { id } = useParams<{ id: string }>();
  const recordId = Number(id);

  const [filename, setFilename] = useState('');
  const [rows, setRows] = useState<UploadRecordRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeError, setTimeError] = useState('');
  const [insightTab, setInsightTab] = useState<(typeof INSIGHT_TABS)[number]['id']>('filtered');
  const [timeWindow, setTimeWindow] = useState<(typeof TIME_WINDOWS)[number]['id']>('1y');
  const [filteredInsights, setFilteredInsights] = useState<UploadRecordInsightsResponse | null>(null);
  const [allInsights, setAllInsights] = useState<UploadRecordInsightsResponse | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const [filters, setFilters] = useState<UploadRecordRowsParams>({
    robot_id: '',
    start_time: '',
    end_time: '',
    device_status: '',
    device_b_status: '',
    error_code: '',
    error_only: false,
  });

  const validateTimeRange = (start: string, end: string): boolean => {
    if (!start || !end) return true;
    const startDt = new Date(start).getTime();
    const endDt = new Date(end).getTime();
    return startDt <= endDt;
  };

  const fetchInsights = async (nextFilters: UploadRecordRowsParams) => {
    if (!recordId) return;
    try {
      setInsightsLoading(true);
      const baseParams = {
        ...nextFilters,
        robot_id: nextFilters.robot_id || undefined,
        start_time: nextFilters.start_time || undefined,
        end_time: nextFilters.end_time || undefined,
        device_status: nextFilters.device_status || undefined,
        device_b_status: nextFilters.device_b_status || undefined,
        error_code: nextFilters.error_code || undefined,
      };
      const [filteredRes, allRes] = await Promise.all([
        filesApi.getInsights(recordId, { ...baseParams, scope: 'filtered', time_window: timeWindow }),
        filesApi.getInsights(recordId, { ...baseParams, scope: 'all', time_window: timeWindow }),
      ]);
      setFilteredInsights(filteredRes.data);
      setAllInsights(allRes.data);
    } catch {
      setError('洞察分析加载失败，请重试。');
    } finally {
      setInsightsLoading(false);
    }
  };

  const fetchRows = async (nextPage: number, nextFilters: UploadRecordRowsParams) => {
    if (!recordId) return;
    try {
      setLoading(true);
      setError('');
      const res = await filesApi.getRows(recordId, {
        ...nextFilters,
        robot_id: nextFilters.robot_id || undefined,
        start_time: nextFilters.start_time || undefined,
        end_time: nextFilters.end_time || undefined,
        device_status: nextFilters.device_status || undefined,
        device_b_status: nextFilters.device_b_status || undefined,
        error_code: nextFilters.error_code || undefined,
        page: nextPage,
        page_size: PAGE_SIZE,
      });
      setFilename(res.data.original_filename);
      setRows(res.data.items);
      setTotalRows(res.data.total);
      setPage(res.data.page);
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : '加载失败，请重试。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows(1, filters);
    fetchInsights(filters);
  }, [recordId, timeWindow]);

  const handleFilterChange = (key: keyof UploadRecordRowsParams, value: string | boolean) => {
    setTimeError('');
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    if (!validateTimeRange(filters.start_time || '', filters.end_time || '')) {
      setTimeError('开始时间不能晚于结束时间');
      return;
    }
    fetchRows(1, filters);
    fetchInsights(filters);
  };

  const resetFilters = () => {
    const next: UploadRecordRowsParams = {
      robot_id: '',
      start_time: '',
      end_time: '',
      device_status: '',
      device_b_status: '',
      error_code: '',
      error_only: false,
    };
    setFilters(next);
    setTimeError('');
    fetchRows(1, next);
    fetchInsights(next);
  };

  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Top bar */}
      <header
        className="flex items-center gap-3 px-5 py-4 border-b sticky top-0 z-10"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {filename || '加载中...'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            共 {totalRows} 条记录 · 第 {page} / {totalPages} 页
          </p>
        </div>
      </header>

      {/* Filter bar */}
      <div
        className="px-5 py-4 border-b grid grid-cols-1 md:grid-cols-2 xl:grid-cols-8 gap-3 items-end"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: 'var(--text-muted)' }}>机器人 ID</label>
          <input
            value={filters.robot_id ?? ''}
            onChange={e => handleFilterChange('robot_id', e.target.value)}
            placeholder="robot_001"
            className="rounded-lg border px-3 py-2 text-sm bg-transparent"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: 'var(--text-muted)' }}>开始时间</label>
          <input
            type="datetime-local"
            value={filters.start_time ?? ''}
            onChange={e => handleFilterChange('start_time', e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm bg-transparent"
            style={{ borderColor: timeError ? 'var(--danger)' : 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: 'var(--text-muted)' }}>结束时间</label>
          <input
            type="datetime-local"
            value={filters.end_time ?? ''}
            onChange={e => handleFilterChange('end_time', e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm bg-transparent"
            style={{ borderColor: timeError ? 'var(--danger)' : 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: 'var(--text-muted)' }}>设备 A 状态</label>
          <select
            value={filters.device_status ?? ''}
            onChange={e => handleFilterChange('device_status', e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm bg-transparent"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', background: 'var(--bg-elevated)' }}
          >
            <option value="">全部</option>
            <option value="ok">ok</option>
            <option value="warning">warning</option>
            <option value="error">error</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: 'var(--text-muted)' }}>设备 B 状态</label>
          <select
            value={filters.device_b_status ?? ''}
            onChange={e => handleFilterChange('device_b_status', e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm bg-transparent"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', background: 'var(--bg-elevated)' }}
          >
            <option value="">全部</option>
            <option value="ok">ok</option>
            <option value="warning">warning</option>
            <option value="error">error</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: 'var(--text-muted)' }}>错误码</label>
          <input
            value={filters.error_code ?? ''}
            onChange={e => handleFilterChange('error_code', e.target.value)}
            placeholder="如 400"
            className="rounded-lg border px-3 py-2 text-sm bg-transparent"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
          <input
            type="checkbox"
            checked={Boolean(filters.error_only)}
            onChange={e => handleFilterChange('error_only', e.target.checked)}
          />
          仅看错误码非空
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={resetFilters}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
          >
            <RotateCcw size={13} /> 重置
          </button>
          <button
            onClick={applyFilters}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            查询
          </button>
        </div>
      </div>

      {/* Time error */}
      {timeError && (
        <div
          className="mx-5 mt-4 flex items-start gap-3 rounded-xl border p-4 text-sm"
          style={{ color: 'var(--danger)', borderColor: 'var(--danger)', background: 'rgba(248,113,113,0.06)' }}
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{timeError}</span>
          <button onClick={() => setTimeError('')} style={{ color: 'var(--text-muted)' }}><X size={15} /></button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div
          className="mx-5 mt-4 flex items-start gap-3 rounded-xl border p-4 text-sm"
          style={{ color: 'var(--danger)', borderColor: 'var(--danger)', background: 'rgba(248,113,113,0.06)' }}
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} style={{ color: 'var(--text-muted)' }}><X size={15} /></button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--text-muted)' }}>
            <div className="w-6 h-6 border-2 rounded-full animate-spin mr-3"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
            加载中…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--text-muted)' }}>
            当前筛选条件下暂无记录
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0" style={{ background: 'var(--bg-elevated)' }}>
              <tr>
                {['#', 'robot_id', 'timestamp', 'location_x', 'location_y', 'battery_%', 'device_a', 'device_b', 'speed', 'error_code'].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-medium whitespace-nowrap"
                    style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={`${row.robot_id}-${row.timestamp}-${i}`}
                  style={{ background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-elevated)' }}
                >
                  <td className="px-4 py-2.5 font-mono whitespace-nowrap" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{i + 1}</td>
                  <td className="px-4 py-2.5 font-mono whitespace-nowrap" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>{row.robot_id}</td>
                  <td className="px-4 py-2.5 font-mono whitespace-nowrap" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{row.timestamp}</td>
                  <td className="px-4 py-2.5 font-mono whitespace-nowrap" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>{row.location_x}</td>
                  <td className="px-4 py-2.5 font-mono whitespace-nowrap" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>{row.location_y}</td>
                  <td className="px-4 py-2.5 font-mono whitespace-nowrap" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>{row.battery_level}</td>
                  <td className="px-4 py-2.5 font-mono whitespace-nowrap" style={{ color: STATUS_COLORS[row.device_a_status] ?? 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>{row.device_a_status}</td>
                  <td className="px-4 py-2.5 font-mono whitespace-nowrap" style={{ color: STATUS_COLORS[row.device_b_status] ?? 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>{row.device_b_status}</td>
                  <td className="px-4 py-2.5 font-mono whitespace-nowrap" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>{row.speed}</td>
                  <td className="px-4 py-2.5 font-mono whitespace-nowrap" style={{ color: row.error_code !== null ? 'var(--danger)' : 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                    {row.error_code ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalRows > 0 && (
        <div
          className="px-5 py-4 border-t flex items-center justify-between text-sm sticky bottom-0"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <span style={{ color: 'var(--text-muted)' }}>
            第 {page} / {totalPages} 页 · 每页 {PAGE_SIZE} 条 · 共 {totalRows} 条
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchRows(page - 1, filters)}
              disabled={page <= 1 || loading}
              className="px-4 py-1.5 rounded-lg text-sm"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', opacity: page <= 1 ? 0.4 : 1 }}
            >
              上一页
            </button>
            <button
              onClick={() => fetchRows(page + 1, filters)}
              disabled={page >= totalPages || loading}
              className="px-4 py-1.5 rounded-lg text-sm"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', opacity: page >= totalPages ? 0.4 : 1 }}
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* Insights */}
      <section className="px-5 py-6 space-y-4" style={{ background: 'var(--bg-base)' }}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>工程师洞察</h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>从时序、机器人个体与电量三个维度分析故障与预警的关联</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-xl border p-1" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
              {TIME_WINDOWS.map(item => (
                <button
                  key={item.id}
                  onClick={() => setTimeWindow(item.id)}
                  className="px-3 py-1.5 rounded-lg text-sm"
                  style={{
                    background: timeWindow === item.id ? 'var(--accent-dim)' : 'transparent',
                    color: timeWindow === item.id ? 'var(--accent)' : 'var(--text-muted)',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="inline-flex rounded-xl border p-1" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
              {INSIGHT_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setInsightTab(tab.id)}
                  className="px-3 py-1.5 rounded-lg text-sm"
                  style={{
                    background: insightTab === tab.id ? 'var(--accent-dim)' : 'transparent',
                    color: insightTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {(() => {
          const insights = insightTab === 'filtered' ? filteredInsights : allInsights;
          if (insightsLoading && !insights) {
            return <div className="text-sm" style={{ color: 'var(--text-muted)' }}>洞察计算中...</div>;
          }
          if (!insights) {
            return <div className="text-sm" style={{ color: 'var(--text-muted)' }}>暂无洞察数据</div>;
          }

          return (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-xl border p-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>样本记录数</p>
                  <p className="mt-2 text-2xl font-semibold">{insights.total_records}</p>
                </div>
                <div className="rounded-xl border p-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>故障记录数</p>
                  <p className="mt-2 text-2xl font-semibold" style={{ color: 'var(--danger)' }}>{insights.fault_records}</p>
                </div>
                <div className="rounded-xl border p-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>故障率</p>
                  <p className="mt-2 text-2xl font-semibold">{insights.total_records ? `${(insights.fault_records / insights.total_records * 100).toFixed(1)}%` : '0%'}</p>
                </div>
                <div className="rounded-xl border p-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>预警率</p>
                  <p className="mt-2 text-2xl font-semibold" style={{ color: 'var(--warning)' }}>{insights.total_records ? `${(insights.warning_records / insights.total_records * 100).toFixed(1)}%` : '0%'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-xl border p-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                  <p className="text-sm font-medium mb-3">分季度故障数量</p>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={insights.time_buckets}>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                        <XAxis dataKey="label" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                        <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="fault_count" radius={[6, 6, 0, 0]}>
                          {insights.time_buckets.map(item => (
                            <Cell key={item.label} fill={item.fault_rate > 0.2 ? '#ef4444' : '#38bdf8'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl border p-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                  <p className="text-sm font-medium mb-3">分机器人故障率</p>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={insights.robot_buckets} layout="vertical">
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                        <XAxis type="number" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="robot_id" width={80} stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="fault_rate" fill="#f97316" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <p className="text-sm font-medium mb-3">电量与故障/预警相关性</p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={insights.battery_buckets}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis dataKey="label" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                      <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="fault_rate" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="warning_rate" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          );
        })()}
      </section>
    </div>
  );
}
