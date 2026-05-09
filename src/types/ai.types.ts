/**
 * AI Feature Types — Placeholder untuk upgrade nanti
 * Phase 2: AI Beautify, Background Replace
 * Phase 3: Style Transfer (Anime/Roblox), Auto Sticker
 */

export type AIFeature =
  | 'beautify'        // Face smoothing & enhancement
  | 'background'      // Background replacement
  | 'anime_style'     // Anime style filter
  | 'roblox_style'    // Roblox-like style
  | 'auto_sticker';   // AI auto-place stickers

export interface AIBeautifyOptions {
  intensity: number;      // 0–1 (0 = off, 1 = max)
  smoothSkin: boolean;
  brightenFace: boolean;
  enlargeEyes: boolean;
}

export interface AIBackgroundOptions {
  backgroundImage?: string;   // Path to background image
  backgroundColor?: string;   // Solid color fallback
  blur?: number;              // Background blur radius
}

export interface AIStyleOptions {
  style: 'anime' | 'roblox' | 'cartoon';
  intensity: number;          // 0–1
}

export interface AIStickerOptions {
  stickerPack: string;        // ID of sticker pack
  autoPlace: boolean;
  maxStickers: number;
}

export interface AIProcessResult {
  success: boolean;
  outputPath?: string;
  processingTimeMs?: number;
  error?: string;
}

// Feature flags — diisi dari env / admin toggle
export interface AIFeatureFlags {
  beautifyEnabled: boolean;
  backgroundEnabled: boolean;
  styleEnabled: boolean;
  stickerEnabled: boolean;
}
