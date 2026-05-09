import type { FilterType, LayoutType } from '@constants/config';

export interface KitaEvent {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Settings per event
  photoCount: number;        // 1–4
  layoutType: LayoutType;
  countdownSecs: number;
  filterDefault: FilterType;
  autoPrint: boolean;
  printCopies: number;
  cloudinaryFolder?: string;
}

export interface KitaFrame {
  id: string;
  eventId: string;
  name: string;
  filePath: string;          // local path PNG transparan
  thumbnail?: string;        // local thumbnail path
  sortOrder: number;
  isActive: boolean;
  createdAt: string;

  // Metadata
  width?: number;
  height?: number;
  fileSize?: number;
}

export type CreateEventPayload = Omit<KitaEvent, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateEventPayload = Partial<Omit<KitaEvent, 'id' | 'createdAt'>>;

export type CreateFramePayload = Omit<KitaFrame, 'id' | 'createdAt'>;
