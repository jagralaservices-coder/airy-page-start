import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Bell, Repeat, Upload, Music, Trash2, Timer, RotateCcw } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { usePaymentSound, SoundType } from '@/hooks/usePaymentSound';
import { useStoreSettings } from '@/hooks/useStoreSettings';

interface PaymentSoundConfig {
  enabled: boolean;
  volume: number;
  repeatCount: number;
  soundType: SoundType;
  customSoundUrl?: string;
  customSoundName?: string;
  duration: number;
  retryInterval: number;
}

const DEFAULT_CONFIG: PaymentSoundConfig = {
  enabled: true,
  volume: 0.8,
  repeatCount: 1,
  soundType: 'chime',
  duration: 5,
  retryInterval: 0,
};

const SOUND_OPTIONS: { value: SoundType; label: string; description: string }[] = [
  { value: 'chime', label: '🔔 Chime', description: 'Two-tone success chime' },
  { value: 'cash_register', label: '💰 Cash Register', description: 'Classic register sound' },
  { value: 'success_bell', label: '🎵 Success Bell', description: 'Harmonic bell ring' },
  { value: 'coin_drop', label: '🪙 Coin Drop', description: 'Rapid coin sounds' },
  { value: 'digital_beep', label: '📱 Digital Beep', description: 'Short digital tone' },
  { value: 'custom', label: '🎧 Custom Audio', description: 'Upload your own sound' },
];

const DURATION_OPTIONS = [
  { value: '3', label: '3 sec' },
  { value: '5', label: '5 sec' },
  { value: '10', label: '10 sec' },
  { value: '15', label: '15 sec' },
  { value: '30', label: '30 sec' },
  { value: '60', label: '1 min' },
];

const RETRY_OPTIONS = [
  { value: '0', label: 'Off' },
  { value: '10', label: '10 sec' },
  { value: '15', label: '15 sec' },
  { value: '30', label: '30 sec' },
  { value: '60', label: '1 min' },
  { value: '120', label: '2 min' },
  { value: '300', label: '5 min' },
];

export const PaymentSoundSettings: React.FC = () => {
  const [config, setConfig] = useState<PaymentSoundConfig>(DEFAULT_CONFIG);
  const { playSuccessSound } = usePaymentSound();
  const { getSetting, saveSetting } = useStoreSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const cloudConfig = getSetting<PaymentSoundConfig | null>('pos_payment_sound_config', null);
    if (cloudConfig) {
      setConfig({ ...DEFAULT_CONFIG, ...cloudConfig });
    } else {
      try {
        const saved = localStorage.getItem('pos_payment_sound_config');
        if (saved) setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(saved) });
      } catch {}
    }
  }, [getSetting]);

  const saveConfig = async (updated: PaymentSoundConfig) => {
    setConfig(updated);
    localStorage.setItem('pos_payment_sound_config', JSON.stringify(updated));
    await saveSetting('pos_payment_sound_config', updated);
  };

  const testSound = () => {
    localStorage.setItem('pos_payment_sound_config', JSON.stringify(config));
    playSuccessSound('test-' + Date.now());
    toast.success('Test sound played!');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/webm', 'audio/m4a', 'audio/x-m4a', 'audio/mp4'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|webm|m4a)$/i)) {
      toast.error('Please upload an audio file (MP3, WAV, OGG, M4A)');
      return;
    }

    if (file.size > 1024 * 1024) {
      toast.error('Audio file must be under 1MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      saveConfig({
        ...config,
        soundType: 'custom',
        customSoundUrl: dataUrl,
        customSoundName: file.name,
      });
      toast.success(`Uploaded: ${file.name}`);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeCustomSound = () => {
    saveConfig({
      ...config,
      soundType: 'chime',
      customSoundUrl: undefined,
      customSoundName: undefined,
    });
    toast.success('Custom sound removed');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Volume2 className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg text-foreground">Payment Sound Settings</h3>
      </div>

      {/* Enable/Disable */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
        <div>
          <Label className="font-medium">Enable Payment Sound</Label>
          <p className="text-sm text-muted-foreground">
            Play sound when payment is received
          </p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(enabled) => saveConfig({ ...config, enabled })}
        />
      </div>

      {config.enabled && (
        <>
          {/* Sound Type Selection */}
          <div className="p-4 rounded-xl border border-border">
            <Label className="font-medium flex items-center gap-2 mb-3">
              <Music className="w-4 h-4" />
              Notification Sound
            </Label>
            <div className="grid grid-cols-1 gap-2">
              {SOUND_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    if (option.value === 'custom' && !config.customSoundUrl) {
                      fileInputRef.current?.click();
                    } else {
                      saveConfig({ ...config, soundType: option.value });
                    }
                  }}
                  className={`flex items-center justify-between p-3 rounded-lg text-left transition-all ${
                    config.soundType === option.value
                      ? 'bg-primary/15 border-2 border-primary ring-1 ring-primary/30'
                      : 'bg-muted/40 border border-border hover:bg-muted/70'
                  }`}
                >
                  <div>
                    <span className="text-sm font-medium">{option.label}</span>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                  {config.soundType === option.value && (
                    <span className="text-xs text-primary font-semibold">Selected</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Sound Upload */}
          {config.soundType === 'custom' && (
            <div className="p-4 rounded-xl border border-dashed border-primary/50 bg-primary/5">
              {config.customSoundUrl ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium truncate max-w-[180px]">
                      {config.customSoundName || 'Custom Sound'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-3 h-3 mr-1" /> Replace
                    </Button>
                    <Button variant="destructive" size="sm" onClick={removeCustomSound}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" /> Upload Audio File (MP3, WAV, OGG, M4A)
                </Button>
              )}
              <p className="text-xs text-muted-foreground mt-2">Max file size: 1MB</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.m4a,.webm"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Duration - How long the sound plays */}
          <div className="p-4 rounded-xl border border-border">
            <Label className="font-medium flex items-center gap-2 mb-2">
              <Timer className="w-4 h-4" />
              Sound Duration
            </Label>
            <p className="text-xs text-muted-foreground mb-3">
              How long the notification sound should play
            </p>
            <Select
              value={(config.duration || 5).toString()}
              onValueChange={(v) => saveConfig({ ...config, duration: parseInt(v) })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Retry Interval - Replay if no action */}
          <div className="p-4 rounded-xl border border-border">
            <Label className="font-medium flex items-center gap-2 mb-2">
              <RotateCcw className="w-4 h-4" />
              Retry If No Action
            </Label>
            <p className="text-xs text-muted-foreground mb-3">
              Replay sound after this interval if payment is not acknowledged
            </p>
            <Select
              value={(config.retryInterval || 0).toString()}
              onValueChange={(v) => saveConfig({ ...config, retryInterval: parseInt(v) })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RETRY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(config.retryInterval || 0) > 0 && (
              <p className="text-xs text-primary mt-2">
                ⏰ Sound will repeat every {config.retryInterval}s until dismissed
              </p>
            )}
          </div>

          {/* Volume */}
          <div className="p-4 rounded-xl border border-border">
            <Label className="font-medium flex items-center gap-2 mb-3">
              {config.volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              Volume: {Math.round(config.volume * 100)}%
            </Label>
            <Slider
              value={[config.volume * 100]}
              onValueChange={([v]) => saveConfig({ ...config, volume: v / 100 })}
              min={10}
              max={100}
              step={10}
              className="w-full"
            />
          </div>

          {/* Repeat Count */}
          <div className="p-4 rounded-xl border border-border">
            <Label className="font-medium flex items-center gap-2 mb-2">
              <Repeat className="w-4 h-4" />
              Repeat Count
            </Label>
            <Select
              value={config.repeatCount.toString()}
              onValueChange={(v) => saveConfig({ ...config, repeatCount: parseInt(v) })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 time</SelectItem>
                <SelectItem value="2">2 times</SelectItem>
                <SelectItem value="3">3 times</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Test Button */}
          <Button onClick={testSound} variant="outline" className="w-full">
            <Bell className="w-4 h-4 mr-2" /> Test Payment Sound
          </Button>
        </>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Settings sync across all devices for this store
      </p>
    </div>
  );
};
