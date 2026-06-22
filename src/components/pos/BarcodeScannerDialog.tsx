import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Capacitor } from '@capacitor/core';
import { Camera as CapCamera } from '@capacitor/camera';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Camera, 
  CameraOff, 
  Flashlight, 
  FlashlightOff, 
  SwitchCamera,
  Keyboard,
  X,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useScanConfirmation } from '@/hooks/useScanConfirmation';

interface BarcodeScannerDialogProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export const BarcodeScannerDialog: React.FC<BarcodeScannerDialogProps> = ({
  open,
  onClose,
  onScan,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [isInitialized, setIsInitialized] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isStartingRef = useRef(false);
  const isMountedRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isNative = Capacitor.isNativePlatform();

  // Play beep sound
  const playBeep = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 1000;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch {
      // Audio not supported
    }
  }, []);

  // Confirmed scan handler - don't close dialog, just add to cart
  const handleConfirmedScan = useCallback((code: string) => {
    setLastScannedCode(code);
    onScan(code);
    playBeep();
    if (navigator.vibrate) navigator.vibrate(100);
    // Clear visual indicator after 1s but keep scanning
    setTimeout(() => setLastScannedCode(null), 1000);
  }, [onScan, playBeep]);

  const { submitScan: handleScan, reset: resetScanConfirmation } = useScanConfirmation(
    handleConfirmedScan,
    { requiredConfirmations: 2, cooldownMs: 800 }
  );

  // Request camera permission
  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setCameraError(null);
      
      if (isNative) {
        const status = await CapCamera.requestPermissions({ permissions: ['camera'] });
        if (status.camera === 'granted') {
          setPermissionState('granted');
          return true;
        } else {
          setPermissionState('denied');
          setCameraError('Camera permission denied. Please enable in Settings.');
          return false;
        }
      }
      
      // Web fallback
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      stream.getTracks().forEach(track => track.stop());
      setPermissionState('granted');
      return true;
    } catch (err: any) {
      console.error('Camera permission error:', err);
      setPermissionState('denied');
      setCameraError('Camera permission denied. Please enable camera access.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Stop all camera streams
  const stopAllStreams = useCallback(() => {
    if (isStartingRef.current) return;
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }
    
    if (scannerRef.current) {
      try {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    
    setIsScanning(false);
    setFlashOn(false);
    setIsInitialized(false);
  }, []);

  // Helper function to convert data URL to File
  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  // Start camera using getUserMedia + html5-qrcode canvas scanning
  const startCamera = async () => {
    if (isStartingRef.current || !isMountedRef.current) return;
    
    isStartingRef.current = true;
    setDebugInfo('Starting camera...');
    
    try {
      setIsLoading(true);
      setCameraError(null);

      const granted = await requestCameraPermission();
      if (!granted || !isMountedRef.current) {
        setShowManualInput(true);
        setIsLoading(false);
        isStartingRef.current = false;
        return;
      }

      // Wait for container with polling - handles slow Android WebView rendering
      let container: HTMLElement | null = null;
      for (let i = 0; i < 15; i++) {
        container = containerRef.current || document.getElementById('barcode-scanner-container');
        if (container) break;
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      if (!container || !isMountedRef.current) {
        setCameraError('Scanner container not found. Please close and reopen the scanner.');
        setIsLoading(false);
        isStartingRef.current = false;
        return;
      }

      container.innerHTML = '';

      // Try camera constraints - optimized for mobile barcode scanning
      let stream: MediaStream | null = null;
      const constraintsList = [
        { video: { facingMode: 'environment', width: { ideal: 640, max: 1280 }, height: { ideal: 480, max: 720 }, frameRate: { ideal: 15, max: 30 } } },
        { video: { facingMode: 'environment', width: 640, height: 480 } },
        { video: { facingMode: 'environment' } },
        { video: true },
      ];

      for (const constraints of constraintsList) {
        if (!isMountedRef.current) {
          isStartingRef.current = false;
          return;
        }
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (err) {
          console.log('Failed with constraints:', err);
        }
      }

      if (!stream) throw new Error('Could not access camera');

      if (!isMountedRef.current) {
        stream.getTracks().forEach(t => t.stop());
        isStartingRef.current = false;
        return;
      }

      streamRef.current = stream;

      // Create video element
      const video = document.createElement('video');
      video.setAttribute('autoplay', 'true');
      video.setAttribute('playsinline', 'true');
      video.setAttribute('muted', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'cover';
      video.style.borderRadius = '8px';
      video.style.backgroundColor = '#000';
      
      container.appendChild(video);
      videoRef.current = video;
      video.srcObject = stream;
      
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Video error'));
        setTimeout(() => reject(new Error('Video load timeout')), 5000);
      });

      try {
        await video.play();
      } catch {
        video.muted = true;
        await video.play();
      }

      if (!isMountedRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      setIsScanning(true);
      setIsInitialized(true);
      setCameraError(null);
      setIsLoading(false);
      setDebugInfo(`Camera active: ${video.videoWidth}x${video.videoHeight}`);

      // Check flash capability
      const track = stream.getVideoTracks()[0];
      if (track) {
        try {
          const capabilities = track.getCapabilities();
          setHasFlash(!!(capabilities as any).torch);
        } catch { setHasFlash(false); }
      }

      // Setup barcode scanning via canvas
      const canvas = document.createElement('canvas');
      canvasRef.current = canvas;
      
      let hiddenContainer = document.getElementById('barcode-scanner-hidden-reader');
      if (!hiddenContainer) {
        hiddenContainer = document.createElement('div');
        hiddenContainer.id = 'barcode-scanner-hidden-reader';
        hiddenContainer.style.display = 'none';
        document.body.appendChild(hiddenContainer);
      }

      const scanner = new Html5Qrcode('barcode-scanner-hidden-reader', {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
      });
      scannerRef.current = scanner;

      // Frame scanning loop - lower resolution & frequency on native for performance
      let isProcessing = false;
      let frameSkipCount = 0;
      const SCAN_W = isNative ? 320 : 640;
      const SCAN_H = isNative ? 240 : 480;
      canvas.width = SCAN_W;
      canvas.height = SCAN_H;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const SCAN_INTERVAL = isNative ? 350 : 150;
      
      scanIntervalRef.current = setInterval(async () => {
        // Skip 2 out of 3 frames on native to reduce CPU load
        if (isNative) {
          frameSkipCount++;
          if (frameSkipCount % 3 !== 0) return;
        }
        
        if (isProcessing || !videoRef.current || !canvasRef.current || !scannerRef.current || !ctx) return;
        
        const v = videoRef.current;
        if (v.readyState !== v.HAVE_ENOUGH_DATA) return;
        
        isProcessing = true;
        
        try {
          ctx.drawImage(v, 0, 0, SCAN_W, SCAN_H);
          const imageData = canvas.toDataURL('image/jpeg', 0.6);
          const result = await scannerRef.current.scanFile(
            dataURLtoFile(imageData, 'frame.jpg'),
            false
          );
          if (result) handleScan(result);
        } catch {
          // No barcode found
        } finally {
          isProcessing = false;
        }
      }, SCAN_INTERVAL);

    } catch (err: any) {
      console.error('Camera error:', err);
      setDebugInfo(`Error: ${err.message}`);
      setCameraError(`Camera error: ${err.message || 'Please use manual entry'}`);
      setShowManualInput(true);
      setIsLoading(false);
    } finally {
      isStartingRef.current = false;
    }
  };

  // Toggle flash
  const toggleFlash = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        try {
          await (track as any).applyConstraints({ advanced: [{ torch: !flashOn }] });
          setFlashOn(!flashOn);
        } catch (err) {
          console.error('Flash toggle error:', err);
        }
      }
    }
  };

  // Switch camera
  const switchCamera = async () => {
    if (cameras.length > 1) {
      stopAllStreams();
      const newIndex = (currentCameraIndex + 1) % cameras.length;
      setCurrentCameraIndex(newIndex);
      setTimeout(() => startCamera(), 100);
    }
  };

  // Retry
  const retryCamera = async () => {
    setCameraError(null);
    setShowManualInput(false);
    stopAllStreams();
    setTimeout(() => startCamera(), 100);
  };

  // Manual code submission
  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      handleScan(manualCode.trim());
      setManualCode('');
    }
  };

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isStartingRef.current = false;
    };
  }, []);

  // Handle dialog open/close
  useEffect(() => {
    if (open) {
      // Longer delay to ensure dialog and container are fully rendered
      const timer = setTimeout(() => {
        if (isMountedRef.current && !isInitialized && !isStartingRef.current) {
          startCamera();
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      isStartingRef.current = false;
      
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current = null;
      }
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => {});
          scannerRef.current.clear();
        } catch {}
        scannerRef.current = null;
      }
      
      setIsScanning(false);
      setFlashOn(false);
      setIsInitialized(false);
      setCameraError(null);
      setIsLoading(false);
      setShowManualInput(false);
      setDebugInfo('');
      resetScanConfirmation();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-3 sm:p-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            Barcode Scanner
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 pt-0">
          {/* Error Message */}
          {cameraError && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-destructive">{cameraError}</p>
                {permissionState === 'denied' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    📱 Android: Settings → Apps → MAXORA → Permissions → Camera<br/>
                    🍎 iOS: Settings → MAXORA → Camera → Allow
                  </p>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={retryCamera} className="shrink-0">
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && !cameraError && (
            <div className="flex items-center justify-center h-48 sm:h-64 bg-muted rounded-lg">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Starting camera...</p>
              </div>
            </div>
          )}

          {/* Camera View */}
          {!showManualInput && !isLoading && (
            <div className="relative">
              <div
                id="barcode-scanner-container"
                ref={containerRef}
                className="w-full h-48 sm:h-64 bg-black rounded-lg overflow-hidden"
              />
              
              {/* Debug info */}
              {isNative && debugInfo && (
                <div className="absolute top-1 left-1 right-1 bg-black/70 text-white text-xs p-1 rounded z-10">
                  {debugInfo}
                </div>
              )}
              
              {/* Scanning overlay */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 sm:w-64 h-28 sm:h-32 border-2 border-primary rounded-lg">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary rounded-tl" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary rounded-tr" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary rounded-bl" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary rounded-br" />
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary animate-pulse" 
                         style={{ animation: 'scanLine 2s ease-in-out infinite' }} />
                  </div>
                </div>
              )}

              {/* Camera controls */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                {isScanning ? (
                  <>
                    <Button size="icon" variant="secondary" onClick={stopAllStreams}
                      className="rounded-full bg-background/80 backdrop-blur h-9 w-9 sm:h-10 sm:w-10">
                      <CameraOff className="w-4 h-4" />
                    </Button>
                    
                    {hasFlash && (
                      <Button size="icon" variant="secondary" onClick={toggleFlash}
                        className={cn("rounded-full bg-background/80 backdrop-blur h-9 w-9 sm:h-10 sm:w-10", flashOn && "bg-yellow-500 text-black")}>
                        {flashOn ? <FlashlightOff className="w-4 h-4" /> : <Flashlight className="w-4 h-4" />}
                      </Button>
                    )}
                    
                    {cameras.length > 1 && (
                      <Button size="icon" variant="secondary" onClick={switchCamera}
                        className="rounded-full bg-background/80 backdrop-blur h-9 w-9 sm:h-10 sm:w-10">
                        <SwitchCamera className="w-4 h-4" />
                      </Button>
                    )}
                  </>
                ) : (
                  <Button onClick={startCamera} className="rounded-full text-sm" disabled={isLoading}>
                    <Camera className="w-4 h-4 mr-2" />
                    Start Camera
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Manual Input Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={showManualInput ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (!showManualInput) stopAllStreams();
                setShowManualInput(!showManualInput);
              }}
              className="flex-1 text-xs sm:text-sm"
            >
              <Keyboard className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
              {showManualInput ? 'Manual Entry Mode' : 'Enter Manually'}
            </Button>
            
            {showManualInput && !cameraError && (
              <Button variant="outline" size="sm"
                onClick={() => {
                  setShowManualInput(false);
                  setTimeout(() => startCamera(), 100);
                }}
                className="text-xs sm:text-sm">
                <Camera className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                Camera
              </Button>
            )}
          </div>

          {/* Manual Input */}
          {showManualInput && (
            <div className="space-y-2">
              <Label className="text-sm">Enter Barcode / SKU</Label>
              <div className="flex gap-2">
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Scan or type barcode..."
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                  data-barcode-input="true"
                  autoFocus
                  className="text-base"
                />
                <Button onClick={handleManualSubmit} className="shrink-0">Add</Button>
              </div>
            </div>
          )}

          {/* Last scanned */}
          {lastScannedCode && (
            <div className="text-center text-xs sm:text-sm text-muted-foreground">
              ✅ Scanned: <span className="font-mono font-bold text-foreground">{lastScannedCode}</span>
            </div>
          )}

          {/* Instructions */}
          <div className="text-[10px] sm:text-xs text-muted-foreground text-center space-y-0.5">
            <p>📷 Point camera at barcode to scan</p>
            <p>⌨️ USB/Bluetooth scanners work automatically</p>
          </div>
        </div>

        <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>

        <style>{`
          @keyframes scanLine {
            0%, 100% { top: 0; }
            50% { top: calc(100% - 2px); }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeScannerDialog;
