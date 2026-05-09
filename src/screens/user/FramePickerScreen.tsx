/**
 * FramePickerScreen — Responsive v2
 * ─────────────────────────────────────────────────────────────
 * Grid kolom otomatis per breakpoint:
 *   xs/sm  → 2 kolom   (phone ≤ 599dp)
 *   md     → 4 kolom   (small tablet 600–719dp)
 *   lg     → 5 kolom   (medium tablet 720–959dp)
 *   xl/xxl → 6 kolom   (large tablet ≥ 960dp)
 *
 * Memory-safe:
 *   • FlatList virtualised (windowSize=3, removeClippedSubviews)
 *   • FrameCard = React.memo, no re-render saat scroll
 *   • getItemLayout memoized per kolom/dimensi
 *   • Skeleton ringan tanpa setTimeout loop
 *
 * Responsive:
 *   • Semua padding/font/gap dari useTokens()
 *   • Card width dihitung dari calcGridItem() — tidak hardcode
 *   • Grid re-calculates hanya saat orientasi/window berubah
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
  Image,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { useNavigation }           from '@react-navigation/native';
import { v4 as uuidv4 }            from 'react-native-uuid';
import { Colors }                  from '@constants/colors';
import { Fonts }                   from '@constants/typography';
import { Shadow, Radius }          from '@constants/dimensions';
import { AppConfig }               from '@constants/config';
import { Routes }                  from '@constants/routes';
import { KitaButton }              from '@components/common/KitaButton';
import { Mascot }                  from '@components/common/Mascot';
import { useSessionStore }         from '@store/useSessionStore';
import { useEventStore }           from '@store/useEventStore';
import { FrameRepository }         from '@database/repositories/EventRepository';
import { useTokens, useResponsive, calcGridItem, makeGetItemLayout } from '@responsive';
import type { KitaFrame }          from '@types/event.types';

const IDLE_TIMEOUT_MS = AppConfig.framepickerTimeoutMs;
const CARD_ASPECT     = 1.4; // height = width × 1.4

// ─────────────────────────────────────────────────────────────

export const FramePickerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { width: winW } = useWindowDimensions();   // live update saat rotate
  const { activeEvent }  = useEventStore();
  const { startSession } = useSessionStore();
  const T  = useTokens();
  const rs = useResponsive();

  const [frames, setFrames]         = useState<KitaFrame[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Grid dimensions (recomputed hanya saat window berubah) ──
  const { cols, cardW, cardH, gap, padH } = useMemo(() => {
    const c    = T.grid.frameCols;
    const g    = T.grid.cardGap;
    const pH   = T.spacing.screenH;
    const item = calcGridItem(winW, { cols: c, gap: g, paddingH: pH, aspectRatio: CARD_ASPECT });
    return { cols: c, cardW: item.width, cardH: item.height, gap: g, padH: pH };
  }, [winW, T.grid.frameCols, T.grid.cardGap, T.spacing.screenH]);

  // getItemLayout memoized
  const getItemLayout = useMemo(
    () => makeGetItemLayout(cardH, gap, cols),
    [cardH, gap, cols]
  );

  // ── Lifecycle ──────────────────────────────────────────────
  useEffect(() => {
    loadFrames();
    resetIdleTimeout();
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resetIdleTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => navigation.replace(Routes.Home), IDLE_TIMEOUT_MS);
  }, [navigation]);

  const loadFrames = useCallback(async () => {
    setIsLoading(true);
    try {
      const eventId = activeEvent?.id;
      if (!eventId) { setFrames([]); return; }
      const loaded = await FrameRepository.getByEvent(eventId, true);
      setFrames(loaded);
      if (loaded.length === 1) setSelectedId(loaded[0].id);
    } catch (e) {
      console.error('[FramePicker] load error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [activeEvent?.id]);

  const handleSelect = useCallback((frame: KitaFrame) => {
    setSelectedId(frame.id);
    resetIdleTimeout();
  }, [resetIdleTimeout]);

  const handleConfirm = useCallback(() => {
    if (!selectedId || !activeEvent) return;
    startSession({
      sessionId:   uuidv4() as string,
      frameId:     selectedId,
      layoutType:  activeEvent.layoutType,
      filterType:  activeEvent.filterDefault,
      totalPhotos: activeEvent.photoCount,
    });
    navigation.replace(Routes.Countdown);
  }, [selectedId, activeEvent, startSession, navigation]);

  const renderFrame = useCallback(({ item }: { item: KitaFrame }) => (
    <FrameCard
      frame={item}
      isSelected={item.id === selectedId}
      onPress={() => handleSelect(item)}
      cardW={cardW}
      cardH={cardH}
      fontSize={T.font.caption}
      radius={T.radius.lg}
    />
  ), [selectedId, handleSelect, cardW, cardH, T.font.caption, T.radius.lg]);

  const keyExtractor = useCallback((item: KitaFrame) => item.id, []);

  // ── Styles (derived from tokens + dynamic card dims) ────────
  const styles = useMemo(() => makeStyles(T, padH, gap, cols),
    [T, padH, gap, cols]);

  // ── Empty / Loading ────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <SkeletonGrid cardW={cardW} cardH={cardH} gap={gap} padH={padH} radius={T.radius.lg} />
      </View>
    );
  }

  if (frames.length === 0) {
    return (
      <View style={styles.centered}>
        <Mascot mood="thinking" size={T.mascot.placeholder} />
        <Text style={styles.emptyTitle}>Belum ada frame 🖼️</Text>
        <Text style={styles.emptySub}>Admin perlu upload frame di panel admin</Text>
        <KitaButton label="← Kembali" onPress={() => navigation.replace(Routes.Home)}
          variant="outline" size="small" />
      </View>
    );
  }

  return (
    <View style={styles.root} onTouchStart={resetIdleTimeout}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <Text style={styles.headerTitle}>Pilih Tema Foto 🖼️</Text>
        <Text style={styles.headerSub}>{frames.length} tema — ketuk untuk memilih!</Text>
      </Animated.View>

      {/* Grid */}
      <FlatList
        data={frames}
        renderItem={renderFrame}
        keyExtractor={keyExtractor}
        numColumns={cols}
        key={`grid-${cols}`}             // Force re-mount saat cols berubah
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={cols > 1 ? styles.row : undefined}
        showsVerticalScrollIndicator={false}
        windowSize={3}
        maxToRenderPerBatch={cols * 3}
        initialNumToRender={cols * 2}
        removeClippedSubviews={true}
        getItemLayout={getItemLayout}
        accessibilityLabel="Grid frame foto"
      />

      {/* Action bar */}
      <Animated.View entering={FadeInDown.duration(300)} style={styles.actionBar}>
        {selectedId ? (
          <KitaButton label="Pakai Frame Ini! ✨" onPress={handleConfirm}
            variant="primary" size="large" style={styles.confirmBtn} />
        ) : (
          <Text style={styles.hintText}>👆 Ketuk salah satu frame di atas</Text>
        )}
        <TouchableOpacity onPress={() => navigation.replace(Routes.Home)}
          style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.backText}>← Kembali</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// FrameCard — fully memoized, no closure over parent state
// ─────────────────────────────────────────────────────────────

interface FrameCardProps {
  frame: KitaFrame; isSelected: boolean; onPress: () => void;
  cardW: number; cardH: number; fontSize: number; radius: number;
}

const FrameCard = React.memo<FrameCardProps>(
  ({ frame, isSelected, onPress, cardW, cardH, fontSize, radius }) => {
    const scale  = useSharedValue(1);
    const [loaded, setLoaded] = useState(false);

    const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    useEffect(() => {
      scale.value = withSpring(isSelected ? 1.04 : 1, { damping: 10, stiffness: 180 });
    }, [isSelected, scale]);

    return (
      <Animated.View style={[animStyle, { width: cardW }]}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={() => { scale.value = withSpring(0.93, { damping: 15 }); }}
          onPressOut={() => { scale.value = withSpring(isSelected ? 1.04 : 1, { damping: 12 }); }}
          activeOpacity={1}
          accessibilityLabel={`Frame ${frame.name}`}
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
        >
          <View style={[
            cardStyles.card,
            { width: cardW, height: cardH, borderRadius: radius },
            isSelected && cardStyles.cardSel,
          ]}>
            {!loaded && <View style={[cardStyles.skeleton, { borderRadius: radius }]} />}
            <Image
              source={{ uri: `file://${frame.thumbnail ?? frame.filePath}` }}
              style={[cardStyles.img, { height: cardH - 28 }, !loaded && cardStyles.hidden]}
              resizeMode="cover"
              onLoad={() => setLoaded(true)}
              onError={() => setLoaded(true)}
              progressiveRenderingEnabled={true}
            />
            {isSelected && (
              <View style={cardStyles.check}><Text style={cardStyles.checkIcon}>✓</Text></View>
            )}
            <View style={cardStyles.nameBadge}>
              <Text style={[cardStyles.nameText, { fontSize }]} numberOfLines={1}>
                {frame.name}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }
);
FrameCard.displayName = 'FrameCard';

const cardStyles = StyleSheet.create({
  card:      { overflow: 'hidden', backgroundColor: Colors.primaryLight,
               borderWidth: 2, borderColor: 'transparent', ...Shadow.md },
  cardSel:   { borderColor: Colors.primary, borderWidth: 3, ...Shadow.lg },
  img:       { width: '100%', resizeMode: 'cover' },
  hidden:    { opacity: 0, position: 'absolute' },
  skeleton:  { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.primaryLight },
  check:     { position: 'absolute', top: 8, right: 8, width: 26, height: 26,
               borderRadius: 13, backgroundColor: Colors.primary,
               justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  checkIcon: { color: '#fff', fontSize: 14, fontFamily: Fonts.bold },
  nameBadge: { position: 'absolute', bottom: 0, left: 0, right: 0,
               backgroundColor: 'rgba(0,0,0,0.55)',
               paddingVertical: 5, paddingHorizontal: 6 },
  nameText:  { color: '#fff', fontFamily: Fonts.bold, textAlign: 'center' },
});

// ─────────────────────────────────────────────────────────────
// Skeleton grid
// ─────────────────────────────────────────────────────────────

interface SkeletonGridProps { cardW: number; cardH: number; gap: number; padH: number; radius: number; }

const SkeletonCard = React.memo<{ w: number; h: number; radius: number }>(({ w, h, radius }) => {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withTiming(0.75, { duration: 700 });
    const id = setInterval(() => {
      opacity.value = withTiming(opacity.value > 0.55 ? 0.35 : 0.75, { duration: 700 });
    }, 800);
    return () => clearInterval(id);
  }, [opacity]);

  return (
    <Animated.View style={[
      { width: w, height: h, borderRadius: radius, backgroundColor: Colors.primaryLight },
      useAnimatedStyle(() => ({ opacity: opacity.value })),
    ]} />
  );
});
SkeletonCard.displayName = 'SkeletonCard';

const SkeletonGrid: React.FC<SkeletonGridProps> = ({ cardW, cardH, gap, padH, radius }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, paddingHorizontal: padH }}>
    {Array.from({ length: 8 }).map((_, i) => (
      <SkeletonCard key={i} w={cardW} h={cardH} radius={radius} />
    ))}
  </View>
);

// ─────────────────────────────────────────────────────────────
// Styles factory
// ─────────────────────────────────────────────────────────────

function makeStyles(T: ReturnType<typeof useTokens>, padH: number, gap: number, cols: number) {
  const sp  = T.spacing;
  const ft  = T.font;
  return StyleSheet.create({
    root:     { flex: 1, backgroundColor: Colors.bgMain },
    centered: { flex: 1, backgroundColor: Colors.bgMain,
                justifyContent: 'center', alignItems: 'center', gap: sp.md, padding: sp.xl },

    header:     { paddingHorizontal: padH, paddingTop: sp.lg, paddingBottom: sp.md, alignItems: 'center' },
    headerTitle:{ fontFamily: Fonts.extraBold, fontSize: ft.screenTitle, color: Colors.textPrimary, textAlign: 'center' },
    headerSub:  { fontFamily: Fonts.semiBold, fontSize: ft.body, color: Colors.textSecondary, textAlign: 'center', marginTop: sp.xs },

    gridContent:{ paddingHorizontal: padH, paddingBottom: T.layout.actionBarH + sp.md },
    row:        { gap, marginBottom: gap },

    actionBar:  { position: 'absolute', bottom: 0, left: 0, right: 0,
                  backgroundColor: Colors.bgCard, paddingHorizontal: padH,
                  paddingVertical: sp.md, paddingBottom: sp.lg,
                  alignItems: 'center', gap: sp.sm,
                  borderTopWidth: 1, borderTopColor: Colors.border, ...Shadow.lg },
    confirmBtn: { minWidth: Math.min(280, T._w * 0.7) },
    hintText:   { fontFamily: Fonts.semiBold, fontSize: ft.body, color: Colors.textSecondary, textAlign: 'center', paddingVertical: sp.sm },
    backBtn:    { paddingVertical: sp.sm, paddingHorizontal: sp.lg },
    backText:   { fontFamily: Fonts.regular, fontSize: ft.adminBody, color: Colors.textSecondary },

    emptyTitle: { fontFamily: Fonts.extraBold, fontSize: ft.screenTitle, color: Colors.textPrimary, textAlign: 'center' },
    emptySub:   { fontFamily: Fonts.semiBold, fontSize: ft.body, color: Colors.textSecondary, textAlign: 'center' },
  });
}
