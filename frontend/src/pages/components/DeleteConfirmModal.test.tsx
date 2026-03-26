import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DeleteConfirmModal } from './DeleteConfirmModal';

describe('DeleteConfirmModal', () => {
  it('renders file name and triggers callbacks', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(<DeleteConfirmModal fileName="logs.csv" deleting={false} onConfirm={onConfirm} onClose={onClose} />);

    expect(screen.getByText('确认删除文件')).toBeInTheDocument();
    expect(screen.getByText('logs.csv')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '取消' }));
    await user.click(screen.getByRole('button', { name: '确认删除' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows deleting state', () => {
    render(<DeleteConfirmModal fileName="logs.csv" deleting onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: '删除中…' })).toBeDisabled();
  });
});
