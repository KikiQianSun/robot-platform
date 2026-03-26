import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { CsvUploadResult, UploadRecord } from '../lib/api'
import Logs from './Logs'
import { filesApi } from '../lib/api'

const openSpy = vi.fn<(url?: string | URL, target?: string, features?: string) => Window | null>(() => null)

vi.mock('../lib/api', () => ({
  filesApi: {
    uploadCsv: vi.fn(),
    history: vi.fn(),
    remove: vi.fn(),
  },
}))

const historyItem: UploadRecord = {
  id: 1,
  original_filename: 'logs.csv',
  file_url: 'http://localhost:8000/api/v1/files/test.csv',
  row_count: 2,
  uploaded_at: '2024-03-15T14:23:01Z',
}

describe('Logs page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('open', openSpy)
    vi.mocked(filesApi.history).mockResolvedValue({ data: [] } as { data: UploadRecord[] })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('uploads csv successfully and shows upload result', async () => {
    vi.mocked(filesApi.uploadCsv).mockResolvedValue({
      data: {
        filename: 'stored.csv',
        url: 'http://localhost:8000/api/v1/files/stored.csv',
        original_filename: 'upload.csv',
        row_count: 1,
        headers: ['robot_id', 'timestamp'],
        preview: [{ robot_id: 'robot_001', timestamp: '2024-03-15T14:23:01Z' }],
        unknown_columns: [],
        errors: [],
        field_specs: [],
      },
    } as { data: CsvUploadResult })

    const { container } = render(<Logs />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['robot_id,timestamp\nrobot_001,2024-03-15T14:23:01Z'], 'upload.csv', { type: 'text/csv' })

    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByText('upload.csv')).toBeInTheDocument()
    expect(screen.getByText(/1 rows/)).toBeInTheDocument()
    expect(filesApi.uploadCsv).toHaveBeenCalledTimes(1)
  })

  it('opens viewer from upload history', async () => {
    vi.mocked(filesApi.history).mockResolvedValue({ data: [historyItem] } as { data: UploadRecord[] })

    render(<Logs />)

    expect(await screen.findByText('logs.csv')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: '浏览数据' }))
    expect(openSpy).toHaveBeenCalledWith('/logs/1/view', '_blank')
  })

  it('opens delete modal and deletes file successfully', async () => {
    vi.useFakeTimers()
    vi.mocked(filesApi.history).mockResolvedValue({ data: [historyItem] } as { data: UploadRecord[] })
    vi.mocked(filesApi.remove).mockResolvedValue({ data: { message: 'File deleted' } } as { data: { message: string } })

    render(<Logs />)

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    await screen.findByText('logs.csv')
    await user.click(screen.getByRole('button', { name: /删除/i }))

    expect(screen.getByText('确认删除文件')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '确认删除' }))

    await waitFor(() => {
      expect(filesApi.remove).toHaveBeenCalledWith(1)
    })
    expect(screen.getByText('已删除文件：logs.csv')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    await waitFor(() => {
      expect(screen.queryByText('已删除文件：logs.csv')).not.toBeInTheDocument()
    })
  })

  it('shows validation modal when upload validation fails', async () => {
    vi.mocked(filesApi.uploadCsv).mockRejectedValue({
      response: {
        data: {
          detail: {
            message: 'Missing required fields',
            missing_fields: ['location_x'],
            unknown_columns: ['extra_col'],
          },
        },
      },
    })

    const { container } = render(<Logs />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['robot_id,timestamp\nrobot_001,2024-03-15T14:23:01Z'], 'invalid.csv', { type: 'text/csv' })

    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByText('CSV 校验失败')).toBeInTheDocument()
    expect(screen.getByText('Missing required fields')).toBeInTheDocument()
    expect(screen.getByText('location_x')).toBeInTheDocument()
  })
})
