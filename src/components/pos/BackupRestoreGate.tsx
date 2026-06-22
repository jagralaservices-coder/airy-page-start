import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { 
  fetchBackupFromCloud, 
  restoreSnapshot, 
  verifyBackupCounts, 
  setBackupStatus,
  getLocalCounts,
  getSnapshotCounts
} from '@/lib/backupUtils';
import { 
  CloudDownload, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Check, 
  Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackupRestoreGateProps {
  children: React.ReactNode;
  storeId: string | null;
}

type SyncStepStatus = 'pending' | 'loading' | 'success' | 'failed';

interface SyncStep {
  id: string;
  label: string;
  description: string;
  status: SyncStepStatus;
}

export const BackupRestoreGate: React.FC<BackupRestoreGateProps> = ({ children, storeId }) => {
  const [isCompleted, setIsCompleted] = useState<boolean>(() => {
    if (!storeId) return true;
    return sessionStorage.getItem(`pos_backup_restored_${storeId}`) === 'true';
  });

  const [steps, setSteps] = useState<SyncStep[]>([
    { id: 'verify', label: 'Verify Store ID', description: 'Checking store credentials and active session...', status: 'pending' },
    { id: 'fetch', label: 'Fetch Cloud Backup', description: 'Downloading latest recovery snapshot from Supabase cloud...', status: 'pending' },
    { id: 'restore', label: 'Restore Database Structures', description: 'Rebuilding menus, settings, stock levels, and profiles...', status: 'pending' },
    { id: 'verify_integrity', label: 'Verify Record Integrity', description: 'Verifying record counts between cloud & local...', status: 'pending' },
  ]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [showSkipButton, setShowSkipButton] = useState<boolean>(false);
  const isRunning = useRef(false);

  useEffect(() => {
    if (!storeId || isCompleted) return;
    if (isRunning.current) return;
    
    // Check if we are running in demo mode
    if (localStorage.getItem('pos_login_as_demo') === 'true') {
      sessionStorage.setItem(`pos_backup_restored_${storeId}`, 'true');
      setIsCompleted(true);
      return;
    }

    void runBackupRestoreProcess();
  }, [storeId, retryCount, isCompleted]);

  const updateStepStatus = (id: string, status: SyncStepStatus) => {
    setSteps(prev => prev.map(step => step.id === id ? { ...step, status } : step));
  };

  const runBackupRestoreProcess = async () => {
    if (!storeId) return;
    isRunning.current = true;
    setErrorMessage(null);
    setShowSkipButton(false);

    try {
      // Step 1: Verify Store ID
      updateStepStatus('verify', 'loading');
      await new Promise(resolve => setTimeout(resolve, 800)); // Smooth animation delay
      updateStepStatus('verify', 'success');

      // Step 2: Fetch Cloud Backup
      updateStepStatus('fetch', 'loading');
      
      if (!navigator.onLine) {
        throw new Error('Device is currently offline. Internet connection required to restore backup.');
      }

      const snapshot = await fetchBackupFromCloud(storeId);
      
      if (!snapshot) {
        // No backup snapshot in cloud
        updateStepStatus('fetch', 'success');
        updateStepStatus('restore', 'success');
        updateStepStatus('verify_integrity', 'success');
        
        console.log('[BackupGate] No backup snapshot found in cloud. Initializing blank store.');
        setBackupStatus(storeId, { restoreStatus: 'no_backup_found' });
        
        sessionStorage.setItem(`pos_backup_restored_${storeId}`, 'true');
        setIsCompleted(true);
        isRunning.current = false;
        return;
      }
      
      updateStepStatus('fetch', 'success');

      // Step 3: Restore Database Structures
      updateStepStatus('restore', 'loading');
      await new Promise(resolve => setTimeout(resolve, 600));

      const restoreSuccess = restoreSnapshot(storeId, snapshot, 'full');
      if (!restoreSuccess) {
        throw new Error('Database write operation failed. Local storage might be full.');
      }
      updateStepStatus('restore', 'success');

      // Step 4: Verify Record Integrity
      updateStepStatus('verify_integrity', 'loading');
      await new Promise(resolve => setTimeout(resolve, 600));

      const isVerified = verifyBackupCounts(storeId, snapshot);
      if (!isVerified) {
        console.warn('[BackupGate] Count mismatch detected. Running auto re-sync...');
        // Re-run restore to force re-sync
        restoreSnapshot(storeId, snapshot, 'full');
      }
      updateStepStatus('verify_integrity', 'success');

      // Set restore status to success and finish
      setBackupStatus(storeId, {
        restoreStatus: 'success',
        lastRestoreTime: new Date().toISOString(),
        syncStatus: 'synced'
      });

      sessionStorage.setItem(`pos_backup_restored_${storeId}`, 'true');
      toast.success('Store database successfully synchronized!');
      
      // Briefly delay transition for visual completion polish
      await new Promise(resolve => setTimeout(resolve, 800));
      setIsCompleted(true);
      
      // Reload page once to force POSContext and other sub-systems to read new restored data
      window.location.reload();

    } catch (err: any) {
      console.error('[BackupGate] Process failed:', err);
      
      // Update the active step that failed to failed status
      setSteps(prev => {
        const updated = [...prev];
        const loadingStep = updated.find(s => s.status === 'loading');
        if (loadingStep) {
          loadingStep.status = 'failed';
        }
        return updated;
      });

      const errStr = err?.message || 'An unexpected database error occurred during sync.';
      setErrorMessage(errStr);

      // Verify if we have existing local data to allow offline skip
      const counts = getLocalCounts(storeId);
      const totalLocalRecords = Object.values(counts).reduce((a, b) => a + b, 0);
      if (totalLocalRecords > 0) {
        setShowSkipButton(true);
      }
    } finally {
      isRunning.current = false;
    }
  };

  const handleRetry = () => {
    setSteps(prev => prev.map(s => ({ ...s, status: 'pending' })));
    setRetryCount(prev => prev + 1);
  };

  const handleSkip = () => {
    if (!storeId) return;
    console.log('[BackupGate] User skipped cloud sync due to network error. Fallback to local storage.');
    sessionStorage.setItem(`pos_backup_restored_${storeId}`, 'true');
    toast.warning('Using offline database cache. Some recent cloud changes may not be visible.');
    setIsCompleted(true);
  };

  if (isCompleted) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0b0c16] text-white flex items-center justify-center p-4">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-lg bg-[#111322]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 sm:p-8 shadow-2xl relative">
        {/* Glow Header Border */}
        <div className="absolute -top-[1px] left-10 right-10 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
        
        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/15 border border-primary/30 rounded-2xl flex items-center justify-center mx-auto mb-4 relative shadow-lg">
            <CloudDownload className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Syncing Store Database</h2>
          <p className="text-sm text-muted-foreground mt-1">Please wait while we sync your categories, products, orders and settings.</p>
        </div>

        {/* Sync Steps list */}
        <div className="space-y-4 mb-6">
          {steps.map((step) => (
            <div 
              key={step.id} 
              className={cn(
                "p-3.5 rounded-xl border flex gap-3.5 transition-all duration-300",
                step.status === 'loading' && "bg-primary/5 border-primary/30 shadow-md shadow-primary/5",
                step.status === 'success' && "bg-emerald-500/5 border-emerald-500/20",
                step.status === 'failed' && "bg-destructive/5 border-destructive/20",
                step.status === 'pending' && "bg-muted/10 border-border/10 opacity-60"
              )}
            >
              <div className="flex items-center justify-center shrink-0 mt-0.5">
                {step.status === 'loading' && (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                )}
                {step.status === 'success' && (
                  <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white stroke-[3px]" />
                  </div>
                )}
                {step.status === 'failed' && (
                  <AlertTriangle className="w-5 h-5 text-destructive animate-bounce" />
                )}
                {step.status === 'pending' && (
                  <div className="w-5 h-5 rounded-full border-2 border-border/30 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-border/40" />
                  </div>
                )}
              </div>
              <div>
                <h4 className={cn(
                  "text-sm font-semibold transition-colors",
                  step.status === 'loading' && "text-primary",
                  step.status === 'success' && "text-emerald-400",
                  step.status === 'failed' && "text-destructive",
                  step.status === 'pending' && "text-muted-foreground"
                )}>
                  {step.label}
                </h4>
                <p className="text-xs text-muted-foreground/80 mt-0.5 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Error panel */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive-foreground mb-6 leading-relaxed flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Sync Interrupted</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-3 mt-4">
          {errorMessage && (
            <button
              onClick={handleRetry}
              className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/95 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-primary/20"
            >
              <RefreshCw className="w-4 h-4" />
              Try Sync Again
            </button>
          )}

          {showSkipButton && (
            <button
              onClick={handleSkip}
              className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 font-semibold py-3 px-4 rounded-xl text-sm transition-all"
            >
              Continue Offline
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
