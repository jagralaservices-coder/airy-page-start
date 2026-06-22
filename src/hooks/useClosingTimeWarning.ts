import { useState, useEffect, useCallback } from 'react';

interface UseClosingTimeWarningProps {
  enabled?: boolean;
}

export const useClosingTimeWarning = ({ enabled = true }: UseClosingTimeWarningProps = {}) => {
  const [showWarning, setShowWarning] = useState(false);
  const [closingTime, setClosingTime] = useState('23:00');
  const [warningShown, setWarningShown] = useState(false);

  const getClosingTime = useCallback(() => {
    const savedConfig = localStorage.getItem('pos_restaurant_config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        const hour = config.closingHour || '23';
        const minute = config.closingMinute || '00';
        return `${hour}:${minute}`;
      } catch (e) {
        return '23:00';
      }
    }
    return '23:00';
  }, []);

  const checkClosingTime = useCallback(() => {
    if (!enabled || warningShown) return;

    const currentClosingTime = getClosingTime();
    setClosingTime(currentClosingTime);

    const now = new Date();
    const [closingHour, closingMinute] = currentClosingTime.split(':').map(Number);
    
    // Create closing date for today
    const closingDate = new Date();
    closingDate.setHours(closingHour, closingMinute, 0, 0);

    // Calculate warning time (30 mins before closing)
    const warningTime = new Date(closingDate.getTime() - 30 * 60 * 1000);

    // Check if we're within the 30-minute warning window
    const timeDiff = closingDate.getTime() - now.getTime();
    const minutesUntilClosing = timeDiff / (1000 * 60);

    // Show warning if we're between 30 mins and 25 mins before closing (5-minute window)
    if (minutesUntilClosing <= 30 && minutesUntilClosing > 25) {
      // Check if already shown today
      const lastWarningDate = localStorage.getItem('closing_warning_last_shown');
      const today = new Date().toDateString();
      
      if (lastWarningDate !== today) {
        setShowWarning(true);
        setWarningShown(true);
        localStorage.setItem('closing_warning_last_shown', today);
      }
    }
  }, [enabled, warningShown, getClosingTime]);

  const extendClosingTime = useCallback(() => {
    const savedConfig = localStorage.getItem('pos_restaurant_config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        const currentHour = parseInt(config.closingHour || '23');
        const currentMinute = parseInt(config.closingMinute || '00');
        
        // Add 30 minutes
        let newMinute = currentMinute + 30;
        let newHour = currentHour;
        
        if (newMinute >= 60) {
          newMinute -= 60;
          newHour = (newHour + 1) % 24;
        }
        
        config.closingHour = newHour.toString().padStart(2, '0');
        config.closingMinute = newMinute.toString().padStart(2, '0');
        
        localStorage.setItem('pos_restaurant_config', JSON.stringify(config));
        setClosingTime(`${config.closingHour}:${config.closingMinute}`);
      } catch (e) {
        console.error('Error extending closing time:', e);
      }
    }
  }, []);

  const dismissWarning = useCallback(() => {
    setShowWarning(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Check immediately
    checkClosingTime();

    // Check every minute
    const interval = setInterval(checkClosingTime, 60000);

    return () => clearInterval(interval);
  }, [enabled, checkClosingTime]);

  // Reset warning shown flag at midnight
  useEffect(() => {
    const checkMidnight = () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        setWarningShown(false);
        localStorage.removeItem('closing_warning_last_shown');
      }
    };

    const interval = setInterval(checkMidnight, 60000);
    return () => clearInterval(interval);
  }, []);

  return {
    showWarning,
    closingTime,
    extendClosingTime,
    dismissWarning,
  };
};
