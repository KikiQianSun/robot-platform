import axios from 'axios';

const BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8000/api/v1'
  : 'https://robot-platform-eight.vercel.app/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

export interface UploadRecord {
  id: number;
  original_filename: string;
  file_url: string;
  row_count: number;
  uploaded_at: string;
}

export interface CsvValidationError {
  row: number;
  field: string;
  raw_value: string;
  reason: string;
}

export interface CsvFieldSpec {
  field: string;
  type: string;
  rule: string;
  example: string;
}

export interface CsvUploadResult {
  filename: string;
  url: string;
  original_filename: string;
  row_count: number;
  headers: string[];
  preview: Record<string, string>[];
  unknown_columns: string[];
  errors: CsvValidationError[];
  field_specs: CsvFieldSpec[];
}

export interface CsvValidationDetail {
  message: string;
  errors?: CsvValidationError[];
  missing_fields?: string[];
  unknown_columns?: string[];
}

export interface UploadRecordRow {
  robot_id: string;
  timestamp: string;
  location_x: number;
  location_y: number;
  battery_level: number;
  device_a_status: string;
  device_b_status: string;
  speed: number;
  error_code: number | null;
}

export interface UploadRecordRowsParams {
  robot_id?: string;
  start_time?: string;
  end_time?: string;
  device_status?: string;
  device_b_status?: string;
  error_code?: string;
  error_only?: boolean;
  page?: number;
  page_size?: number;
}

export interface UploadRecordRowsResponse {
  record_id: number;
  original_filename: string;
  total: number;
  page: number;
  page_size: number;
  items: UploadRecordRow[];
}

export interface InsightTimeBucket {
  label: string;
  total_records: number;
  fault_count: number;
  fault_rate: number;
  warning_count: number;
  warning_rate: number;
}

export interface InsightRobotBucket {
  robot_id: string;
  total_records: number;
  fault_count: number;
  fault_rate: number;
  warning_count: number;
  warning_rate: number;
}

export interface InsightBatteryBucket {
  label: string;
  total_records: number;
  fault_count: number;
  fault_rate: number;
  warning_count: number;
  warning_rate: number;
}

export interface UploadRecordInsightsResponse {
  record_id: number;
  original_filename: string;
  scope: 'filtered' | 'all';
  time_window: '6m' | '1y' | '2y';
  total_records: number;
  fault_records: number;
  warning_records: number;
  time_buckets: InsightTimeBucket[];
  robot_buckets: InsightRobotBucket[];
  battery_buckets: InsightBatteryBucket[];
}

export const filesApi = {
  uploadCsv: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<CsvUploadResult>('/files/upload/csv', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  history: () => api.get<UploadRecord[]>('/files/history'),
  getRows: (id: number, params: UploadRecordRowsParams) => api.get<UploadRecordRowsResponse>(`/files/history/${id}/rows`, { params }),
  getInsights: (id: number, params: UploadRecordRowsParams & { scope: 'filtered' | 'all'; time_window: '6m' | '1y' | '2y' }) => api.get<UploadRecordInsightsResponse>(`/files/history/${id}/insights`, { params }),
  remove: (id: number) => api.delete(`/files/history/${id}`),
};
