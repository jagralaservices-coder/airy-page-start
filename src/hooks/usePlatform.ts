import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export interface PlatformInfo {
  isNative: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isWindows: boolean;
  isMobile: boolean;
  isDesktop: boolean;
  isPWA: boolean;
  isStandalone: boolean;
}

const detectPlatform = (): PlatformInfo => {
  const ua = navigator.userAgent.toLowerCase();
  const isNative = Capacitor.isNativePlatform();
  const isAndroid = /android/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isWindows = /windows/i.test(ua);
  const isMobile = isAndroid || isIOS || /webos|blackberry|iemobile|opera mini/i.test(ua);
  const isDesktop = !isMobile;
  
  // Check if running as installed PWA
  const isStandalone = 
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://');
  
  const isPWA = isStandalone && !isNative;

  return {
    isNative,
    isAndroid,
    isIOS,
    isWindows,
    isMobile,
    isDesktop,
    isPWA,
    isStandalone,
  };
};

// Singleton for non-React usage
let cachedPlatform: PlatformInfo | null = null;
export const getPlatform = (): PlatformInfo => {
  if (!cachedPlatform) {
    cachedPlatform = detectPlatform();
  }
  return cachedPlatform;
};

// React hook
export const usePlatform = (): PlatformInfo => {
  const [platform] = useState<PlatformInfo>(() => getPlatform());
  return platform;
};

export default usePlatform;
