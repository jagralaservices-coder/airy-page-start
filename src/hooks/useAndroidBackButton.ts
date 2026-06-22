import { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

// Check if running on native platform
const isNativePlatform = () => {
  return typeof window !== 'undefined' && 
    (window as any).Capacitor?.isNativePlatform?.() === true;
};

export const useAndroidBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const lastBackPress = useRef<number>(0);
  const exitToastShown = useRef<boolean>(false);

  const handleBackButton = useCallback(() => {
    const now = Date.now();
    const timeSinceLastPress = now - lastBackPress.current;

    // If we're not on the home/welcome page, navigate back
    if (location.pathname !== '/' && location.pathname !== '/welcome') {
      navigate(-1);
      return;
    }

    // On home page - double tap to exit
    if (timeSinceLastPress < 2000 && exitToastShown.current) {
      // Double tap within 2 seconds - exit app
      if (isNativePlatform()) {
        import('@capacitor/app').then(({ App }) => {
          App.exitApp();
        });
      }
    } else {
      // First tap - show exit warning
      lastBackPress.current = now;
      exitToastShown.current = true;
      toast.info('Press back again to exit', { duration: 2000 });
      
      // Reset after 2 seconds
      setTimeout(() => {
        exitToastShown.current = false;
      }, 2000);
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    // Only run on native platforms (Android/iOS)
    if (!isNativePlatform()) {
      return;
    }

    let cleanup: (() => void) | undefined;

    // Dynamically import Capacitor App plugin
    import('@capacitor/app').then(({ App }) => {
      // Listen for hardware back button
      App.addListener('backButton', () => {
        handleBackButton();
      }).then(listener => {
        cleanup = () => listener.remove();
      });
    }).catch(() => {
      // Capacitor not available, ignore
    });

    return () => {
      cleanup?.();
    };
  }, [handleBackButton]);

  return null;
};
