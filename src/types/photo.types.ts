import type { FilterType, LayoutType } from '@constants/config';

export type PhotoUploadStatus = 'pending' | 'uploading' | 'done' | 'failed';
export type PhotoPrintStatus = 'pending' | 'printing' | 'done' | 'failed' | 'skipped';

export interface KitaPhoto {
  id: string;
  eventId: string;
  frameId: string;
  sessionId: string;         // Grup foto 1 sesi (bisa 1–4 foto)

  // File paths (lokal)
  rawPath?: string;          // Foto mentah dari kamera
  processedPath?: string;    // Foto + frame sudah composite
  printPath?: string;        // Versi untuk print
  cloudUrl?: string;         // URL setelah upload Cloudinary

  // Metadata
  filterApplied: FilterType;
  layoutType: LayoutType;
  photoCount: number;

  // Status
  uploadStatus: PhotoUploadStatus;
  printStatus: PhotoPrintStatus;

  createdAt: string;
  uploadedAt?: string;
  printedAt?: string;
}

export interface PhotoSession {
  sessionId: string;
  eventId: string;
  frameId: string;
  photos: CapturedPhoto[];   // Foto mentah belum diproses
  layoutType: LayoutType;
  filterType: FilterType;
}

export interface CapturedPhoto {
  index: number;             // 0, 1, 2, 3
  filePath: string;
  capturedAt: string;
}

export type CreatePhotoPayload = Omit<KitaPhoto, 'id' | 'createdAt'>;
