export type UploadJobStatus = 'pending' | 'uploading' | 'done' | 'failed';

export interface UploadJob {
  id: string;
  photoId: string;
  status: UploadJobStatus;
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: string;     // ISO timestamp untuk exponential backoff
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  uploadedAt?: string;
  cloudUrl?: string;
}

export interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
  rootFolder: string;
}

export interface UploadResult {
  success: boolean;
  cloudUrl?: string;
  publicId?: string;
  error?: string;
}

export type CreateUploadJobPayload = Omit<UploadJob, 'id' | 'createdAt' | 'updatedAt'>;
