import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLocale } from '@/contexts/LocaleContext';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { countries, languages, CountryCode, LanguageCode } from '@/lib/i18n';
import {
  ArrowLeft, 
  Globe, 
  Languages, 
  Moon, 
  Sun, 
  Store,
  Bell,
  Shield,
  Printer,
  Receipt,
  Database,
  Users,
  Settings as SettingsIcon,
  ChevronRight,
  Smartphone,
  CreditCard,
  MapPin,
  Palette,
  Volume2,
  Wifi,
  HardDrive,
  Clock,
  ToggleLeft,
  UtensilsCrossed,
  Truck,
  ShoppingBag,
  Grid3X3,
  QrCode,
  VolumeX,
  Play,
  Upload,
  RefreshCw,
  CheckCircle,
  Activity,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import {
  getLocalBackupHistory,
  fetchBackupFromCloud,
  runManualBackup,
  restoreSnapshot,
  RecoverySnapshot,
  getBackupStatus,
  verifyBackupCounts,
  BackupStatus
} from '@/lib/backupUtils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdminOwnerSettings } from '@/components/pos/AdminOwnerSettings';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import { useFeatureToggles } from '@/hooks/useFeatureToggles';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePOS } from '@/contexts/POSContext';
import { QRAutomationSettings, DEFAULT_QR_SETTINGS } from '@/components/pos/BackgroundQROrderManager';

// Settings section item component
const SettingRow: React.FC<{
  icon: React.ElementType;
  label: string;
  description?: string;
  children: React.ReactNode;
  iconColor?: string;
}> = ({ icon: Icon, label, description, children, iconColor = 'text-primary' }) => (
  <div className="flex items-center justify-between py-3.5 border-b border-border/50 last:border-0">
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className={`w-9 h-9 rounded-lg bg-muted/80 flex items-center justify-center shrink-0`}>
        <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
      </div>
    </div>
    <div className="shrink-0 ml-3">{children}</div>
  </div>
);

// Settings group card
const SettingsGroup: React.FC<{
  title: string;
  icon: React.ElementType;
  iconColor?: string;
  children: React.ReactNode;
}> = ({ title, icon: Icon, iconColor = 'text-primary', children }) => (
  <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
    <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center">
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
    <div className="px-4">{children}</div>
  </div>
);

// Navigation item for section switching
const SectionNavItem: React.FC<{
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  iconColor?: string;
}> = ({ icon: Icon, label, active, onClick, iconColor }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all text-left ${
      active
        ? 'bg-primary/15 text-primary'
        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
    }`}
  >
    <Icon className={`w-4 h-4 ${active ? 'text-primary' : (iconColor || 'text-muted-foreground')}`} />
    <span className="text-sm font-medium">{label}</span>
    {active && <ChevronRight className="w-4 h-4 ml-auto text-primary" />}
  </button>
);

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, country, language, setCountry, setLanguage, currentCountry, availableLanguages } = useLocale();
  const { userRole } = useSupabaseAuth();
  const { theme, toggleTheme } = useTheme();
  const { getSetting, saveSetting, isLoaded } = useStoreSettings();
  const isMobile = useIsMobile();
  const { toggles, updateToggle } = useFeatureToggles();
  const [searchParams] = useSearchParams();
  const defaultSection = searchParams.get('tab') || searchParams.get('section') || 'general';
  const [activeSection, setActiveSection] = useState(defaultSection);

  const { activeStore } = usePOS();
  const storeId = activeStore?.id;
  const [qrSettings, setQrSettings] = useState<QRAutomationSettings>(DEFAULT_QR_SETTINGS);

  const [localHistory, setLocalHistory] = useState<RecoverySnapshot[]>([]);
  const [cloudSnapshot, setCloudSnapshot] = useState<RecoverySnapshot | null>(null);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<RecoverySnapshot | null>(null);
  const [backupStatus, setBackupStatusState] = useState<BackupStatus | null>(null);

  const loadBackups = async () => {
    if (!storeId) return;
    setLocalHistory(getLocalBackupHistory(storeId));
    setBackupStatusState(getBackupStatus(storeId));
    setLoadingCloud(true);
    try {
      const cloud = await fetchBackupFromCloud(storeId);
      setCloudSnapshot(cloud);
    } catch (e) {
      console.error('Failed to load cloud backup:', e);
    } finally {
      setLoadingCloud(false);
    }
  };

  const handleVerifyBackup = async () => {
    if (!storeId) return;
    setLoadingCloud(true);
    try {
      const cloud = await fetchBackupFromCloud(storeId);
      setCloudSnapshot(cloud);
      if (!cloud) {
        toast.error('No cloud backup found to verify.');
        return;
      }
      const match = verifyBackupCounts(storeId, cloud);
      setBackupStatusState(getBackupStatus(storeId));
      if (match) {
        toast.success('Backup verification successful: Cloud and local record counts match perfectly!');
      } else {
        toast.warning('Backup mismatch detected! Automatic re-sync initiated.');
        const success = restoreSnapshot(storeId, cloud, 'full');
        if (success) {
          toast.success('Database successfully re-synced from Cloud! Reloading page...');
          setTimeout(() => window.location.reload(), 1500);
        }
      }
    } catch (e) {
      console.error('Verification failed:', e);
      toast.error('Verification failed. Check internet connection.');
    } finally {
      setLoadingCloud(false);
    }
  };

  useEffect(() => {
    if (storeId) {
      loadBackups();
    }
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    try {
      const saved = localStorage.getItem(`qr_automation_settings_${storeId}`);
      if (saved) {
        setQrSettings(JSON.parse(saved));
      }
    } catch {}
  }, [storeId]);

  const saveQRSetting = async (updated: Partial<QRAutomationSettings>) => {
    if (!storeId) return;
    const newSettings = { ...qrSettings, ...updated };
    setQrSettings(newSettings);
    localStorage.setItem(`qr_automation_settings_${storeId}`, JSON.stringify(newSettings));
    
    try {
      await supabase
        .from('store_settings')
        .upsert({
          store_id: storeId,
          setting_key: 'qr_automation',
          setting_value: newSettings as any,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'store_id,setting_key' });
    } catch (e) {
      console.error('Failed to sync QR settings to Supabase:', e);
    }

    window.dispatchEvent(new Event('qr-settings-updated'));
    toast.success('QR Settings updated');
  };
  
  // Settings state backed by DB
  const [notifSettings, setNotifSettings] = useState({ newOrder: true, lowStock: true, cancelled: true });
  const [securitySettings, setSecuritySettings] = useState({ pinLogin: false, backup: true });
  const [printerSettings, setPrinterSettings] = useState({ printBill: true, printKOT: true });
  const [billingSettings, setBillingSettings] = useState({ tip: false, containerCharge: false, deliveryCharge: false });

  useEffect(() => {
    if (!isLoaded) return;
    const n = getSetting('pos_settings_notifications');
    if (n) setNotifSettings(prev => ({ ...prev, ...n }));
    const s = getSetting('pos_settings_security');
    if (s) setSecuritySettings(prev => ({ ...prev, ...s }));
    const p = getSetting('pos_settings_printer');
    if (p) setPrinterSettings(prev => ({ ...prev, ...p }));
    const b = getSetting('pos_settings_billing');
    if (b) setBillingSettings(prev => ({ ...prev, ...b }));
  }, [isLoaded, getSetting]);

  const updateNotif = (key: string, value: boolean) => {
    const updated = { ...notifSettings, [key]: value };
    setNotifSettings(updated);
    saveSetting('pos_settings_notifications', updated);
  };
  const updateSecurity = (key: string, value: boolean) => {
    const updated = { ...securitySettings, [key]: value };
    setSecuritySettings(updated);
    saveSetting('pos_settings_security', updated);
  };
  const updatePrinter = (key: string, value: boolean) => {
    const updated = { ...printerSettings, [key]: value };
    setPrinterSettings(updated);
    saveSetting('pos_settings_printer', updated);
  };
  const updateBilling = (key: string, value: boolean) => {
    const updated = { ...billingSettings, [key]: value };
    setBillingSettings(updated);
    saveSetting('pos_settings_billing', updated);
  };

  const isAdmin = userRole?.role === 'admin' || userRole?.role === 'super_admin';
  const isOwner = userRole?.role === 'owner';
  const { canAccess } = useSubscription();

  const handleCountryChange = (value: string) => {
    setCountry(value as CountryCode);
    toast.success(t('msg.saved'));
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value as LanguageCode);
    toast.success(t('msg.saved'));
  };

  const sections = [
    { id: 'general', label: t('settings.general'), icon: SettingsIcon, color: 'text-blue-400' },
    { id: 'features', label: 'Features', icon: ToggleLeft, color: 'text-emerald-400' },
    { id: 'qr_automation', label: 'QR Order Settings', icon: QrCode, color: 'text-orange-400' },
    { id: 'display', label: t('settings.display'), icon: Palette, color: 'text-purple-400' },
    { id: 'notifications', label: t('settings.notifications'), icon: Bell, color: 'text-amber-400' },
    { id: 'security', label: t('settings.security'), icon: Shield, color: 'text-green-400' },
    { id: 'printer', label: t('settings.printer'), icon: Printer, color: 'text-cyan-400' },
    { id: 'billing', label: t('settings.billing'), icon: Receipt, color: 'text-rose-400' },
    { id: 'backup', label: 'Backup & Recovery', icon: HardDrive, color: 'text-amber-500' },
    ...((isAdmin || isOwner) ? [{ id: 'admin', label: t('admin.ownerSettings'), icon: Users, color: 'text-orange-400' }] : []),
  ];

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'features':
        return (
          <div className="space-y-4">
            {/* Billing Mode */}
            <SettingsGroup title="Billing Mode" icon={Store} iconColor="text-emerald-400">
              <div className="py-3 space-y-3">
                <p className="text-xs text-muted-foreground">Select your business type. General Store hides restaurant-specific features (KOT, Tables, Dine-In).</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateToggle('billingMode', 'restaurant')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all border',
                      toggles.billingMode === 'restaurant'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                    )}
                  >
                    <UtensilsCrossed className="w-4 h-4" />
                    Restaurant
                  </button>
                  <button
                    onClick={() => updateToggle('billingMode', 'general')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all border',
                      toggles.billingMode === 'general'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                    )}
                  >
                    <Store className="w-4 h-4" />
                    General Store
                  </button>
                </div>
              </div>
            </SettingsGroup>

            {/* Feature Toggles */}
            <SettingsGroup title="Feature Toggles" icon={ToggleLeft} iconColor="text-emerald-400">
              <SettingRow icon={Grid3X3} label="Tables" description="Show/hide table management" iconColor="text-blue-400">
                <Switch checked={toggles.tableEnabled} onCheckedChange={(v) => updateToggle('tableEnabled', v)} />
              </SettingRow>
              <SettingRow icon={Receipt} label="KOT (Kitchen Order Ticket)" description="Hide KOT, KOT & Print buttons from billing" iconColor="text-orange-400">
                <Switch checked={toggles.kotEnabled} onCheckedChange={(v) => updateToggle('kotEnabled', v)} />
              </SettingRow>
              <SettingRow icon={Truck} label="Delivery" description="Show/hide delivery option" iconColor="text-cyan-400">
                <Switch checked={toggles.deliveryEnabled} onCheckedChange={(v) => updateToggle('deliveryEnabled', v)} />
              </SettingRow>
              <SettingRow icon={ShoppingBag} label="Takeaway" description="Show/hide takeaway option" iconColor="text-purple-400">
                <Switch checked={toggles.takeawayEnabled} onCheckedChange={(v) => updateToggle('takeawayEnabled', v)} />
              </SettingRow>
              <SettingRow icon={UtensilsCrossed} label="Dine-In" description="Show/hide dine-in option" iconColor="text-green-400">
                <Switch checked={toggles.dineInEnabled} onCheckedChange={(v) => updateToggle('dineInEnabled', v)} />
              </SettingRow>
            </SettingsGroup>

            {toggles.billingMode === 'general' && (
              <div className="p-3 rounded-xl bg-muted/50 border border-border/60 text-xs text-muted-foreground">
                💡 <strong>General Store Mode:</strong> KOT, Tables & Dine-In are auto-disabled. Billing focuses on direct sales with barcode scanning, cash/card payments.
              </div>
            )}
          </div>
        );

      case 'qr_automation':
        return (
          <div className="space-y-4">
            {/* QR Order Settings */}
            <SettingsGroup title="QR Order Automation Settings" icon={QrCode} iconColor="text-orange-400">
              <SettingRow icon={ToggleLeft} label="Enable Auto Accept" description="Automatically accept all valid incoming customer QR orders" iconColor="text-orange-400">
                <Switch 
                  checked={qrSettings.autoAcceptEnabled} 
                  onCheckedChange={(v) => saveQRSetting({ autoAcceptEnabled: v })} 
                />
              </SettingRow>

              {qrSettings.autoAcceptEnabled && (
                <div className="py-3 px-1 border-b border-border/50">
                  <div className="flex justify-between items-center text-sm font-medium mb-1">
                    <Label htmlFor="autoAcceptDelay">Auto Accept Delay (Seconds)</Label>
                    <span className="text-primary font-mono">{qrSettings.autoAcceptDelay}s</span>
                  </div>
                  <input
                    type="range"
                    id="autoAcceptDelay"
                    min="1"
                    max="15"
                    value={qrSettings.autoAcceptDelay}
                    onChange={(e) => saveQRSetting({ autoAcceptDelay: parseInt(e.target.value) })}
                    className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Order received hone ke maximum delay time accept pipeline me run hoga.
                  </p>
                </div>
              )}

              <SettingRow icon={Printer} label="Enable Auto Silent Print" description="Master switch to trigger print commands automatically" iconColor="text-cyan-400">
                <Switch 
                  checked={qrSettings.autoSilentPrintEnabled} 
                  onCheckedChange={(v) => saveQRSetting({ autoSilentPrintEnabled: v })} 
                />
              </SettingRow>

              {qrSettings.autoSilentPrintEnabled && (
                <>
                  <SettingRow icon={Printer} label="Auto Print Kitchen Ticket (KOT)" description="Print kitchen ticket immediately when accepted" iconColor="text-teal-400">
                    <Switch 
                      checked={qrSettings.autoPrintKOTEnabled} 
                      onCheckedChange={(v) => saveQRSetting({ autoPrintKOTEnabled: v })} 
                    />
                  </SettingRow>
                  <SettingRow icon={Receipt} label="Auto Print Customer Bill" description="Print customer receipt immediately when accepted" iconColor="text-cyan-400">
                    <Switch 
                      checked={qrSettings.autoPrintBillEnabled} 
                      onCheckedChange={(v) => saveQRSetting({ autoPrintBillEnabled: v })} 
                    />
                  </SettingRow>
                </>
              )}

              <SettingRow icon={Grid3X3} label="Enable Table Selector on QR Menu" description="Let customers select their table number during checkout" iconColor="text-orange-400">
                <Switch 
                  checked={qrSettings.qrTableSelectionEnabled} 
                  onCheckedChange={(v) => saveQRSetting({ qrTableSelectionEnabled: v })} 
                />
              </SettingRow>

              {qrSettings.qrTableSelectionEnabled && (
                <div className="py-3 px-1 border-b border-border/50">
                  <div className="flex justify-between items-center text-sm font-medium mb-1">
                    <Label htmlFor="activeQRTables">Active QR Tables Count</Label>
                    <span className="text-primary font-mono">{qrSettings.activeQRTables} Tables</span>
                  </div>
                  <input
                    type="range"
                    id="activeQRTables"
                    min="1"
                    max="30"
                    value={qrSettings.activeQRTables}
                    onChange={(e) => saveQRSetting({ activeQRTables: parseInt(e.target.value) })}
                    className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Customer select list options will be generated from Table 1 to Table {qrSettings.activeQRTables}.
                  </p>
                </div>
              )}
            </SettingsGroup>

            {/* Alert Settings */}
            <SettingsGroup title="QR Order Alert & Alarm Settings" icon={Volume2} iconColor="text-red-400">
              <SettingRow icon={Volume2} label="Enable Incoming Alert Alarm" description="Play loud continuous sound for new pending orders" iconColor="text-red-400">
                <Switch 
                  checked={qrSettings.alarmEnabled} 
                  onCheckedChange={(v) => saveQRSetting({ alarmEnabled: v })} 
                />
              </SettingRow>

              {qrSettings.alarmEnabled && (
                <>
                  <div className="py-3 px-1 border-b border-border/50 space-y-2">
                    <div className="flex justify-between items-center text-sm font-medium">
                      <Label htmlFor="alarmVolume">Alarm Volume</Label>
                      <span className="text-primary font-mono">{Math.round(qrSettings.alarmVolume * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <VolumeX className="w-4 h-4 text-muted-foreground" />
                      <input
                        type="range"
                        id="alarmVolume"
                        min="0"
                        max="1"
                        step="0.05"
                        value={qrSettings.alarmVolume}
                        onChange={(e) => saveQRSetting({ alarmVolume: parseFloat(e.target.value) })}
                        className="flex-1 h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <Volume2 className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="py-3 px-1 border-b border-border/50 space-y-2">
                    <Label className="text-sm font-semibold">Sound Source</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={!qrSettings.customAlarmSound ? "default" : "outline"}
                        size="sm"
                        onClick={() => saveQRSetting({ customAlarmSound: null })}
                        className="flex-1 text-xs"
                      >
                        Default Beep
                      </Button>
                      <div className="flex-1 relative">
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                saveQRSetting({ customAlarmSound: event.target?.result as string });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                          id="custom-audio-upload"
                        />
                        <Button
                          asChild
                          variant={qrSettings.customAlarmSound ? "default" : "outline"}
                          size="sm"
                          className="w-full text-xs cursor-pointer"
                        >
                          <label htmlFor="custom-audio-upload">
                            <Upload className="w-3.5 h-3.5 mr-1" />
                            {qrSettings.customAlarmSound ? 'Custom Ringtone' : 'Upload custom'}
                          </label>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="py-2.5 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent('qr-test-alarm', {
                            detail: {
                              volume: qrSettings.alarmVolume,
                              sound: qrSettings.customAlarmSound,
                            },
                          })
                        );
                        toast.success('Test alarm triggered');
                      }}
                      className="text-xs"
                    >
                      <Play className="w-3.5 h-3.5 mr-1" /> Test Alarm
                    </Button>
                  </div>
                </>
              )}
            </SettingsGroup>

            {/* Notification Settings */}
            <SettingsGroup title="Customer Notifications Settings" icon={Bell} iconColor="text-indigo-400">
              <SettingRow icon={Smartphone} label="Enable WhatsApp Notifications" description="Dispatches WhatsApp order status updates to customer" iconColor="text-green-500">
                <Switch 
                  checked={qrSettings.whatsappNotificationsEnabled} 
                  onCheckedChange={(v) => saveQRSetting({ whatsappNotificationsEnabled: v })} 
                />
              </SettingRow>

              <SettingRow icon={Bell} label="Enable App Push Alerts" description="Sends browser popups if desktop tab is in background" iconColor="text-indigo-400">
                <Switch 
                  checked={qrSettings.customerNotificationsEnabled} 
                  onCheckedChange={(v) => saveQRSetting({ customerNotificationsEnabled: v })} 
                />
              </SettingRow>
            </SettingsGroup>
          </div>
        );

      case 'general':
        return (
          <div className="space-y-4">
            <SettingsGroup title={t('settings.country')} icon={Globe} iconColor="text-blue-400">
              <SettingRow icon={MapPin} label={t('settings.country')} description={currentCountry?.name} iconColor="text-blue-400">
                <Select value={country} onValueChange={handleCountryChange}>
                  <SelectTrigger className="w-[140px] h-9 text-xs bg-muted/50 border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(countries).map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="flex items-center gap-2">
                          <span>{c.flag}</span>
                          <span>{c.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingRow>
              <SettingRow icon={CreditCard} label={t('settings.currency')} description={currentCountry?.currency?.code} iconColor="text-emerald-400">
                <span className="text-sm text-muted-foreground font-medium">{currentCountry?.currency?.symbol}</span>
              </SettingRow>
            </SettingsGroup>

            <SettingsGroup title={t('settings.language')} icon={Languages} iconColor="text-purple-400">
              <SettingRow icon={Languages} label={t('settings.language')} description={languages[language]?.nativeName} iconColor="text-purple-400">
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-[140px] h-9 text-xs bg-muted/50 border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLanguages.map((langCode) => (
                      <SelectItem key={langCode} value={langCode}>
                        {languages[langCode]?.nativeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingRow>
            </SettingsGroup>
          </div>
        );

      case 'display':
        return (
          <SettingsGroup title={t('settings.display')} icon={Palette} iconColor="text-purple-400">
            <SettingRow icon={theme === 'dark' ? Moon : Sun} label={t('settings.theme')} description={theme === 'dark' ? t('settings.darkMode') : t('settings.lightMode')} iconColor="text-purple-400">
              <div className="flex items-center gap-2">
                <Sun className="w-3.5 h-3.5 text-muted-foreground" />
                <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
                <Moon className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </SettingRow>
          </SettingsGroup>
        );

      case 'notifications':
        return (
          <SettingsGroup title={t('settings.notifications')} icon={Bell} iconColor="text-amber-400">
            <SettingRow icon={Bell} label={t('orders.newOrder')} description="New order alerts" iconColor="text-amber-400">
              <Switch checked={notifSettings.newOrder} onCheckedChange={(v) => updateNotif('newOrder', v)} />
            </SettingRow>
            <SettingRow icon={Database} label={t('inventory.lowStock')} description="Stock warning alerts" iconColor="text-red-400">
              <Switch checked={notifSettings.lowStock} onCheckedChange={(v) => updateNotif('lowStock', v)} />
            </SettingRow>
            <SettingRow icon={Bell} label={t('orders.cancelled')} description="Cancellation alerts" iconColor="text-rose-400">
              <Switch checked={notifSettings.cancelled} onCheckedChange={(v) => updateNotif('cancelled', v)} />
            </SettingRow>
          </SettingsGroup>
        );

      case 'security':
        return (
          <SettingsGroup title={t('settings.security')} icon={Shield} iconColor="text-green-400">
            <SettingRow icon={Shield} label={t('staff.pin')} description={t('auth.enterPin')} iconColor="text-green-400">
              <Switch checked={securitySettings.pinLogin} onCheckedChange={(v) => updateSecurity('pinLogin', v)} />
            </SettingRow>
            <SettingRow icon={HardDrive} label={t('settings.backup')} description={t('common.enabled')} iconColor="text-blue-400">
              <Switch checked={securitySettings.backup} onCheckedChange={(v) => updateSecurity('backup', v)} />
            </SettingRow>
          </SettingsGroup>
        );

      case 'printer':
        return (
          <SettingsGroup title={t('settings.printer')} icon={Printer} iconColor="text-cyan-400">
            <SettingRow icon={Receipt} label={t('pos.printBill')} description="Auto print on checkout" iconColor="text-cyan-400">
              <Switch checked={printerSettings.printBill} onCheckedChange={(v) => updatePrinter('printBill', v)} />
            </SettingRow>
            {canAccess('kot') && (
              <SettingRow icon={Printer} label={t('pos.printKOT')} description="Kitchen order ticket" iconColor="text-teal-400">
                <Switch checked={printerSettings.printKOT} onCheckedChange={(v) => updatePrinter('printKOT', v)} />
              </SettingRow>
            )}
          </SettingsGroup>
        );

      case 'billing':
        return (
          <SettingsGroup title={t('settings.billing')} icon={Receipt} iconColor="text-rose-400">
            <SettingRow icon={CreditCard} label={t('pos.tip')} description="Enable tip option" iconColor="text-rose-400">
              <Switch checked={billingSettings.tip} onCheckedChange={(v) => updateBilling('tip', v)} />
            </SettingRow>
            <SettingRow icon={Store} label={t('pos.containerCharge')} description="Packaging charges" iconColor="text-orange-400">
              <Switch checked={billingSettings.containerCharge} onCheckedChange={(v) => updateBilling('containerCharge', v)} />
            </SettingRow>
            <SettingRow icon={MapPin} label={t('pos.deliveryCharge')} description="Delivery fee" iconColor="text-indigo-400">
              <Switch checked={billingSettings.deliveryCharge} onCheckedChange={(v) => updateBilling('deliveryCharge', v)} />
            </SettingRow>
          </SettingsGroup>
        );

      case 'backup':
        return (
          <div className="space-y-4">
            {/* Backup Status Overview */}
            <SettingsGroup title="Backup Status Overview" icon={Activity} iconColor="text-primary">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/20 border border-border/50 rounded-xl">
                {/* Last Backup Time */}
                <div className="p-3 bg-card border border-border/40 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    Last Backup
                  </div>
                  <p className="text-sm font-bold text-white leading-tight">
                    {backupStatus?.lastBackupTime ? new Date(backupStatus.lastBackupTime).toLocaleString() : 'Never'}
                  </p>
                </div>

                {/* Last Restore Time */}
                <div className="p-3 bg-card border border-border/40 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    Last Restore
                  </div>
                  <p className="text-sm font-bold text-white leading-tight">
                    {backupStatus?.lastRestoreTime ? new Date(backupStatus.lastRestoreTime).toLocaleString() : 'Never'}
                  </p>
                </div>

                {/* Total Records Backed Up */}
                <div className="p-3 bg-card border border-border/40 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                    <Database className="w-3.5 h-3.5 text-indigo-400" />
                    Total Records
                  </div>
                  <p className="text-sm font-bold text-white leading-tight">
                    {backupStatus?.totalRecordsBackedUp ?? 0}
                  </p>
                </div>

                {/* Backup Status */}
                <div className="p-3 bg-card border border-border/40 rounded-lg space-y-1">
                  <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Backup Status</div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      backupStatus?.backupStatus === 'success' && "bg-emerald-500",
                      backupStatus?.backupStatus === 'failed' && "bg-destructive",
                      backupStatus?.backupStatus === 'syncing' && "bg-amber-500 animate-pulse",
                      (!backupStatus || backupStatus?.backupStatus === 'idle') && "bg-muted-foreground"
                    )} />
                    <span className="text-sm font-bold capitalize">
                      {backupStatus?.backupStatus ?? 'idle'}
                    </span>
                  </div>
                </div>

                {/* Restore Status */}
                <div className="p-3 bg-card border border-border/40 rounded-lg space-y-1">
                  <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Restore Status</div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      backupStatus?.restoreStatus === 'success' && "bg-emerald-500",
                      backupStatus?.restoreStatus === 'failed' && "bg-destructive",
                      backupStatus?.restoreStatus === 'no_backup_found' && "bg-blue-400",
                      (!backupStatus || backupStatus?.restoreStatus === 'idle') && "bg-muted-foreground"
                    )} />
                    <span className="text-sm font-bold capitalize">
                      {backupStatus?.restoreStatus?.replace(/_/g, ' ') ?? 'idle'}
                    </span>
                  </div>
                </div>

                {/* Sync Status */}
                <div className="p-3 bg-card border border-border/40 rounded-lg space-y-1">
                  <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Sync Status</div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      backupStatus?.syncStatus === 'synced' && "bg-emerald-500",
                      backupStatus?.syncStatus === 'mismatch' && "bg-destructive animate-pulse",
                      backupStatus?.syncStatus === 'offline' && "bg-blue-400",
                      (!backupStatus || backupStatus?.syncStatus === 'pending') && "bg-amber-400"
                    )} />
                    <span className="text-sm font-bold capitalize">
                      {backupStatus?.syncStatus ?? 'synced'}
                    </span>
                  </div>
                </div>
              </div>
            </SettingsGroup>

            {/* Backup & Recovery Actions */}
            <SettingsGroup title="Backup & Recovery Actions" icon={HardDrive} iconColor="text-amber-500">
              <div className="p-4 bg-muted/30 rounded-xl space-y-3 border border-border/50">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Perform manual operations to backup, verify, or restore your business configuration database arrays.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button 
                    type="button" 
                    onClick={async () => {
                      if (!storeId) return;
                      const res = await runManualBackup(storeId);
                      if (res) {
                        loadBackups();
                      }
                    }} 
                    className="text-xs font-semibold py-2.5 h-auto bg-amber-500 hover:bg-amber-600 text-white border-0"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" /> Backup Now
                  </Button>

                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={handleVerifyBackup} 
                    disabled={loadingCloud} 
                    className="text-xs font-semibold py-2.5 h-auto border-blue-500/30 hover:bg-blue-500/5 hover:border-blue-500/50"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loadingCloud && "animate-spin")} /> Verify Backup
                  </Button>

                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={loadBackups} 
                    disabled={loadingCloud} 
                    className="text-xs font-semibold py-2.5 h-auto"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loadingCloud && "animate-spin")} /> 
                    Refresh Backups
                  </Button>
                </div>
              </div>
            </SettingsGroup>

            <SettingsGroup title="Available Recovery Snapshots" icon={Database} iconColor="text-blue-400">
              <div className="py-2 space-y-3">
                {localHistory.length === 0 && !cloudSnapshot ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No snapshots available on this device.</p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Select a snapshot to view restore options:</p>
                    
                    {/* Cloud Backup */}
                    {cloudSnapshot && (
                      <div 
                        onClick={() => setSelectedSnapshot(cloudSnapshot)}
                        className={cn(
                          "p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center",
                          selectedSnapshot?.id === cloudSnapshot.id 
                            ? "border-amber-500 bg-amber-500/10" 
                            : "border-border/50 bg-[#14152e] hover:border-amber-500/50"
                        )}
                      >
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Cloud Master Snapshot (Supabase)
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Created: {new Date(cloudSnapshot.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <CheckCircle2 className={cn("w-4 h-4 text-amber-500", selectedSnapshot?.id === cloudSnapshot.id ? "opacity-100" : "opacity-0")} />
                      </div>
                    )}

                    {/* Local Backups */}
                    {localHistory.map((snap, idx) => (
                      <div 
                        key={snap.id}
                        onClick={() => setSelectedSnapshot(snap)}
                        className={cn(
                          "p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center",
                          selectedSnapshot?.id === snap.id 
                            ? "border-amber-500 bg-amber-500/10" 
                            : "border-border/50 bg-[#14152e] hover:border-amber-500/50"
                        )}
                      >
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            Local Backup History #{idx + 1}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Created: {new Date(snap.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <CheckCircle2 className={cn("w-4 h-4 text-amber-500", selectedSnapshot?.id === snap.id ? "opacity-100" : "opacity-0")} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SettingsGroup>

            {selectedSnapshot && (
              <SettingsGroup title="Restore Options (Selected Snapshot)" icon={Shield} iconColor="text-green-400">
                <div className="p-3 space-y-4">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-500 leading-relaxed">
                    ⚠️ <strong>Restoring data</strong> current database arrays ko overwrite karega. Kripya execute karne se pehle verify karein.
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="text-xs font-semibold py-3 h-auto"
                      onClick={() => {
                        if (!storeId || !selectedSnapshot) return;
                        if (window.confirm('Restore Menu?\n\nThis will restore Menu Items and Categories. Are you sure?')) {
                          const success = restoreSnapshot(storeId, selectedSnapshot, 'menu');
                          if (success) {
                            toast.success('Menu items restored successfully! Reloading...');
                            setTimeout(() => window.location.reload(), 1500);
                          }
                        }
                      }}
                    >
                      Restore Menu
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="text-xs font-semibold py-3 h-auto"
                      onClick={() => {
                        if (!storeId || !selectedSnapshot) return;
                        if (window.confirm('Restore Reports?\n\nThis will restore Orders, Expenses, Customers, and Credit Ledger. Are you sure?')) {
                          const success = restoreSnapshot(storeId, selectedSnapshot, 'reports');
                          if (success) {
                            toast.success('Reports data restored successfully! Reloading...');
                            setTimeout(() => window.location.reload(), 1500);
                          }
                        }
                      }}
                    >
                      Restore Reports
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="text-xs font-semibold py-3 h-auto"
                      onClick={() => {
                        if (!storeId || !selectedSnapshot) return;
                        if (window.confirm('Restore Inventory?\n\nThis will restore Inventory quantities and cost configurations. Are you sure?')) {
                          const success = restoreSnapshot(storeId, selectedSnapshot, 'inventory');
                          if (success) {
                            toast.success('Inventory restored successfully! Reloading...');
                            setTimeout(() => window.location.reload(), 1500);
                          }
                        }
                      }}
                    >
                      Restore Inventory
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="text-xs font-semibold py-3 h-auto"
                      onClick={() => {
                        if (!storeId || !selectedSnapshot) return;
                        if (window.confirm('Restore Settings?\n\nThis will restore all app preferences, printer configs, and tax values. Are you sure?')) {
                          const success = restoreSnapshot(storeId, selectedSnapshot, 'settings');
                          if (success) {
                            toast.success('App settings restored successfully! Reloading...');
                            setTimeout(() => window.location.reload(), 1500);
                          }
                        }
                      }}
                    >
                      Restore Settings
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="text-xs font-semibold py-3 h-auto col-span-2 border-amber-500/50 hover:bg-amber-500/10"
                      onClick={() => {
                        if (!storeId || !selectedSnapshot) return;
                        if (window.confirm('Restore Selected Snapshot?\n\nThis will restore all sections in this snapshot. Are you sure?')) {
                          const success = restoreSnapshot(storeId, selectedSnapshot, 'full');
                          if (success) {
                            toast.success('Snapshot restored successfully! Reloading...');
                            setTimeout(() => window.location.reload(), 1500);
                          }
                        }
                      }}
                    >
                      Restore Backup
                    </Button>

                    <Button
                      type="button"
                      variant="destructive"
                      className="text-xs font-bold py-3.5 h-auto col-span-2 shadow-lg"
                      onClick={() => {
                        if (!storeId || !selectedSnapshot) return;
                        if (window.confirm('WARNING: Full Store Restore?\n\nThis is a critical operation. All current store settings, menu items, order histories, customers, and inventory will be replaced. Are you sure?')) {
                          const success = restoreSnapshot(storeId, selectedSnapshot, 'full');
                          if (success) {
                            toast.success('Full store restored successfully! Reloading...');
                            setTimeout(() => window.location.reload(), 1500);
                          }
                        }
                      }}
                    >
                      Full Store Restore
                    </Button>
                  </div>
                </div>
              </SettingsGroup>
            )}
          </div>
        );

      case 'admin':
        return isAdmin ? <AdminOwnerSettings /> : null;



      default:
        return null;
    }
  };

  // Mobile: scrollable section chips + content
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        {/* Mobile Header */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/50">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">{t('nav.settings')}</h1>
              <p className="text-xs text-muted-foreground">{sections.find(s => s.id === activeSection)?.label}</p>
            </div>
          </div>

          {/* Scrollable section chips */}
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                  activeSection === section.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                }`}
              >
                <section.icon className="w-3.5 h-3.5" />
                {section.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 pb-24 space-y-4">
          {renderSectionContent()}
        </div>
      </div>
    );
  }

  // Desktop: sidebar + content
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('nav.settings')}</h1>
            <p className="text-sm text-muted-foreground">{t('settings.general')}</p>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Sidebar navigation */}
          <div className="w-56 shrink-0">
            <div className="bg-card rounded-xl border border-border/60 p-2 space-y-0.5 sticky top-6">
              {sections.map((section) => (
                <SectionNavItem
                  key={section.id}
                  icon={section.icon}
                  label={section.label}
                  active={activeSection === section.id}
                  onClick={() => setActiveSection(section.id)}
                  iconColor={section.color}
                />
              ))}
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 min-w-0">
            {renderSectionContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
