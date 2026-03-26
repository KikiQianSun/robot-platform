import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CsvValidationDetail } from '../../lib/api';
import { ValidationErrorModal } from './ValidationErrorModal';

const detail: CsvValidationDetail = {
  message: 'Missing required fields',
  missing_fields: ['location_x'],
  unknown_columns: ['extra_col'],
  errors: [{ row: 2, field: 'battery_level', raw_value: 'abc', reason: 'must be int' }],
};

describe('ValidationErrorModal', () => {
  it('renders validation detail and closes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<ValidationErrorModal detail={detail} onClose={onClose} />);

    expect(screen.getByText('CSV 校验失败')).toBeInTheDocument();
    expect(screen.getByText('location_x')).toBeInTheDocument();
    expect(screen.getByText('extra_col')).toBeInTheDocument();
    expect(screen.getByText('must be int')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '关闭' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
