import { useCallback } from 'react';

export const useHaptic = () => {
  const vibrate = useCallback((duration: number = 10) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  }, []);

  const lightTap = useCallback(() => {
    vibrate(10);
  }, [vibrate]);

  const mediumTap = useCallback(() => {
    vibrate(25);
  }, [vibrate]);

  const heavyTap = useCallback(() => {
    vibrate(50);
  }, [vibrate]);

  const success = useCallback(() => {
    vibrate(30);
  }, [vibrate]);

  const error = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 50]);
    }
  }, []);

  return {
    vibrate,
    lightTap,
    mediumTap,
    heavyTap,
    success,
    error,
  };
};

// Sound effects
const clickSound = new Audio('data:audio/wav;base64,UklGRl9vT19teleikEk+Xr35hOJCaF29/kiVM7XJXr78uEYzxn5u3cjWdCdOvw2YloRnbq79qKaEZ46+/aimlHeurv2oppR3rq79qKaUd66u/aimlHeurv2oppR3rq79qKaUd66u/aimlHeurv2oppRw==');
clickSound.volume = 0.1;

export const playClickSound = () => {
  clickSound.currentTime = 0;
  clickSound.play().catch(() => {});
};
