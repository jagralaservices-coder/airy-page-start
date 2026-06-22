import { useCallback, useRef } from 'react';

export type SoundType = 'chime' | 'cash_register' | 'success_bell' | 'coin_drop' | 'digital_beep' | 'custom';

interface PaymentSoundConfig {
  enabled: boolean;
  volume: number; // 0-1
  repeatCount: number; // 1-3
  soundType: SoundType;
  customSoundUrl?: string;
  customSoundName?: string;
  duration: number; // seconds to keep playing (5-60)
  retryInterval: number; // seconds before replaying if no action (0 = disabled, 10-300)
}

const DEFAULT_CONFIG: PaymentSoundConfig = {
  enabled: true,
  volume: 0.8,
  repeatCount: 1,
  soundType: 'chime',
  duration: 5,
  retryInterval: 0,
};

// Track played payment IDs to prevent duplicate sounds
const playedPaymentIds = new Set<string>();
// Track active retry timers so they can be dismissed
const activeRetryTimers = new Map<string, ReturnType<typeof setTimeout>>();

const SOUND_PRESETS: Record<Exclude<SoundType, 'custom'>, (ctx: AudioContext, volume: number, startTime: number) => void> = {
  chime: (ctx, volume, startTime) => {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, startTime);
    osc1.frequency.setValueAtTime(659.25, startTime + 0.15);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, startTime + 0.15);
    osc2.frequency.setValueAtTime(783.99, startTime + 0.3);
    gain.gain.setValueAtTime(volume * 0.5, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.start(startTime);
    osc1.stop(startTime + 0.3);
    osc2.start(startTime + 0.15);
    osc2.stop(startTime + 0.5);
  },
  cash_register: (ctx, volume, startTime) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, startTime);
    osc.frequency.setValueAtTime(1200, startTime + 0.05);
    osc.frequency.setValueAtTime(1600, startTime + 0.1);
    osc.frequency.setValueAtTime(2000, startTime + 0.15);
    gain.gain.setValueAtTime(volume * 0.3, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.4);
  },
  success_bell: (ctx, volume, startTime) => {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, startTime);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1108.73, startTime);
    gain.gain.setValueAtTime(volume * 0.4, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.start(startTime);
    osc1.stop(startTime + 0.8);
    osc2.start(startTime);
    osc2.stop(startTime + 0.8);
  },
  coin_drop: (ctx, volume, startTime) => {
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = startTime + i * 0.08;
      osc.frequency.setValueAtTime(2000 + i * 500, t);
      gain.gain.setValueAtTime(volume * 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    }
  },
  digital_beep: (ctx, volume, startTime) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, startTime);
    gain.gain.setValueAtTime(volume * 0.4, startTime);
    gain.gain.setValueAtTime(0, startTime + 0.1);
    gain.gain.setValueAtTime(volume * 0.4, startTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.35);
  },
};

export function usePaymentSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getConfig = useCallback((): PaymentSoundConfig => {
    try {
      const saved = localStorage.getItem('pos_payment_sound_config');
      if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_CONFIG;
  }, []);

  const playSoundOnce = useCallback(async (config: PaymentSoundConfig) => {
    try {
      // Custom uploaded sound
      if (config.soundType === 'custom' && config.customSoundUrl) {
        for (let i = 0; i < config.repeatCount; i++) {
          await new Promise<void>((resolve) => {
            const audio = new Audio(config.customSoundUrl);
            audio.volume = config.volume;
            audio.onended = () => resolve();
            audio.onerror = () => resolve();
            audio.play().catch(() => resolve());
            setTimeout(() => resolve(), 3000);
          });
        }
        return;
      }

      // Preset sounds via Web Audio API
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const soundType = config.soundType || 'chime';
      const playFn = SOUND_PRESETS[soundType as Exclude<SoundType, 'custom'>] || SOUND_PRESETS.chime;

      const now = ctx.currentTime;
      // Calculate how many loops fit in the duration
      const singlePlayDuration = config.repeatCount * 0.6;
      const totalLoops = Math.max(1, Math.floor((config.duration || 5) / singlePlayDuration));

      for (let loop = 0; loop < totalLoops; loop++) {
        for (let i = 0; i < config.repeatCount; i++) {
          playFn(ctx, config.volume, now + loop * singlePlayDuration + i * 0.6);
        }
      }
    } catch (err) {
      console.warn('Payment sound failed:', err);
    }
  }, []);

  const playSuccessSound = useCallback(async (paymentId?: string) => {
    const config = getConfig();
    if (!config.enabled) return;

    // Prevent duplicate sound for same payment
    if (paymentId) {
      if (playedPaymentIds.has(paymentId)) return;
      playedPaymentIds.add(paymentId);
      setTimeout(() => playedPaymentIds.delete(paymentId), 300000);
    }

    // Play sound
    await playSoundOnce(config);

    // Setup retry if configured and not a test
    if (config.retryInterval > 0 && paymentId && !paymentId.startsWith('test-')) {
      const scheduleRetry = () => {
        const timer = setTimeout(async () => {
          // Check if payment was dismissed
          if (!activeRetryTimers.has(paymentId)) return;
          await playSoundOnce(config);
          // Schedule next retry
          scheduleRetry();
        }, config.retryInterval * 1000);
        activeRetryTimers.set(paymentId, timer);
      };
      scheduleRetry();
    }
  }, [getConfig, playSoundOnce]);

  const dismissPaymentSound = useCallback((paymentId: string) => {
    const timer = activeRetryTimers.get(paymentId);
    if (timer) {
      clearTimeout(timer);
      activeRetryTimers.delete(paymentId);
    }
  }, []);

  const dismissAllSounds = useCallback(() => {
    activeRetryTimers.forEach((timer) => clearTimeout(timer));
    activeRetryTimers.clear();
  }, []);

  return { playSuccessSound, dismissPaymentSound, dismissAllSounds, getConfig };
}
