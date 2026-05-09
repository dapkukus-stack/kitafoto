export type CameraStatus =
  | 'disconnected'
  | 'connecting'
  | 'ready'
  | 'capturing'
  | 'error';

export interface CameraDevice {
  id: string;
  name: string;
  isUSBDevice: boolean;
  position?: 'front' | 'back' | 'external';
}

export interface CaptureOptions {
  quality?: number;      // 0–1
  maxWidth?: number;
  maxHeight?: number;
  flash?: 'on' | 'off' | 'auto';
}

export interface CaptureResult {
  success: boolean;
  filePath?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  error?: string;
}
