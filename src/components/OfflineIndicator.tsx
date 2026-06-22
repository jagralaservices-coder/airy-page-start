import React, { useState, useEffect } from 'react';
import { WifiOff, CloudUpload, CheckCircle2 } from 'lucide-react';

// Count items still waiting to be flushed to the cloud across all stores
const countPending = (): number => {
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith('pos_failed_sync_queue_')) {
        try {
          const arr = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(arr)) total += arr.length;
        } catch {}
      } else if (key.startsWith('pos_deleted_')) {
        try {
          const arr = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(arr)) total += arr.length;
        } catch {}
      }
    }
  } catch {}
  return total;
};

export const OfflineIndicator: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pending, setPending] = useState<number>(() => countPending());
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    const refresh = () => setPending(countPending());

    const handleOnline = () => {
      setIsOffline(false);
      refresh();
      // Hide "synced" banner once the queue has drained
      const t = setInterval(() => {
        const n = countPending();
        setPending(n);
        if (n === 0) {
          setJustSynced(true);
          clearInterval(t);
          setTimeout(() => setJustSynced(false), 3000);
        }
      }, 1500);
      setTimeout(() => clearInterval(t), 30000);
    };
    const handleOffline = () => {
      setIsOffline(true);
      refresh();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    // Re-check pending count periodically and on storage events from other tabs
    const interval = setInterval(refresh, 5000);
    window.addEventListener('storage', refresh);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', refresh);
      clearInterval(interval);
    };
  }, []);

  if (isOffline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-warning text-warning-foreground text-center py-1.5 text-xs font-medium flex items-center justify-center gap-2 shadow-md">
        <WifiOff className="w-3.5 h-3.5" />
        Offline — your changes are saved on this device
        {pending > 0 && <span className="opacity-90">({pending} pending sync)</span>}
      </div>
    );
  }

  if (pending > 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-primary text-primary-foreground text-center py-1.5 text-xs font-medium flex items-center justify-center gap-2 shadow-md">
        <CloudUpload className="w-3.5 h-3.5 animate-pulse" />
        Syncing {pending} change{pending === 1 ? '' : 's'} to cloud…
      </div>
    );
  }

  if (justSynced) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-success text-success-foreground text-center py-1.5 text-xs font-medium flex items-center justify-center gap-2 shadow-md">
        <CheckCircle2 className="w-3.5 h-3.5" />
        All changes synced to cloud
      </div>
    );
  }

  return null;
};
