import type { PrinterType } from '@constants/config';

export type PrintJobStatus = 'pending' | 'printing' | 'done' | 'failed' | 'cancelled';

export interface PrintJob {
  id: string;
  photoId: string;
  status: PrintJobStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  printedAt?: string;
}

export interface PrinterConfig {
  type: PrinterType;
  ip?: string;              // Jika wifi/bridge
  port?: number;            // Default 9100
  name?: string;            // Nama printer untuk display
  isConnected: boolean;
}

export interface PrintResult {
  success: boolean;
  error?: string;
  jobId?: string;
}

export type CreatePrintJobPayload = Omit<PrintJob, 'id' | 'createdAt' | 'updatedAt'>;
