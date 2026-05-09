/**
 * FramePickerScreen
 * ─────────────────────────────────────────────────────────────
 * Grid pilih frame foto — ringan untuk 20–50 frame per event.
 *
 * Memory-safe design:
 *   • FlatList dengan windowSize=3, removeClippedSubviews=true
 *   • Lazy load thumbnail — hanya load saat item masuk viewport
 *   • Image cache via FastImage atau RN Image cache
 *   • Thumbnail kecil (200px) bukan full-size PNG
 *   • Auto-timeout 30 detik → kembali Home
 *   • Tidak ada bitmap di React state, hanya URI string
 *
 * UX child-friendly:
 *   • Tombol besar, tap area min 80×80dp
 *   • Highlight + scale animasi saat dipilih
 *   • Skeleton loading placeholder
 *   • Pesan ramah jika belum ada frame
 */

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { v4 as uuidv4 } from 'react-native-uuid';
import { Colors } from '@constants/colors';
import { UserTypography, AdminTypography } from '@constants/typography';
import { Spacing, Shadow, Radius } from '@constants/dimensions';
import { AppConfig } from '@constants/config';
import { Routes } from '@constants/routes';
import { KitaButton } from '@components/common/KitaButton';
import { Mascot } from '@components/common/Mascot';
import { useSessionStore } from '@store/useSessionStore';
import { useEventStore } from '@store/useEventStore';
import { FrameRepository } from '@database/repositories/EventRepository';
import type { KitaFrame } from '@types/event.types';

const { width: SW } = Dimensions.get('window');

// ── Grid dimensions ───────────────────────────────────────────
const COLS         = AppConfig.frameGridColumns; // 4
const CARD_GAP     = 12;
const SIDE_PAD     = Spacing.lg;
const CARD_W       = (SW - SIDE_PAD * 2 - CARD_GAP * (COLS - 1)) / COLS;
const CARD_H       = CARD_W * 1.4; // 4:5.6 ratio — strip photobooth

// ── Auto-timeout ke Home ──────────────────────────────────────
const IDLE_TIMEOUT_MS = AppConfig.framepickerTimeoutMs; // 30 000

// ─────────────────────────────────────────────────────────────

export const FramePickerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { activeEvent } = useEventStore();
  const { startSession } = useSessionStore();

  const [frames, setFrames]           = useState<KitaFrame[]>([]);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [isLoading, setIsLoading]     = useState(true);

  // Idle timeout ref — reset setiap interaksi user
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Lifecycle ──────────────────────────────────────────────

  useEffect(() => {
    loadFrames();
    resetIdleTimeout();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resetIdleTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      // Timeout: kembali ke Home
      navigation.replace(Routes.Home);
    }, IDLE_TIMEOUT_MS);
  }, [navigation]);

  // ── Load frames ────────────────────────────────────────────

  const loadFrames = useCallback(async () => {
    setIsLoading(true);
    try {
      const eventId = activeEvent?.id;
      if (!eventId) {
        setFrames([]);
        return;
      }
      const loaded = await FrameRepository.getByEvent(eventId, true);
      setFrames(loaded);
      // Auto-select pertama jika hanya ada 1 frame
      if (loaded.length === 1) {
        setSelectedId(loaded[0].id);
      }
    } catch (e) {
      console.error('[FramePicker] load frames error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [activeEvent?.id]);

  // ── Select ─────────────────────────────────────────────────

  const handleSelect = useCallback((frame: KitaFrame) => {
    setSelectedId(frame.id);
    resetIdleTimeout(); // Reset timeout saat user berinteraksi
  }, [resetIdleTimeout]);

  // ── Confirm & Navigate ─────────────────────────────────────

  const handleConfirm = useCallback(() => {
    if (!selectedId || !activeEvent) return;
    const frame = frames.find(f => f.id === selectedId);
    if (!frame) return;

    // Mulai sesi baru
    startSession({
      sessionId:   uuidv4() as string,
      frameId:     selectedId,
      layoutType:  activeEvent.layoutType,
      filterType:  activeEvent.filterDefault,
      totalPhotos: activeEvent.photoCount,
    });

    navigation.replace(Routes.Countdown);
  }, [selectedId, activeEvent, frames, startSession, navigation]);

  // ── Render item ────────────────────────────────────────────

  const renderFrame = useCallback(({ item }: { item: KitaFrame }) => (
    <FrameCard
      frame={item}
      isSelected={item.id === selectedId}
      onPress={() => handleSelect(item)}
    />
  ), [selectedId, handleSelect]);

  const keyExtractor = useCallback((item: KitaFrame) => item.id, []);

  // Memoize getItemLayout untuk performa FlatList
  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: CARD_H + CARD_GAP,
      offset: (CARD_H + CARD_GAP) * Math.floor(index / COLS),
      index,
    }),
    []
  );

  // ── Empty / Loading ────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.centeredContainer}>
        <SkeletonGrid />
      </View>
    );
  }

  if (frames.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <Mascot mood="thinking" size={120} />
        <Text style={styles.emptyTitle}>Belum ada frame 🖼️</Text>
        <Text style={styles.emptySub}>
          Admin perlu upload frame dulu di panel admin
        </Text>
        <KitaButton
          label="← Kembali"
          onPress={() => navigation.replace(Routes.Home)}
          variant="outline"
          size="small"
        />
      </View>
    );
  }

  return (
    <View style={styles.container} onTouchStart={resetIdleTimeout}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <Text style={styles.headerTitle}>Pilih Tema Foto 🖼️</Text>
        <Text style={styles.headerSub}>
          {frames.length} tema tersedia — ketuk untuk memilih!
        </Text>
      </Animated.View>

      {/* Grid */}
      <FlatList
        data={frames}
        renderItem={renderFrame}
        keyExtractor={keyExtractor}
        numColumns={COLS}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        // Performance props
        windowSize={3}
        maxToRenderPerBatch={8}
        initialNumToRender={8}
        removeClippedSubviews={true}
        getItemLayout={getItemLayout}
        // Accessibility
        accessibilityLabel="Grid frame foto"
      />

      {/* Bottom action bar */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.actionBar}>
        {selectedId ? (
          <KitaButton
            label="Pakai Frame Ini! ✨"
            onPress={handleConfirm}
            variant="primary"
            size="large"
            style={styles.confirmBtn}
          />
        ) : (
          <View style={styles.hintContainer}>
            <Text style={styles.hintText}>👆 Ketuk salah satu frame di atas</Text>
          </View>
        )}
        <TouchableOpacity
          onPress={() => navigation.replace(Routes.Home)}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backText}>← Kembali</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// FrameCard — isolated untuk memo optimization
// ─────────────────────────────────────────────────────────────

interface FrameCardProps {
  frame:      KitaFrame;
  isSelected: boolean;
  onPress:    () => void;
}

const FrameCard: React.FC<FrameCardProps> = React.memo(({ frame, isSelected, onPress }) => {
  const scale   = useSharedValue(1);
  const [loaded, setLoaded] = useState(false);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.93, { damping: 15 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(isSelected ? 1.04 : 1, { damping: 12 });
  }, [scale, isSelected]);

  // Scale up saat dipilih
  useEffect(() => {
    scale.value = withSpring(isSelected ? 1.04 : 1, { damping: 10, stiffness: 180 });
  }, [isSelected, scale]);

  const thumbnailUri = frame.thumbnail ?? frame.filePath;

  return (
    <Animated.View style={[animStyle, { width: CARD_W }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityLabel={`Frame ${frame.name}`}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
      >
        <View style={[styles.card, isSelected && styles.cardSelected]}>
          {/* Thumbnail */}
          {!loaded && (
            <View style={styles.skeleton} />
          )}
          <Image
            source={{ uri: `file://${thumbnailUri}` }}
            style={[styles.cardImage, !loaded && styles.hidden]}
            resizeMode="cover"
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
            // Lazy loading: tidak perlu fadeDuration di RN Image
            progressiveRenderingEnabled={true}
          />

          {/* Selected checkmark */}
          {isSelected && (
            <View style={styles.checkBadge}>
              <Text style={styles.checkIcon}>✓</Text>
            </View>
          )}

          {/* Frame name */}
          <View style={styles.nameBadge}>
            <Text style={styles.nameText} numberOfLines={1}>
              {frame.name}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

FrameCard.displayName = 'FrameCard';

// ─────────────────────────────────────────────────────────────
// Skeleton loading grid
// ─────────────────────────────────────────────────────────────

const SkeletonCard: React.FC = () => {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withTiming(0.8, { duration: 600 });
    const loop = setInterval(() => {
      opacity.value = withTiming(
        opacity.value > 0.6 ? 0.4 : 0.8,
        { duration: 600 }
      );
    }, 700);
    return () => clearInterval(loop);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.card, styles.skeletonCard, style]} />
  );
};

const SkeletonGrid: React.FC = () => (
  <View style={styles.skeletonGrid}>
    {Array.from({ length: 8 }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </View>
);

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgMain,
  },

  centeredContainer: {
    flex: 1,
    backgroundColor: Colors.bgMain,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 32,
  },

  // ── Header ───────────────────────────────────────────────
  header: {
    paddingHorizontal: SIDE_PAD,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    alignItems: 'center',
  },
  headerTitle: {
    ...UserTypography.screenTitle,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  headerSub: {
    ...UserTypography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },

  // ── Grid ─────────────────────────────────────────────────
  gridContent: {
    paddingHorizontal: SIDE_PAD,
    paddingBottom: 140, // Ruang untuk action bar
  },
  row: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },

  // ── Card ─────────────────────────────────────────────────
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.primaryLight,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadow.md,
  },
  cardSelected: {
    borderColor: Colors.primary,
    borderWidth: 3,
    ...Shadow.lg,
  },
  cardImage: {
    width: '100%',
    height: CARD_H - 32, // Sisakan ruang untuk nama
    resizeMode: 'cover',
  },
  hidden: {
    opacity: 0,
    position: 'absolute',
  },

  // ── Skeleton ──────────────────────────────────────────────
  skeleton: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.primaryLight,
  },
  skeletonCard: {
    backgroundColor: Colors.primaryLight,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
    paddingHorizontal: SIDE_PAD,
  },

  // ── Badges ───────────────────────────────────────────────
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  checkIcon: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  nameBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  nameText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Nunito-Bold',
    textAlign: 'center',
  },

  // ── Action bar ────────────────────────────────────────────
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.bgCard,
    paddingHorizontal: SIDE_PAD,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadow.lg,
  },
  confirmBtn: {
    minWidth: 280,
  },
  hintContainer: {
    paddingVertical: 12,
  },
  hintText: {
    ...UserTypography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  backText: {
    ...AdminTypography.body,
    color: Colors.textSecondary,
  },

  // ── Empty state ───────────────────────────────────────────
  emptyTitle: {
    ...UserTypography.screenTitle,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptySub: {
    ...UserTypography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
