import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UploadDropzone } from './UploadDropzone';

describe('UploadDropzone', () => {
  it('renders upload state and delegates interactions', () => {
    const inputRef = createRef<HTMLInputElement>();
    const onDragOver = vi.fn((e: React.DragEvent<HTMLDivElement>) => e.preventDefault());
    const onDragLeave = vi.fn();
    const onDrop = vi.fn((e: React.DragEvent<HTMLDivElement>) => e.preventDefault());
    const onInputChange = vi.fn();

    const { rerender, container } = render(
      <UploadDropzone
        inputRef={inputRef}
        dragging={false}
        uploading={false}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onInputChange={onInputChange}
      />,
    );

    const dropzone = screen.getByText('拖放 CSV 文件到此，或点击浏览').closest('div[class*="cursor-pointer"]') as HTMLDivElement;
    fireEvent.dragOver(dropzone);
    fireEvent.dragLeave(dropzone);
    fireEvent.drop(dropzone, { dataTransfer: { files: [new File(['a'], 'a.csv', { type: 'text/csv' })] } });

    expect(onDragOver).toHaveBeenCalled();
    expect(onDragLeave).toHaveBeenCalled();
    expect(onDrop).toHaveBeenCalled();

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['a'], 'b.csv', { type: 'text/csv' })] } });
    expect(onInputChange).toHaveBeenCalled();

    rerender(
      <UploadDropzone
        inputRef={inputRef}
        dragging
        uploading
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onInputChange={onInputChange}
      />,
    );

    expect(screen.getByText('上传中…')).toBeInTheDocument();
  });
});
