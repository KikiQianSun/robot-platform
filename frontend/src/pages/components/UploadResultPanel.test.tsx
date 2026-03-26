import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CsvUploadResult } from '../../lib/api';
import { UploadResultPanel } from './UploadResultPanel';

const result: CsvUploadResult = {
  filename: 'stored.csv',
  url: 'http://localhost:8000/api/v1/files/stored.csv',
  original_filename: 'upload.csv',
  row_count: 2,
  headers: ['robot_id', 'timestamp'],
  preview: [{ robot_id: 'robot_001', timestamp: '2024-03-15T14:23:01Z' }],
  unknown_columns: ['extra_col'],
  errors: [],
  field_specs: [],
};

describe('UploadResultPanel', () => {
  it('renders upload summary, warnings and preview', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();

    render(<UploadResultPanel result={result} onReset={onReset} />);

    expect(screen.getByText('upload.csv')).toBeInTheDocument();
    expect(screen.getByText(/2 rows/)).toBeInTheDocument();
    expect(screen.getByText('extra_col')).toBeInTheDocument();
    expect(screen.getByText('robot_001')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
