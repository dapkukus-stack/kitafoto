/**
 * ErrorBoundary — Global crash catcher
 * ─────────────────────────────────────────────────────────────
 * Wraps the entire app. Catches unhandled JS render errors that
 * would otherwise show a white screen / crash to launcher.
 *
 * On crash:
 *   1. Logs full error + stack to DiagnosticsService (fatal severity)
 *   2. Shows friendly recovery UI with mascot
 *   3. Offers "Restart" button that resets state and re-mounts app
 *   4. Shows last error message for admin debugging
 *
 * Also sets up global handlers for:
 *   • Unhandled Promise rejections (ErrorUtils on RN)
 *   • Native module exceptions via global error handler
 *
 * Design:
 *   • Class component (React error boundaries require componentDidCatch)
 *   • Minimal dependencies — must work even if stores/services are broken
 *   • Recovery = reset state + re-render children (no full app restart)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { DiagnosticsService } from '@services/diagnostics/DiagnosticsService';

// ── Types ────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
  crashCount: number;
}

// ═══════════════════════════════════════════════════════════════

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      crashCount: 0,
    };
  }

  // ── Lifecycle: Catch Errors ────────────────────────────────

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const stack = info?.componentStack ?? 'No component stack available';
    const truncatedStack = stack.substring(0, 800);

    // Log to DiagnosticsService (fire-and-forget, SQLite-backed)
    DiagnosticsService.fatal('error', `Unhandled render crash: ${error.message}`, {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 500) ?? 'no stack',
      componentStack: truncatedStack,
      crashCount: this.state.crashCount + 1,
    });

    this.setState(prev => ({
      errorInfo: truncatedStack,
      crashCount: prev.crashCount + 1,
    }));

    // Also log to console for ADB logcat
    console.error('[ErrorBoundary] FATAL CRASH:', error.message);
    console.error('[ErrorBoundary] Component stack:', truncatedStack);
  }

  componentDidMount(): void {
    this.setupGlobalHandlers();
  }

  // ── Global handlers (Promise rejections, native errors) ────

  private setupGlobalHandlers(): void {
    // Unhandled Promise Rejections
    const originalHandler = (globalThis as any).ErrorUtils?.getGlobalHandler?.();

    (globalThis as any).ErrorUtils?.setGlobalHandler?.((error: Error, isFatal?: boolean) => {
      DiagnosticsService.log(
        'error',
        isFatal ? 'fatal' : 'error',
        `Global ${isFatal ? 'fatal' : 'unhandled'}: ${error?.message ?? 'unknown'}`,
        {
          name: error?.name,
          stack: error?.stack?.substring(0, 500),
          isFatal,
        }
      );

      // Call original handler (shows RN red screen in dev)
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });

    // Promise rejection tracking (React Native exposes this)
    if (typeof (globalThis as any).addEventListener === 'function') {
      (globalThis as any).addEventListener('unhandledrejection', (event: any) => {
        const reason = event?.reason;
        DiagnosticsService.error('error', `Unhandled Promise rejection: ${reason?.message ?? String(reason)}`, {
          reason: String(reason).substring(0, 300),
        });
      });
    }
  }

  // ── Recovery ───────────────────────────────────────────────

  private handleRestart = (): void => {
    DiagnosticsService.info('system', 'User triggered restart from ErrorBoundary');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  // ── Render ─────────────────────────────────────────────────

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        {/* Mascot / Icon */}
        <Text style={styles.emoji}>😢</Text>

        {/* Title */}
        <Text style={styles.title}>Oops! Ada masalah</Text>
        <Text style={styles.subtitle}>
          KitaFoto mengalami error yang tidak terduga.
        </Text>

        {/* Error details (for admin) */}
        <ScrollView style={styles.errorBox} contentContainerStyle={styles.errorBoxContent}>
          <Text style={styles.errorLabel}>Error:</Text>
          <Text style={styles.errorText}>
            {this.state.error?.message ?? 'Unknown error'}
          </Text>
          {this.state.errorInfo && (
            <>
              <Text style={styles.errorLabel}>Lokasi:</Text>
              <Text style={styles.errorText}>
                {this.state.errorInfo.substring(0, 300)}
              </Text>
            </>
          )}
        </ScrollView>

        {/* Crash count */}
        {this.state.crashCount > 1 && (
          <Text style={styles.crashCount}>
            ⚠️ Crash ke-{this.state.crashCount} sesi ini
          </Text>
        )}

        {/* Actions */}
        <TouchableOpacity style={styles.restartBtn} onPress={this.handleRestart}>
          <Text style={styles.restartBtnText}>🔄 Coba Lagi</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          Jika masalah berulang, restart aplikasi atau hubungi operator.
        </Text>

        {/* Version info */}
        <Text style={styles.version}>KitaFoto v1.0.0</Text>
      </View>
    );
  }
}
// Note: React.ErrorInfo is not in our minimal stubs, but the runtime provides it.
// The componentDidCatch second argument is typed as any to be safe with our ambient declarations.

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A237E',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#546E7A',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorBox: {
    maxHeight: 150,
    width: '100%',
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    marginBottom: 16,
  },
  errorBoxContent: {
    padding: 12,
  },
  errorLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C62828',
    marginBottom: 2,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#B71C1C',
    fontFamily: 'monospace',
  },
  crashCount: {
    fontSize: 13,
    color: '#E65100',
    fontWeight: '600',
    marginBottom: 16,
  },
  restartBtn: {
    backgroundColor: '#4FC3F7',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#0288D1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  restartBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    color: '#90A4AE',
    textAlign: 'center',
    marginBottom: 12,
  },
  version: {
    fontSize: 11,
    color: '#B0BEC5',
    position: 'absolute',
    bottom: 16,
  },
});
