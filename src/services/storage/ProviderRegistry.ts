/**
 * ProviderRegistry
 * ─────────────────────────────────────────────────────────────
 * Registri tunggal semua storage provider yang tersedia di app.
 * StorageManager query registry ini untuk mendapat instance provider.
 *
 * Cara tambah provider baru:
 *   1. Buat file providers/MyProvider.ts (implement IStorageProvider)
 *   2. Register di bawah dengan ProviderRegistry.register(...)
 *   3. Selesai — StorageManager & admin panel otomatis kenal provider baru
 */

import type { IStorageProvider }    from './IStorageProvider';
import type { StorageProviderType } from '@kitafoto-types/storage.types';

import { CloudinaryProvider }  from './providers/CloudinaryProvider';
import { GoogleDriveProvider } from './providers/GoogleDriveProvider';
import { FirebaseProvider }    from './providers/FirebaseProvider';
import { SupabaseProvider }    from './providers/SupabaseProvider';

/** Metadata yang ditampilkan di admin panel */
export interface ProviderMeta {
  type: StorageProviderType;
  displayName: string;
  description: string;
  /** Icon emoji untuk admin UI */
  icon: string;
  /** Apakah butuh OAuth interactive */
  requiresOAuth: boolean;
  /** Fields yang butuh diisi di form credentials */
  credentialFields: CredentialField[];
  /** Fitur yang didukung provider ini */
  features: ProviderFeature[];
  /** Apakah siap dipakai (bukan hanya skeleton) */
  isProductionReady: boolean;
}

export interface CredentialField {
  key: string;
  label: string;
  placeholder: string;
  type: 'text' | 'password' | 'url' | 'select';
  required: boolean;
  hint?: string;
  options?: { label: string; value: string }[]; // Untuk type 'select'
}

export type ProviderFeature =
  | 'auto_folder'      // Buat folder otomatis per event/tanggal
  | 'resumable_upload' // Resume upload jika putus
  | 'public_url'       // URL langsung bisa diakses publik
  | 'signed_url'       // URL dengan expired time
  | 'quota_check'      // Bisa cek sisa storage
  | 'delete_file'      // Bisa hapus file dari cloud
  | 'ai_transform'     // Support transformation (Cloudinary)
  | 'oauth';           // Pakai OAuth (bukan static API key)

// ── Singleton Registry ────────────────────────────────────────

class ProviderRegistryClass {
  /** Factory: type → constructor */
  private readonly factories = new Map<
    StorageProviderType,
    new () => IStorageProvider
  >();

  /** Metadata untuk tiap provider type */
  private readonly meta = new Map<StorageProviderType, ProviderMeta>();

  constructor() {
    this.registerAll();
  }

  // ── Registration ───────────────────────────────────────────

  register(
    type: StorageProviderType,
    Factory: new () => IStorageProvider,
    providerMeta: ProviderMeta
  ): void {
    this.factories.set(type, Factory);
    this.meta.set(type, providerMeta);
  }

  // ── Factory ────────────────────────────────────────────────

  /** Buat instance baru provider berdasarkan type */
  create(type: StorageProviderType): IStorageProvider | null {
    const Factory = this.factories.get(type);
    if (!Factory) {
      console.warn(`[ProviderRegistry] Unknown provider type: ${type}`);
      return null;
    }
    return new Factory();
  }

  /** Ambil metadata provider */
  getMeta(type: StorageProviderType): ProviderMeta | null {
    return this.meta.get(type) ?? null;
  }

  /** List semua provider yang terdaftar */
  getAllMeta(): ProviderMeta[] {
    return Array.from(this.meta.values());
  }

  /** List provider yang production-ready */
  getProductionReady(): ProviderMeta[] {
    return this.getAllMeta().filter(m => m.isProductionReady);
  }

  isRegistered(type: StorageProviderType): boolean {
    return this.factories.has(type);
  }

  // ── Register All Providers ─────────────────────────────────

  private registerAll(): void {
    // ── Cloudinary ────────────────────────────────────────
    this.register('cloudinary', CloudinaryProvider, {
      type: 'cloudinary',
      displayName: 'Cloudinary',
      description: 'Cloud media storage dengan CDN global. Mudah setup, free tier besar.',
      icon: '🌤️',
      requiresOAuth: false,
      isProductionReady: true,
      features: ['auto_folder', 'public_url', 'delete_file', 'ai_transform', 'quota_check'],
      credentialFields: [
        {
          key: 'cloudName',
          label: 'Cloud Name',
          placeholder: 'my-cloud-name',
          type: 'text',
          required: true,
          hint: 'Ditemukan di Cloudinary Dashboard → Settings',
        },
        {
          key: 'uploadPreset',
          label: 'Upload Preset',
          placeholder: 'kitafoto_preset',
          type: 'text',
          required: true,
          hint: 'Buat Unsigned Preset di Settings → Upload',
        },
        {
          key: 'folder',
          label: 'Root Folder (opsional)',
          placeholder: 'kitafoto',
          type: 'text',
          required: false,
          hint: 'Folder utama di Cloudinary. Default: kitafoto',
        },
      ],
    });

    // ── Google Drive ──────────────────────────────────────
    this.register('google_drive', GoogleDriveProvider, {
      type: 'google_drive',
      displayName: 'Google Drive',
      description: 'Upload foto ke Google Drive. Mudah diakses owner. Butuh login Google.',
      icon: '📁',
      requiresOAuth: true,
      isProductionReady: true,
      features: ['auto_folder', 'public_url', 'signed_url', 'delete_file', 'quota_check', 'oauth'],
      credentialFields: [
        {
          key: 'clientId',
          label: 'Client ID',
          placeholder: 'xxxxx.apps.googleusercontent.com',
          type: 'text',
          required: true,
          hint: 'Dari Google Cloud Console → Credentials → OAuth 2.0',
        },
        {
          key: 'rootFolderName',
          label: 'Nama Folder Root (opsional)',
          placeholder: 'KitaFoto',
          type: 'text',
          required: false,
          hint: 'Folder utama di Google Drive. Default: KitaFoto',
        },
      ],
    });

    // ── Firebase Storage ──────────────────────────────────
    this.register('firebase_storage', FirebaseProvider, {
      type: 'firebase_storage',
      displayName: 'Firebase Storage',
      description: 'Google Firebase Storage. Terintegrasi dengan ekosistem Firebase.',
      icon: '🔥',
      requiresOAuth: false,
      isProductionReady: false, // Skeleton — Phase 2
      features: ['auto_folder', 'signed_url', 'delete_file', 'resumable_upload'],
      credentialFields: [
        {
          key: 'apiKey',
          label: 'API Key',
          placeholder: 'AIza...',
          type: 'password',
          required: true,
          hint: 'Firebase Console → Project Settings → Web API Key',
        },
        {
          key: 'projectId',
          label: 'Project ID',
          placeholder: 'kitafoto-xxxxx',
          type: 'text',
          required: true,
        },
        {
          key: 'storageBucket',
          label: 'Storage Bucket',
          placeholder: 'kitafoto-xxxxx.appspot.com',
          type: 'text',
          required: true,
        },
        {
          key: 'appId',
          label: 'App ID',
          placeholder: '1:xxxx:android:xxxx',
          type: 'text',
          required: true,
        },
      ],
    });

    // ── Supabase Storage ──────────────────────────────────
    this.register('supabase_storage', SupabaseProvider, {
      type: 'supabase_storage',
      displayName: 'Supabase Storage',
      description: 'Open-source Firebase alternative. Self-hostable.',
      icon: '⚡',
      requiresOAuth: false,
      isProductionReady: false, // Skeleton — Phase 2
      features: ['auto_folder', 'signed_url', 'public_url', 'delete_file', 'resumable_upload'],
      credentialFields: [
        {
          key: 'url',
          label: 'Project URL',
          placeholder: 'https://xxx.supabase.co',
          type: 'url',
          required: true,
          hint: 'Supabase Dashboard → Settings → API',
        },
        {
          key: 'anonKey',
          label: 'Anon Key',
          placeholder: 'eyJ...',
          type: 'password',
          required: true,
          hint: 'Supabase Dashboard → Settings → API → anon public',
        },
        {
          key: 'bucketName',
          label: 'Bucket Name',
          placeholder: 'kitafoto',
          type: 'text',
          required: true,
          hint: 'Buat bucket di Supabase Storage terlebih dahulu',
        },
      ],
    });
  }
}

export const ProviderRegistry = new ProviderRegistryClass();
