/**
 * DebugOverlay — Hidden performance HUD
 * ─────────────────────────────────────────────────────────────
 * Floating overlay showing real-time performance metrics.
 * Access: Admin panel → tap version label 10x (or logo 10x from Home).
 *
 * Shows:
 *   • FPS (current / avg / min)
 *   • RAM usage (current / peak)
 *   • JS thread health (healthy / jank count)
 *   • Queue sizes (print pending, upload pending)
 *   • Camera status
 *   • Uptime
 *   • Last error
 *
 * Design:
 *   • Semi-transparent floating panel (top-left)
 *   • Does NOT block touch events on main UI (pointerEvents="none" on bg)
 *   • Updates every 1 second via PerformanceMonitor subscription
 *   • Draggable to reposition (future enhancement)
 *   • Close button to dismiss
 *   • Minimal render: only Text updates, no layout recalc
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PerformanceMonitor } from '@services/diagnostics/PerformanceMonitor';
import { useAppStore } from '@store/useAppStore';
import type { PerfStats } from '@services/diagnostics/PerformanceMonitor';
import { DiagnosticsService } from '@services/diagnostics/DiagnosticsService';

interface DebugOverlayProps {
  visible: boolean;
  onClose: () => void;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({ visible, onClose }) => {
  const [stats, setStats] = useState<PerfStats | null>(null);
  const { cameraStatus, pendingPrintCount, pendingUploadCount, isOnline } = useAppStore();

  useEffect(() => {
    if (!visible) return;

    // Subscribe to perf updates
    const unsubscribe = PerformanceMonitor.subscribe(setStats);

    // Initial read
    setStats(PerformanceMonitor.getStats());

    return unsubscribe;
  }, [visible]);

  const handleExport = useCallback(async () => {
    try {
      const json = await DiagnosticsService.exportJSON();
      // In real device: share via Share API or save to file
      console.log('[DebugOverlay] Diagnostics export:', json.substring(0, 200) + '...');
      DiagnosticsService.info('system', 'Diagnostics exported from debug overlay');
    } catch (e) {
      console.error('[DebugOverlay] Export failed:', e);
    }
  }, []);

  if (!visible || !stats) return null;

  const fpsColor  = stats.fps >= 50 ? '#4CAF50' : stats.fps >= 30 ? '#FF9800' : '#F44336';
  const ramColor  = stats.memoryMB < 150 ? '#4CAF50' : stats.memoryMB < 250 ? '#FF9800' : '#F44336';
  const jsColor   = stats.jsThreadHealthy ? '#4CAF50' : '#F44336';

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.panel}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🔧 DEBUG</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity onPress={handleExport} style={styles.exportBtn}>
              <Text style={styles.exportBtnText}>📤</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FPS */}
        <View style={styles.row}>
          <Text style={styles.label}>FPS</Text>
          <Text style={[styles.value, { color: fpsColor }]}>
            {stats.fps} / avg {stats.avgFps} / min {stats.minFps}
          </Text>
        </View>

        {/* Memory */}
        <View style={styles.row}>
          <Text style={styles.label}>RAM</Text>
          <Text style={[styles.value, { color: ramColor }]}>
            {stats.memoryMB > 0 ? `${stats.memoryMB}MB / peak ${stats.peakMemoryMB}MB` : 'N/A'}
          </Text>
        </View>

        {/* JS Thread */}
        <View style={styles.row}>
          <Text style={styles.label}>JS</Text>
          <Text style={[styles.value, { color: jsColor }]}>
            {stats.jsThreadHealthy ? '✓ healthy' : '⚠ blocked'} · janks: {stats.jankCount}
          </Text>
        </View>

        {/* Queues */}
        <View style={styles.row}>
          <Text style={styles.label}>Queue</Text>
          <Text style={styles.value}>
            🖨 {pendingPrintCount} · ☁ {pendingUploadCount}
          </Text>
        </View>

        {/* Camera */}
        <View style={styles.row}>
          <Text style={styles.label}>Cam</Text>
          <Text style={[styles.value, { color: cameraStatus === 'ready' ? '#4CAF50' : '#FF9800' }]}>
            {cameraStatus}
          </Text>
        </View>

        {/* Network */}
        <View style={styles.row}>
          <Text style={styles.label}>Net</Text>
          <Text style={[styles.value, { color: isOnline ? '#4CAF50' : '#F44336' }]}>
            {isOnline ? '● online' : '○ offline'}
          </Text>
        </View>

        {/* Uptime */}
        <View style={styles.row}>
          <Text style={styles.label}>Up</Text>
          <Text style={styles.value}>
            {formatUptime(stats.uptimeSeconds)}
          </Text>
        </View>
      </View>
    </View>
  );
};

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  panel: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    borderRadius: 8,
    padding: 8,
    minWidth: 220,
    maxWidth: 280,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 4,
  },
  title: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  exportBtn: {
    padding: 2,
  },
  exportBtnText: {
    fontSize: 14,
  },
  closeBtn: {
    padding: 2,
  },
  closeBtnText: {
    color: '#FF5252',
    fontSize: 14,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '600',
    width: 36,
  },
  value: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },
});
