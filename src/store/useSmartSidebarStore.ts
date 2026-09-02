import { create } from 'zustand';

export interface SmartSidebarState {
  isEnabled: boolean;
  isOpen: boolean;
  handleYPercent: number; // 10 to 90%
  panelHeight: number; // in pixels (e.g. 460)
  autoOpenOnDownload: boolean;
  overlayPermissionGranted: boolean;
  hasSeenPermissionDialog: boolean;

  // Actions
  setIsOpen: (isOpen: boolean) => void;
  toggleIsOpen: () => void;
  setIsEnabled: (isEnabled: boolean) => void;
  setHandleYPercent: (pct: number) => void;
  setPanelHeight: (height: number) => void;
  setAutoOpenOnDownload: (val: boolean) => void;
  setOverlayPermissionGranted: (val: boolean) => void;
  setHasSeenPermissionDialog: (val: boolean) => void;
}

const STORAGE_KEY = 'pn_smart_sidebar_settings_v1';

function getInitialState(): {
  isEnabled: boolean;
  handleYPercent: number;
  panelHeight: number;
  autoOpenOnDownload: boolean;
  overlayPermissionGranted: boolean;
  hasSeenPermissionDialog: boolean;
} {
  if (typeof window === 'undefined') {
    return {
      isEnabled: true,
      handleYPercent: 42,
      panelHeight: 480,
      autoOpenOnDownload: true,
      overlayPermissionGranted: false,
      hasSeenPermissionDialog: false,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        isEnabled: parsed.isEnabled ?? true,
        handleYPercent: Math.min(90, Math.max(10, parsed.handleYPercent ?? 42)),
        panelHeight: Math.min(720, Math.max(300, parsed.panelHeight ?? 480)),
        autoOpenOnDownload: parsed.autoOpenOnDownload ?? true,
        overlayPermissionGranted: parsed.overlayPermissionGranted ?? false,
        hasSeenPermissionDialog: parsed.hasSeenPermissionDialog ?? false,
      };
    }
  } catch (err) {
    console.error('[SmartSidebarStore] Error loading saved settings:', err);
  }

  return {
    isEnabled: true,
    handleYPercent: 42,
    panelHeight: 480,
    autoOpenOnDownload: true,
    overlayPermissionGranted: false,
    hasSeenPermissionDialog: false,
  };
}

function persistState(state: Partial<SmartSidebarState>) {
  if (typeof window === 'undefined') return;
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const merged = { ...current, ...state };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (err) {
    console.error('[SmartSidebarStore] Error persisting settings:', err);
  }
}

const init = getInitialState();

export const useSmartSidebarStore = create<SmartSidebarState>((set) => ({
  isEnabled: init.isEnabled,
  isOpen: false,
  handleYPercent: init.handleYPercent,
  panelHeight: init.panelHeight,
  autoOpenOnDownload: init.autoOpenOnDownload,
  overlayPermissionGranted: init.overlayPermissionGranted,
  hasSeenPermissionDialog: init.hasSeenPermissionDialog,

  setIsOpen: (isOpen: boolean) => set({ isOpen }),
  toggleIsOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  setIsEnabled: (isEnabled: boolean) => {
    persistState({ isEnabled });
    set({ isEnabled, isOpen: isEnabled ? false : false });
  },

  setHandleYPercent: (handleYPercent: number) => {
    const clamped = Math.min(90, Math.max(10, handleYPercent));
    persistState({ handleYPercent: clamped });
    set({ handleYPercent: clamped });
  },

  setPanelHeight: (panelHeight: number) => {
    const clamped = Math.min(760, Math.max(320, panelHeight));
    persistState({ panelHeight: clamped });
    set({ panelHeight: clamped });
  },

  setAutoOpenOnDownload: (autoOpenOnDownload: boolean) => {
    persistState({ autoOpenOnDownload });
    set({ autoOpenOnDownload });
  },

  setOverlayPermissionGranted: (overlayPermissionGranted: boolean) => {
    persistState({ overlayPermissionGranted });
    set({ overlayPermissionGranted });
  },

  setHasSeenPermissionDialog: (hasSeenPermissionDialog: boolean) => {
    persistState({ hasSeenPermissionDialog });
    set({ hasSeenPermissionDialog });
  },
}));
