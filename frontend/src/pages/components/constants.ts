import type { CsvFieldSpec } from '../../lib/api';

export const STATIC_FIELD_SPECS: CsvFieldSpec[] = [
  { field: 'robot_id', type: 'string', rule: 'Pattern: robot_XXX (3 digits)', example: 'robot_001' },
  { field: 'timestamp', type: 'string', rule: 'ISO 8601 (e.g. 2024-03-15T14:23:01Z)', example: '2024-03-15T14:23:01Z' },
  { field: 'location_x', type: 'float', rule: 'Any numeric value', example: '12.34' },
  { field: 'location_y', type: 'float', rule: 'Any numeric value', example: '-5.67' },
  { field: 'battery_level', type: 'int', rule: 'Integer 0–100', example: '85' },
  { field: 'device_a_status', type: 'string', rule: 'Enum: ok | warning | error', example: 'ok/warning/error' },
  { field: 'device_b_status', type: 'string', rule: 'Enum: ok | warning | error', example: 'ok/warning/error' },
  { field: 'speed', type: 'float', rule: 'Non-negative number (m/s)', example: '1.5' },
  { field: 'error_code', type: 'int | null', rule: 'Integer or empty (null when no error)', example: '400（或空值）' },
];
