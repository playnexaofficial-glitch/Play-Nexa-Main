'use client';

import React, { useEffect, useState } from 'react';
import SmartSidebarHandle from './SmartSidebarHandle';
import SmartSidebarPanel from './SmartSidebarPanel';
import SystemOverlayDialog from './SystemOverlayDialog';
import { useSmartSidebarStore } from '@/store/useSmartSidebarStore';
import { checkOverlayPermission } from '@/lib/overlayPermission';

export default function SmartSidebar() {
  const isEnabled = useSmartSidebarStore((s) => s.isEnabled);
  const hasSeenPermissionDialog = useSmartSidebarStore(
    (s) => s.hasSeenPermissionDialog
  );
  const setOverlayPermissionGranted = useSmartSidebarStore(
    (s) => s.setOverlayPermissionGranted
  );

  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  // Check permission status on mount
  useEffect(() => {
    async function initCheck() {
      const status = await checkOverlayPermission();
      setOverlayPermissionGranted(status.granted);

      // If native Android and hasn't seen dialog yet, show dialog
      if (status.isNativeAndroid && !hasSeenPermissionDialog && isEnabled) {
        setShowPermissionDialog(true);
      }
    }
    initCheck();
  }, [hasSeenPermissionDialog, isEnabled, setOverlayPermissionGranted]);

  if (!isEnabled) return null;

  return (
    <>
      <SmartSidebarHandle />
      <SmartSidebarPanel />
      <SystemOverlayDialog
        isOpen={showPermissionDialog}
        onClose={() => setShowPermissionDialog(false)}
      />
    </>
  );
}
