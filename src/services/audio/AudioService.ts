/**
 * AudioService
 * Manage semua sound effects & musik background KitaFoto
 */

import { Audio } from 'expo-av';
import { AppConfig } from '@constants/config';

type SoundKey =
  | 'countdown_beep'
  | 'countdown_go'
  | 'shutter'
  | 'print_done'
  | 'success_jingle'
  | 'ambience';

const SOUND_ASSETS: Record<SoundKey, number> = {
  countdown_beep: require('../../../assets/sounds/countdown-beep.mp3'),
  countdown_go:   require('../../../assets/sounds/countdown-go.mp3'),
  shutter:        require('../../../assets/sounds/shutter.mp3'),
  print_done:     require('../../../assets/sounds/print-done.mp3'),
  success_jingle: require('../../../assets/sounds/success-jingle.mp3'),
  ambience:       require('../../../assets/sounds/ambience-fun.mp3'),
};

class AudioServiceClass {
  private sounds: Partial<Record<SoundKey, Audio.Sound>> = {};
  private ambienceSound: Audio.Sound | null = null;
  private isMuted = false;
  private isAmbienceEnabled = true;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });

    // Preload SFX penting saja (hemat memory)
    const preloadKeys: SoundKey[] = ['countdown_beep', 'countdown_go', 'shutter', 'success_jingle'];

    await Promise.all(
      preloadKeys.map(async (key) => {
        try {
          const { sound } = await Audio.Sound.createAsync(SOUND_ASSETS[key], {
            volume: AppConfig.sfxVolume,
          });
          this.sounds[key] = sound;
        } catch (error) {
          console.warn(`[Audio] Failed to preload ${key}:`, error);
        }
      })
    );

    this.initialized = true;
    console.log('[Audio] AudioService initialized ✓');
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.stopAmbience();
    } else if (this.isAmbienceEnabled) {
      this.playAmbience();
    }
  }

  setAmbienceEnabled(enabled: boolean): void {
    this.isAmbienceEnabled = enabled;
    if (enabled && !this.isMuted) {
      this.playAmbience();
    } else {
      this.stopAmbience();
    }
  }

  async play(key: SoundKey): Promise<void> {
    if (this.isMuted || key === 'ambience') return;

    try {
      const sound = this.sounds[key];
      if (sound) {
        await sound.replayAsync();
      } else {
        // Lazy load jika belum dipreload
        const { sound: newSound } = await Audio.Sound.createAsync(
          SOUND_ASSETS[key],
          { volume: AppConfig.sfxVolume, shouldPlay: true }
        );
        this.sounds[key] = newSound;
      }
    } catch (error) {
      console.warn(`[Audio] Failed to play ${key}:`, error);
    }
  }

  async playCountdownBeep(): Promise<void> {
    await this.play('countdown_beep');
  }

  async playCountdownGo(): Promise<void> {
    await this.play('countdown_go');
  }

  async playShutter(): Promise<void> {
    await this.play('shutter');
  }

  async playPrintDone(): Promise<void> {
    await this.play('print_done');
  }

  async playSuccessJingle(): Promise<void> {
    await this.play('success_jingle');
  }

  async playAmbience(): Promise<void> {
    if (this.isMuted || !this.isAmbienceEnabled) return;

    try {
      if (this.ambienceSound) return; // Sudah main

      const { sound } = await Audio.Sound.createAsync(
        SOUND_ASSETS['ambience'],
        {
          volume: AppConfig.ambienceVolume,
          isLooping: true,
          shouldPlay: true,
        }
      );
      this.ambienceSound = sound;
    } catch (error) {
      console.warn('[Audio] Failed to play ambience:', error);
    }
  }

  async stopAmbience(): Promise<void> {
    try {
      if (this.ambienceSound) {
        await this.ambienceSound.stopAsync();
        await this.ambienceSound.unloadAsync();
        this.ambienceSound = null;
      }
    } catch {
      // ignore
    }
  }

  async cleanup(): Promise<void> {
    await this.stopAmbience();
    for (const [key, sound] of Object.entries(this.sounds)) {
      try {
        await (sound as Audio.Sound).unloadAsync();
      } catch {
        console.warn(`[Audio] Failed to unload ${key}`);
      }
    }
    this.sounds = {};
    this.initialized = false;
  }
}

export const AudioService = new AudioServiceClass();
