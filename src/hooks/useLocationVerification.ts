import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LocationResult {
  success: boolean;
  distance?: number;
  latitude?: number;
  longitude?: number;
  error?: string;
}

interface StoreLocation {
  latitude: number;
  longitude: number;
}

const MAX_DISTANCE_METERS = 200;

export const useLocationVerification = () => {
  const [isVerifying, setIsVerifying] = useState(false);

  const getStoreLocation = useCallback(async (): Promise<StoreLocation | null> => {
    // First check localStorage for store login session
    const storeLogin = localStorage.getItem('store_login');
    if (storeLogin) {
      try {
        const parsed = JSON.parse(storeLogin);
        if (parsed.store_id) {
          const { data } = await supabase
            .from('stores')
            .select('latitude, longitude')
            .eq('id', parsed.store_id)
            .maybeSingle();
          
          if (data?.latitude && data?.longitude) {
            return { 
              latitude: Number(data.latitude), 
              longitude: Number(data.longitude) 
            };
          }
        }
      } catch (e) {
        console.error('Error parsing store login:', e);
      }
    }

    // Check staff session for store_id
    const staffSession = localStorage.getItem('pos_staff_session');
    if (staffSession) {
      try {
        const parsed = JSON.parse(staffSession);
        if (parsed.store_id) {
          const { data } = await supabase
            .from('stores')
            .select('latitude, longitude')
            .eq('id', parsed.store_id)
            .maybeSingle();
          
          if (data?.latitude && data?.longitude) {
            return { 
              latitude: Number(data.latitude), 
              longitude: Number(data.longitude) 
            };
          }
        }
      } catch (e) {
        console.error('Error parsing staff session:', e);
      }
    }

    // Fallback to localStorage store_location (for manual config)
    const stored = localStorage.getItem('store_location');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Error parsing store location:', e);
      }
    }
    
    return null;
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const verifyLocation = useCallback(async (): Promise<LocationResult> => {
    setIsVerifying(true);

    if (!navigator.geolocation) {
      setIsVerifying(false);
      return { success: false, error: 'Geolocation not supported' };
    }

    const storeLocation = await getStoreLocation();
    
    if (!storeLocation) {
      setIsVerifying(false);
      return { 
        success: false, 
        error: 'Store location not configured. Please set store coordinates in settings.' 
      };
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLon = position.coords.longitude;
          
          const distance = calculateDistance(
            userLat,
            userLon,
            storeLocation.latitude,
            storeLocation.longitude
          );

          setIsVerifying(false);

          if (distance <= MAX_DISTANCE_METERS) {
            resolve({ 
              success: true, 
              distance: Math.round(distance),
              latitude: userLat,
              longitude: userLon
            });
          } else {
            resolve({ 
              success: false, 
              distance: Math.round(distance),
              latitude: userLat,
              longitude: userLon,
              error: `You are ${Math.round(distance)}m away from store. Must be within ${MAX_DISTANCE_METERS}m.`
            });
          }
        },
        (error) => {
          setIsVerifying(false);
          let errorMessage = 'Location access denied';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location unavailable. Please try again.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
          }
          resolve({ success: false, error: errorMessage });
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    });
  }, [getStoreLocation]);

  const setStoreLocation = useCallback(async (latitude: number, longitude: number, storeId?: string) => {
    // Save to localStorage as fallback
    localStorage.setItem('store_location', JSON.stringify({ latitude, longitude }));
    
    // If storeId provided, update in database
    if (storeId) {
      const { error } = await supabase
        .from('stores')
        .update({ latitude, longitude })
        .eq('id', storeId);
      
      if (error) {
        console.error('Error updating store location:', error);
        return false;
      }
    }
    return true;
  }, []);

  const getCurrentLocation = useCallback((): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, []);

  return {
    verifyLocation,
    setStoreLocation,
    getCurrentLocation,
    isVerifying,
    maxDistance: MAX_DISTANCE_METERS
  };
};