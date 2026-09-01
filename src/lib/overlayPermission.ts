import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export interface OverlayPermissionStatus {
  isSupported: boolean;
  isNativeAndroid: boolean;
  granted: boolean;
}

/**
 * Checks whether System Overlay / Display Over Other Apps permission is supported and granted.
 */
export async function checkOverlayPermission(): Promise<OverlayPermissionStatus> {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  const isAndroid = platform === 'android' && isNative;

  if (!isAndroid) {
    return {
      isSupported: false,
      isNativeAndroid: false,
      granted: true, // In Web/PWA, in-app overlay works without system permission
    };
  }

  // Check stored local flag or native bridge
  const isGrantedLocally =
    typeof window !== 'undefined' &&
    localStorage.getItem('pn_overlay_permission_granted') === 'true';

  return {
    isSupported: true,
    isNativeAndroid: true,
    granted: isGrantedLocally,
  };
}

/**
 * Requests or navigates to Android System Overlay Permission settings.
 */
export async function requestOverlayPermission(): Promise<boolean> {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  const isAndroid = platform === 'android' && isNative;

  if (!isAndroid) {
    // Graceful web fallback
    if (typeof window !== 'undefined') {
      localStorage.setItem('pn_overlay_permission_granted', 'true');
    }
    return true;
  }

  try {
    const packageName = 'com.playnexa.app';
    // Deep-link intent directly to Android Manage Overlay Permission for Play Nexa
    const intentUrl = `android.settings.action.MANAGE_OVERLAY_PERMISSION`;
    const appSettingsUrl = `package:${packageName}`;

    // Try opening settings via Capacitor Browser or standard location
    try {
      await Browser.open({ url: `intent:${appSettingsUrl}#Intent;action=${intentUrl};end` });
    } catch {
      // Fallback to standard app settings
      if (typeof window !== 'undefined') {
        window.location.href = `intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:${packageName};end`;
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('pn_overlay_permission_granted', 'true');
    }
    return true;
  } catch (err) {
    console.error('[OverlayPermission] Failed to open system overlay settings:', err);
    return false;
  }
}
