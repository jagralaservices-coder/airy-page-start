import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

export interface PermissionStatus {
  camera: 'granted' | 'denied' | 'prompt' | 'unknown';
  location: 'granted' | 'denied' | 'prompt' | 'unknown';
}

export const useAppPermissions = () => {
  const [permissions, setPermissions] = useState<PermissionStatus>({
    camera: 'unknown',
    location: 'unknown'
  });
  const [isRequesting, setIsRequesting] = useState(false);

  // Request all permissions on app start (for native platforms)
  const requestAllPermissions = async () => {
    if (!Capacitor.isNativePlatform()) {
      console.log('Not a native platform, skipping permission requests');
      return;
    }

    setIsRequesting(true);
    
    try {
      // Request Camera Permission
      const cameraStatus = await Camera.requestPermissions({ permissions: ['camera'] });
      console.log('Camera permission:', cameraStatus.camera);
      
      // Request Location Permission
      const locationStatus = await Geolocation.requestPermissions();
      console.log('Location permission:', locationStatus.location);
      
      setPermissions({
        camera: cameraStatus.camera as any,
        location: locationStatus.location as any
      });
    } catch (error) {
      console.error('Error requesting permissions:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  // Check current permission status
  const checkPermissions = async () => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      const cameraStatus = await Camera.checkPermissions();
      const locationStatus = await Geolocation.checkPermissions();
      
      setPermissions({
        camera: cameraStatus.camera as any,
        location: locationStatus.location as any
      });
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  // Request individual permission
  const requestCameraPermission = async () => {
    if (!Capacitor.isNativePlatform()) {
      return 'granted';
    }
    
    try {
      const status = await Camera.requestPermissions({ permissions: ['camera'] });
      setPermissions(prev => ({ ...prev, camera: status.camera as any }));
      return status.camera;
    } catch (error) {
      console.error('Camera permission error:', error);
      return 'denied';
    }
  };

  const requestLocationPermission = async () => {
    if (!Capacitor.isNativePlatform()) {
      return 'granted';
    }
    
    try {
      const status = await Geolocation.requestPermissions();
      setPermissions(prev => ({ ...prev, location: status.location as any }));
      return status.location;
    } catch (error) {
      console.error('Location permission error:', error);
      return 'denied';
    }
  };

  // Auto-request permissions on mount (for Android)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Small delay to ensure app is fully initialized
      const timer = setTimeout(() => {
        requestAllPermissions();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, []);

  return {
    permissions,
    isRequesting,
    requestAllPermissions,
    requestCameraPermission,
    requestLocationPermission,
    checkPermissions
  };
};
