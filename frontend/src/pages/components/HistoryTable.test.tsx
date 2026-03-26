import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { UploadRecord } from '../../lib/api';
import { HistoryTable } from './HistoryTable';

const item: UploadRecord = {
  id: 1,
  original_filename: 'logs.csv',
  file_url: 'http://localhost/file.csv',
  row_count: 10,
  uploaded_at: '2024-03-15T14:23:01Z',
};

describe('HistoryTable', () => {
  it('renders empty and loading states', () => {
    const { rerender } = render(<HistoryTable history={[]} loading onBrowse={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();

    rerender(<HistoryTable history={[]} loading={false} onBrowse={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('暂无历史上传记录')).toBeInTheDocument();
  });

  it('renders records and delegates actions', async () => {
    const user = userEvent.setup();
    const onBrowse = vi.fn();
    const onDelete = vi.fn();

    render(<HistoryTable history={[item]} loading={false} onBrowse={onBrowse} onDelete={onDelete} />);

    expect(screen.getByText('logs.csv')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '浏览数据' }));
    await user.click(screen.getByRole('button', { name: /删除/i }));

    expect(onBrowse).toHaveBeenCalledWith(item);
    expect(onDelete).toHaveBeenCalledWith(item);
  });
});
