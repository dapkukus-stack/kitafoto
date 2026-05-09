/**
 * global.d.ts — Ambient declarations untuk KitaFoto
 * Menyediakan type stubs saat node_modules belum terinstall.
 * Setelah npm install berhasil, skipLibCheck:true di tsconfig
 * memastikan file ini tidak konflik dengan @types resmi.
 */

/* ─── Node-like globals ──────────────────────────────────────── */
declare function require(module: string): any;
declare const __DEV__: boolean;

declare class Buffer {
  static from(data: string | ArrayBuffer | Uint8Array, encoding?: string): Buffer;
  static alloc(size: number): Buffer;
  toString(encoding?: string): string;
  length: number;
  [index: number]: number;
}


/* ─── React ──────────────────────────────────────────────────── */
declare module 'react' {
  type Key = string | number | null;
  type ReactNode = any;
  interface Attributes { key?: Key; }
  /** JSX-compatible component function type */
  interface FunctionComponent<P = {}> {
    (props: P & Attributes): any;
    displayName?: string;
  }
  type FC<P = {}> = FunctionComponent<P>;
  /** Generic component (class or function) — JSX callable */
  type ComponentType<P = any> = FunctionComponent<P> | (new (props: P) => any);
  /** Ref types */
  interface RefObject<T> { readonly current: T | null; }
  interface MutableRefObject<T> { current: T; }
  /** Memo wrapper — retains FC shape so JSX works */
  interface MemoExoticComponent<T extends ComponentType<any>> {
    (props: any): any;
    readonly type: T;
    displayName?: string;
  }
  function memo<P extends object>(
    component: FunctionComponent<P>,
    propsAreEqual?: (prev: P, next: P) => boolean,
  ): MemoExoticComponent<FunctionComponent<P>>;
  function lazy<T extends ComponentType<any>>(
    factory: () => Promise<{ default: T }>,
  ): T;
  function createElement(type: any, props?: any, ...children: any[]): any;
  function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  function useState<T>(initialState: T | (() => T)): [T, (v: T | ((p: T) => T)) => void];
  function useCallback<T extends (...args: any[]) => any>(fn: T, deps: any[]): T;
  function useMemo<T>(factory: () => T, deps: any[]): T;
  function useRef<T>(initialValue: T): MutableRefObject<T>;
  function useRef<T>(initialValue: T | null): RefObject<T>;
  function useRef<T = undefined>(): MutableRefObject<T | undefined>;
  function useContext<T>(context: any): T;
  function createContext<T>(defaultValue: T): any;
  const Suspense: ComponentType<{ fallback?: any; children?: any }>;
  const StrictMode: ComponentType<{ children?: any }>;
  export = React;
  export as namespace React;
}
declare namespace React {
  export import Key = React.Key;
  export import FC = React.FC;
  export import ComponentType = React.ComponentType;
  export import RefObject = React.RefObject;
  export import MutableRefObject = React.MutableRefObject;
  export import FunctionComponent = React.FunctionComponent;
  export import MemoExoticComponent = React.MemoExoticComponent;
  export import memo = React.memo;
  export import lazy = React.lazy;
  export import createElement = React.createElement;
  export import useEffect = React.useEffect;
  export import useState = React.useState;
  export import useCallback = React.useCallback;
  export import useMemo = React.useMemo;
  export import useRef = React.useRef;
  export import useContext = React.useContext;
  export import createContext = React.createContext;
  export import Suspense = React.Suspense;
}


/* ─── React Native ───────────────────────────────────────────── */
declare module 'react-native' {
  import type { ComponentType, FC } from 'react';
  export const StyleSheet: {
    create<T extends Record<string, any>>(styles: T): T;
    absoluteFill: any;
    absoluteFillObject: any;
    flatten(style: any): any;
  };
  export const View:              ComponentType<any>;
  export const Text:              ComponentType<any>;
  export const Image:             ComponentType<any>;
  export const TouchableOpacity:  ComponentType<any>;
  export const FlatList:          ComponentType<any>;
  export const ScrollView:        ComponentType<any>;
  export const SafeAreaView:      ComponentType<any>;
  export const ActivityIndicator: ComponentType<any>;
  export const Dimensions: {
    get(dim: 'window' | 'screen'): { width: number; height: number; scale: number; fontScale: number };
    addEventListener(event: 'change', handler: (dims: { window: any; screen: any }) => void): { remove(): void };
  };
  export const Platform: { OS: string; Version: number | string; select<T>(specifics: Record<string, T>): T; };
  export const Linking: { openURL(url: string): Promise<void>; canOpenURL(url: string): Promise<boolean>; };
  export const AppState: {
    currentState: string;
    addEventListener(type: 'change', handler: (state: string) => void): { remove(): void };
  };
  export const InteractionManager: { runAfterInteractions(fn: () => void): void; };
  export const NativeModules: any;
  export function useWindowDimensions(): { width: number; height: number; fontScale: number; scale: number };
  export type ViewStyle  = any;
  export type TextStyle  = any;
  export type ImageStyle = any;
  export type AppStateStatus = 'active' | 'background' | 'inactive' | 'unknown' | 'extension';
  export type ScaledSize = { width: number; height: number; scale: number; fontScale: number };
}

/* ─── React Native Reanimated ────────────────────────────────── */
declare module 'react-native-reanimated' {
  import type { ComponentType } from 'react';
  const Animated: {
    View:       ComponentType<any>;
    Text:       ComponentType<any>;
    Image:      ComponentType<any>;
    ScrollView: ComponentType<any>;
    createAnimatedComponent<T extends ComponentType<any>>(c: T): T;
  };
  export default Animated;
  export function useSharedValue<T>(initial: T): { value: T };
  export function useAnimatedStyle(fn: () => any): any;
  export function withSpring(value: number, config?: any, cb?: any): number;
  export function withTiming(value: number, config?: any, cb?: any): number;
  export function withSequence(...args: any[]): any;
  export function withRepeat(animation: any, times?: number, reverse?: boolean): any;
  export function withDelay(delay: number, animation: any): any;
  export function runOnJS<T extends (...args: any[]) => any>(fn: T): T;
  export function createAnimatedComponent<T extends ComponentType<any>>(c: T): T;
  export function interpolate(v: number, input: number[], output: number[], e?: any): number;
  export const FadeIn:    any;
  export const FadeInDown:any;
  export const FadeInRight:any;
  export const Easing:    any;
  export const ClipOp:    any;
  export type SharedValue<T> = { value: T };
}

/* ─── React Navigation ───────────────────────────────────────── */
declare module '@react-navigation/native' {
  import type { ComponentType } from 'react';
  export function useNavigation<T = any>(): T;
  export function useRoute<T = any>(): T;
  export const NavigationContainer: ComponentType<any>;
  export function useFocusEffect(effect: () => void | (() => void)): void;
  export type RouteProp<T, K extends keyof T> = any;
}
declare module '@react-navigation/stack' {
  export function createStackNavigator(): any;
  export type StackNavigationProp<T, K extends keyof T = keyof T> = any;
}
declare module '@react-navigation/bottom-tabs' {
  export function createBottomTabNavigator(): any;
}

/* ─── Expo packages ──────────────────────────────────────────── */
declare module 'expo-file-system' {
  export const documentDirectory: string | null;
  export const cacheDirectory:    string | null;
  export function getInfoAsync(uri: string, options?: any): Promise<any>;
  export function readAsStringAsync(uri: string, options?: any): Promise<string>;
  export function writeAsStringAsync(uri: string, content: string, options?: any): Promise<void>;
  export function deleteAsync(uri: string, options?: any): Promise<void>;
  export function makeDirectoryAsync(uri: string, options?: any): Promise<void>;
  export function copyAsync(options: { from: string; to: string }): Promise<void>;
  export function moveAsync(options: { from: string; to: string }): Promise<void>;
  export function readDirectoryAsync(uri: string): Promise<string[]>;
  export enum EncodingType { Base64 = 'base64', UTF8 = 'utf8' }
}

declare module 'expo-image-manipulator' {
  export function manipulateAsync(uri: string, actions: any[], options?: any): Promise<{ uri: string; width: number; height: number }>;
  export enum SaveFormat { JPEG = 'jpeg', PNG = 'png', WEBP = 'webp' }
  export type Action = any;
}

declare module 'expo-sqlite' {
  export function openDatabaseAsync(name: string): Promise<SQLiteDatabase>;
  export interface SQLiteDatabase {
    runAsync(sql: string, args?: any[]): Promise<SQLiteRunResult>;
    getFirstAsync<T>(sql: string, args?: any[]): Promise<T | null>;
    getAllAsync<T>(sql: string, args?: any[]): Promise<T[]>;
    execAsync(statements: Array<{ sql: string; args?: any[] }>): Promise<void>;
    closeAsync(): Promise<void>;
    withTransactionAsync(fn: () => Promise<void>): Promise<void>;
  }
  export type SQLiteRunResult = { changes?: number; lastInsertRowId?: number };
}

declare module 'expo-av' {
  export namespace Audio {
    class Sound {
      static createAsync(source: any, options?: any): Promise<{ sound: Sound }>;
      playAsync(): Promise<void>;
      replayAsync(): Promise<void>;
      stopAsync(): Promise<void>;
      unloadAsync(): Promise<void>;
      setVolumeAsync(volume: number): Promise<void>;
    }
    function setAudioModeAsync(options: any): Promise<void>;
  }
  export const Video: any;
}

declare module 'expo-splash-screen' {
  export function preventAutoHideAsync(): Promise<void>;
  export function hideAsync(): Promise<void>;
}
declare module 'expo-font' {
  export function loadAsync(fonts: Record<string, any>): Promise<void>;
}
declare module 'expo-network' {
  export function getNetworkStateAsync(): Promise<{ isConnected: boolean | null; isInternetReachable: boolean | null }>;
}
declare module 'expo-media-library' {
  export function requestPermissionsAsync(): Promise<{ status: string }>;
  export function saveToLibraryAsync(uri: string): Promise<void>;
}
declare module 'expo-device'        { export const isDevice: boolean; export const modelName: string | null; }
declare module 'expo-camera'        { export const Camera: any; }
declare module 'expo-status-bar'    { import type { ComponentType } from 'react'; export const StatusBar: ComponentType<any>; }

/* ─── React Native packages ──────────────────────────────────── */
declare module 'react-native-gesture-handler' {
  import type { ComponentType } from 'react';
  export const GestureHandlerRootView: ComponentType<any>;
  export const GestureDetector: ComponentType<any>;
  export const Gesture: any;
  export const TouchableOpacity: ComponentType<any>;
}
declare module 'react-native-screens' {
  export function enableScreens(shouldEnable?: boolean): void;
}
declare module 'react-native-safe-area-context' {
  import type { ComponentType } from 'react';
  export const SafeAreaProvider: ComponentType<any>;
  export const SafeAreaView:     ComponentType<any>;
  export function useSafeAreaInsets(): { top: number; right: number; bottom: number; left: number };
}
declare module 'react-native-reanimated/plugin' { const x: any; export = x; }

declare module 'react-native-svg' {
  import type { ComponentType } from 'react';
  export const Svg:          ComponentType<any>;
  export const Path:         ComponentType<any>;
  export const Rect:         ComponentType<any>;
  export const Circle:       ComponentType<any>;
  export const Ellipse:      ComponentType<any>;
  export const G:            ComponentType<any>;
  export const Text:         ComponentType<any>;
  export const Line:         ComponentType<any>;
  export const Polygon:      ComponentType<any>;
  export const Defs:         ComponentType<any>;
  export const LinearGradient: ComponentType<any>;
  export const Stop:         ComponentType<any>;
  export const ClipPath:     ComponentType<any>;
  export default Svg;
}

declare module '@shopify/react-native-skia' {
  import type { ComponentType } from 'react';
  export const Skia: any;
  export const Canvas: ComponentType<any>;
  export const Image: ComponentType<any>;
  export function makeImageFromEncoded(data: any): any;
  export const Paint: any;
  export const ClipOp: any;
  export enum ImageFormat { JPEG = 3, PNG = 4 }
  export type SkCanvas  = any;
  export type SkSurface = any;
}

declare module 'react-native-mmkv' {
  export class MMKV {
    set(key: string, value: string | number | boolean): void;
    getString(key: string): string | undefined;
    getNumber(key: string): number | undefined;
    getBoolean(key: string): boolean | undefined;
    delete(key: string): void;
    contains(key: string): boolean;
  }
}

declare module 'zustand' {
  type StoreApi<T> = {
    (): T;
    getState: () => T;
    setState: (partial: Partial<T> | ((s: T) => Partial<T>)) => void;
    subscribe:  (listener: (state: T, prev: T) => void) => () => void;
    destroy:    () => void;
  };
  export function create<T>(fn: (set: any, get?: () => T) => T): StoreApi<T>;
  export function create<T>(): (fn: (set: any, get?: () => T) => T) => StoreApi<T>;
}

declare module 'react-native-uuid' {
  export function v4(): string;
}

declare module 'dayjs' {
  function dayjs(date?: any): any;
  export = dayjs;
}

declare module '@tanstack/react-query' {
  import type { ComponentType } from 'react';
  export const QueryClient: any;
  export const QueryClientProvider: ComponentType<any>;
  export function useQuery(options: any): any;
  export function useMutation(options: any): any;
}

declare module 'react-native-print' {
  const RNPrint: { print(options: { filePath?: string; html?: string; printerURL?: string; isLandscape?: boolean }): Promise<void>; };
  export default RNPrint;
}

declare module 'lottie-react-native' {
  import type { ComponentType } from 'react';
  const LottieView: ComponentType<any>;
  export default LottieView;
}

declare module 'cloudinary-react-native' { export const Cloudinary: any; }

declare module 'react-native-vision-camera' {
  import type { ComponentType } from 'react';
  export const Camera: ComponentType<any>;
  export type CameraDevice = any;
  export type CameraPermissionStatus = 'granted' | 'not-determined' | 'denied' | 'authorized';
  export type Frame = any;
}

/* ─── Static asset imports ───────────────────────────────────── */
declare module '*.png'  { const x: number; export default x; }
declare module '*.jpg'  { const x: number; export default x; }
declare module '*.jpeg' { const x: number; export default x; }
declare module '*.gif'  { const x: number; export default x; }
declare module '*.svg'  { const x: any;    export default x; }
declare module '*.mp3'  { const x: number; export default x; }
declare module '*.ttf'  { const x: number; export default x; }
declare module '*.json' { const x: any;    export default x; }
