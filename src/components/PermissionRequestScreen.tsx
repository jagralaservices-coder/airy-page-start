import React, { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';
import { Camera as CameraIcon, MapPin, Bell, Check, Loader2, ArrowRight, Settings } from 'lucide-react';
import MAXORAIcon from '@/assets/maxora-icon.jpg';

interface PermissionRequestScreenProps {
  onComplete: () => void;
}

type PermStatus = 'pending' | 'granted' | 'denied';

const STORAGE_KEY = 'perm_status';

const loadSavedStatus = (): { camera: PermStatus; location: PermStatus; notification: PermStatus } => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { camera: 'pending', location: 'pending', notification: 'pending' };
};

const saveStatus = (status: { camera: PermStatus; location: PermStatus; notification: PermStatus }) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
};

export const PermissionRequestScreen: React.FC<PermissionRequestScreenProps> = ({ onComplete }) => {
  const [statuses, setStatuses] = useState(loadSavedStatus);
  const [requesting, setRequesting] = useState<string | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || localStorage.getItem('permissions_requested') === 'true') {
      onComplete();
    }
  }, [onComplete]);

  const handleCameraPermission = useCallback(async () => {
    setRequesting('camera');
    let granted = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      granted = true;
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        try {
          const { Camera } = await import('@capacitor/camera');
          const result = await Camera.requestPermissions({ permissions: ['camera'] });
          granted = result.camera === 'granted';
        } catch {}
      }
    }

    const newStatuses = { ...statuses, camera: (granted ? 'granted' : 'denied') as PermStatus };
    setStatuses(newStatuses);
    saveStatus(newStatuses);
    setRequesting(null);
  }, [statuses]);

  const handleLocationPermission = useCallback(async () => {
    setRequesting('location');
    let granted = false;

    try {
      await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      granted = true;
    } catch (err: any) {
      if (err.code === 1) {
        try {
          const { Geolocation } = await import('@capacitor/geolocation');
          const result = await Geolocation.requestPermissions();
          granted = result.location === 'granted';
        } catch {}
      }
    }

    const newStatuses = { ...statuses, location: (granted ? 'granted' : 'denied') as PermStatus };
    setStatuses(newStatuses);
    saveStatus(newStatuses);
    setRequesting(null);
  }, [statuses]);

  const handleNotificationPermission = useCallback(async () => {
    setRequesting('notification');
    let granted = false;

    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const notifResult = await PushNotifications.requestPermissions();
      granted = notifResult.receive === 'granted';
      if (granted) await PushNotifications.register();
    } catch {
      if ('Notification' in window) {
        granted = (await Notification.requestPermission()) === 'granted';
      } else granted = true;
    }

    const newStatuses = { ...statuses, notification: (granted ? 'granted' : 'denied') as PermStatus };
    setStatuses(newStatuses);
    saveStatus(newStatuses);
    setRequesting(null);
  }, [statuses]);

  const handleComplete = () => {
    localStorage.setItem('permissions_requested', 'true');
    localStorage.removeItem(STORAGE_KEY);
    onComplete();
  };

  const openAppSettings = () => {
    const platform = Capacitor.getPlatform();
    if (platform === 'android') {
      alert(
        '📱 Permission Enable karne ke liye:\n\n' +
        '1. Phone Settings open karein\n2. "Apps" ya "Applications" mein jaayein\n' +
        '3. "MAXORA" dhundhein\n4. "Permissions" tap karein\n5. Camera aur Location enable karein'
      );
    } else if (platform === 'ios') {
      alert('📱 Settings app open karein -> "MAXORA" -> Camera & Location enable karein');
    }
  };

  const allGranted = statuses.camera === 'granted' && statuses.location === 'granted' && statuses.notification === 'granted';
  const hasAnyDenied = statuses.camera === 'denied' || statuses.location === 'denied' || statuses.notification === 'denied';

  const permissionItems = [
    { key: 'camera', icon: CameraIcon, label: 'Camera', desc: 'Barcode scanning ke liye', status: statuses.camera, onRequest: handleCameraPermission },
    { key: 'location', icon: MapPin, label: 'Location', desc: 'Staff attendance ke liye', status: statuses.location, onRequest: handleLocationPermission },
    { key: 'notification', icon: Bell, label: 'Notifications', desc: 'Order & salary alerts ke liye', status: statuses.notification, onRequest: handleNotificationPermission },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex flex-col items-center justify-center p-6">
      <div className="w-20 h-20 rounded-2xl overflow-hidden mb-6 shadow-lg">
        <img src={MAXORAIcon} alt="MAXORA" className="w-full h-full object-cover" />
      </div>

      <h1 className="text-2xl font-bold mb-2 text-center">Welcome to MAXORA</h1>
      <p className="text-muted-foreground text-center mb-6 max-w-sm">Har permission ko ek-ek karke Allow karein</p>

      <div className="w-full max-w-sm space-y-3 mb-6">
        {permissionItems.map(({ key, icon: Icon, label, desc, status, onRequest }) => (
          <div key={key} className="flex items-center gap-3 p-4 rounded-xl bg-card border">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            {status === 'granted' ? (
              <Check className="w-5 h-5 text-green-600" />
            ) : (
              <Button
                size="sm"
                variant={status === 'denied' ? 'outline' : 'default'}
                onClick={onRequest}
                disabled={requesting !== null}
                className={status === 'denied' ? 'text-orange-600 border-orange-300' : ''}
              >
                {requesting === key ? <Loader2 className="w-4 h-4 animate-spin" /> : status === 'denied' ? 'Retry' : 'Allow'}
              </Button>
            )}
          </div>
        ))}
      </div>

      {hasAnyDenied && (
        <button
          onClick={openAppSettings}
          className="flex items-center gap-2 text-primary font-medium mb-4 p-3 rounded-xl bg-primary/10 w-full max-w-sm justify-center text-sm"
        >
          <Settings className="w-4 h-4" />
          Settings mein jaake manually enable karein
        </button>
      )}

      <Button onClick={handleComplete} className="w-full max-w-sm h-14 text-lg">
        {allGranted ? 'Get Started' : 'Continue'} <ArrowRight className="w-5 h-5 ml-2" />
      </Button>

      <button onClick={handleComplete} className="mt-3 text-sm text-muted-foreground underline">
        Skip for now
      </button>
    </div>
  );
};
