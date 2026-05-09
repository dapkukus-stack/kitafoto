/**
 * Date utilities — menggunakan built-in Date, tanpa dependency berat
 */

export function formatDate(isoString: string, locale = 'id-ID'): string {
  return new Date(isoString).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateTime(isoString: string, locale = 'id-ID'): string {
  return new Date(isoString).toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(isoString: string, locale = 'id-ID'): string {
  return new Date(isoString).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toDateFolder(date = new Date()): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

export function isOlderThanDays(isoString: string, days: number): boolean {
  const date = new Date(isoString);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return date < cutoff;
}

export function now(): string {
  return new Date().toISOString();
}

export function getRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  return `${days} hari lalu`;
}
