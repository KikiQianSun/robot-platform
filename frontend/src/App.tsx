import { Routes, Route, NavLink } from 'react-router-dom';
import { Bot, Menu, X, FileText } from 'lucide-react';
import { useState } from 'react';
import Logs from './pages/Logs';
import LogViewer from './pages/LogViewer';
import { cn } from './lib/utils';

const NAV = [
  { to: '/', label: 'Logs', icon: FileText },
];

export default function App() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col w-60 border-r transition-transform duration-200',
          'md:relative md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
            <Bot size={18} style={{ color: 'var(--accent)' }} />
          </div>
          <span className="font-semibold tracking-tight text-sm" style={{ color: 'var(--text-primary)' }}>Robot Platform</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              onClick={() => setOpen(false)}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'text-[var(--accent)] bg-[var(--accent-dim)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              )}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 text-xs border-t" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          v1.0.0 · Robot Platform
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setOpen(false)} />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-3 px-4 py-3 border-b md:hidden" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <button onClick={() => setOpen(!open)} style={{ color: 'var(--text-muted)' }}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="font-semibold text-sm">Robot Platform</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Routes>
            <Route path="/" element={<Logs />} />
            <Route path="/logs/:id/view" element={<LogViewer />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
