/**
 * File utilities untuk KitaFoto
 */

import * as FileSystem from 'expo-file-system';

export const Dirs = {
  photos: `${FileSystem.documentDirectory}kitafoto/photos/`,
  frames: `${FileSystem.documentDirectory}kitafoto/frames/`,
  thumbnails: `${FileSystem.documentDirectory}kitafoto/thumbnails/`,
  cache: `${FileSystem.cacheDirectory}kitafoto/`,
  sessionCache: `${FileSystem.cacheDirectory}kitafoto/sessions/`,
};

export async function ensureAllDirs(): Promise<void> {
  await Promise.all(
    Object.values(Dirs).map((dir) =>
      FileSystem.makeDirectoryAsync(dir, { intermediates: true })
    )
  );
}

export async function getFileSizeMB(uri: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(uri, { size: true });
    const sizeBytes = (info as { size?: number }).size ?? 0;
    return sizeBytes / (1024 * 1024);
  } catch {
    return 0;
  }
}

export async function getDirectorySizeMB(dirUri: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(dirUri, { size: true });
    if (!info.exists) return 0;
    const sizeBytes = (info as { size?: number }).size ?? 0;
    return sizeBytes / (1024 * 1024);
  } catch {
    return 0;
  }
}

export async function deleteFile(uri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // ignore
  }
}

export async function copyFile(from: string, to: string): Promise<void> {
  await FileSystem.copyAsync({ from, to });
}

export async function moveFile(from: string, to: string): Promise<void> {
  await FileSystem.moveAsync({ from, to });
}

export function getFileName(uri: string): string {
  return uri.split('/').pop() ?? '';
}

export function getFileExtension(uri: string): string {
  const name = getFileName(uri);
  return name.includes('.') ? name.split('.').pop()?.toLowerCase() ?? '' : '';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
