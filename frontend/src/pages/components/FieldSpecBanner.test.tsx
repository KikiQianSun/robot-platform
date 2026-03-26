import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FieldSpecBanner } from './FieldSpecBanner';

describe('FieldSpecBanner', () => {
  it('toggles field spec table', async () => {
    const user = userEvent.setup();
    render(<FieldSpecBanner />);

    expect(screen.queryByText('robot_id')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /CSV 格式要求/i }));

    expect(screen.getByText('robot_id')).toBeInTheDocument();
    expect(screen.getByText('error_code')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /CSV 格式要求/i }));

    expect(screen.queryByText('robot_id')).not.toBeInTheDocument();
  });
});
