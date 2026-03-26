import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { STATIC_FIELD_SPECS } from './constants';

export function FieldSpecBanner() {
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
        {expanded ? <ChevronUp size={14} style={{ color: '#fbbf24', flexShrink: 0 }} /> : <ChevronDown size={14} style={{ color: '#fbbf24', flexShrink: 0 }} />}
      </button>
      {expanded && (
        <div className="overflow-x-auto border-t" style={{ borderColor: '#92400e' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'rgba(120,53,15,0.25)' }}>
                {['列名', '示例值'].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-semibold whitespace-nowrap" style={{ color: '#fde68a', borderBottom: '1px solid #92400e' }}>{h}</th>
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
