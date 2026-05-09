/**
 * CloudinaryService
 * Upload foto ke Cloudinary dengan folder per event/tanggal
 * Menggunakan unsigned upload preset (tidak perlu API secret di client)
 */

import * as FileSystem from 'expo-file-system';
import type { UploadResult } from '@types/upload.types';
import { AppConfig, CloudinaryConfig } from '@constants/config';
import { db } from '@database/DatabaseService';

interface UploadOptions {
  eventId: string;
  eventName: string;
  sessionId: string;
  photoId: string;
}

class CloudinaryServiceClass {
  private cloudName = '';
  private uploadPreset = '';

  async initialize(): Promise<void> {
    this.cloudName = (await db.getSetting('cloudinary_cloud_name')) ?? '';
    this.uploadPreset = (await db.getSetting('cloudinary_upload_preset')) ?? '';
  }

  isConfigured(): boolean {
    return !!(this.cloudName && this.uploadPreset);
  }

  private getUploadUrl(): string {
    return `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;
  }

  private getFolder(eventId: string, eventName: string): string {
    const eventFolder = CloudinaryConfig.getEventFolder(eventId, eventName);
    const dateFolder = CloudinaryConfig.getDateFolder(new Date());
    return `${CloudinaryConfig.rootFolder}/${eventFolder}/${dateFolder}`;
  }

  async uploadPhoto(
    localFilePath: string,
    options: UploadOptions
  ): Promise<UploadResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Cloudinary belum dikonfigurasi' };
    }

    const folder = this.getFolder(options.eventId, options.eventName);
    const publicId = `photo_${options.sessionId}`;

    try {
      // Buat FormData untuk upload
      const formData = new FormData();

      // Append file
      formData.append('file', {
        uri: localFilePath,
        type: 'image/jpeg',
        name: `${publicId}.jpg`,
      } as unknown as Blob);

      formData.append('upload_preset', this.uploadPreset);
      formData.append('folder', folder);
      formData.append('public_id', publicId);
      formData.append('quality', String(Math.round(AppConfig.uploadQuality * 100)));
      formData.append('tags', JSON.stringify(['kitafoto', options.eventId]));

      const response = await fetch(this.getUploadUrl(), {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `Upload gagal: ${response.status} ${errorText}` };
      }

      const result = await response.json() as {
        secure_url: string;
        public_id: string;
      };

      return {
        success: true,
        cloudUrl: result.secure_url,
        publicId: result.public_id,
      };

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: msg };
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const response = await fetch(
        `https://res.cloudinary.com/${this.cloudName}/image/upload/sample`,
        { method: 'HEAD' }
      );
      return response.ok || response.status === 404; // 404 = cloud exists, sample tidak ada
    } catch {
      return false;
    }
  }

  async reloadConfig(): Promise<void> {
    await this.initialize();
  }
}

export const CloudinaryService = new CloudinaryServiceClass();
