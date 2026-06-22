import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bike, Plus, Trash2, Edit2, Phone, MapPin, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface DeliveryBoy {
  id: string;
  name: string;
  phone: string;
  vehicleNumber: string;
  vehicleType: 'bike' | 'scooter' | 'bicycle' | 'car';
  isActive: boolean;
  maxOrdersPerTrip: number;
}

interface DeliveryBoyConfig {
  enableDeliveryTracking: boolean;
  autoAssignOrders: boolean;
  maxDeliveryRadius: number;
  deliveryChargePerKm: number;
  freeDeliveryAbove: number;
  enableFreeDelivery: boolean;
  enableDeliveryOTP: boolean;
  enableDeliveryPhoto: boolean;
  maxCODAmount: number;
  deliveryBoys: DeliveryBoy[];
}

interface DeliveryBoySettingsProps {
  onBack: () => void;
}

const defaultSettings: DeliveryBoyConfig = {
  enableDeliveryTracking: true,
  autoAssignOrders: false,
  maxDeliveryRadius: 10,
  deliveryChargePerKm: 5,
  freeDeliveryAbove: 500,
  enableFreeDelivery: true,
  enableDeliveryOTP: true,
  enableDeliveryPhoto: false,
  maxCODAmount: 5000,
  deliveryBoys: []
};

const DeliveryBoySettings: React.FC<DeliveryBoySettingsProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<DeliveryBoyConfig>(defaultSettings);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newDeliveryBoy, setNewDeliveryBoy] = useState<Omit<DeliveryBoy, 'id' | 'isActive'>>({
    name: '',
    phone: '',
    vehicleNumber: '',
    vehicleType: 'bike',
    maxOrdersPerTrip: 3
  });

  useEffect(() => {
    const saved = localStorage.getItem('delivery_boy_settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse delivery boy settings', e);
      }
    }
  }, []);

  const saveSettings = (newSettings: DeliveryBoyConfig) => {
    setSettings(newSettings);
    localStorage.setItem('delivery_boy_settings', JSON.stringify(newSettings));
    toast.success('Delivery settings saved');
  };

  const handleToggle = (key: keyof DeliveryBoyConfig, value: boolean) => {
    saveSettings({ ...settings, [key]: value });
  };

  const handleNumberChange = (key: keyof DeliveryBoyConfig, value: number) => {
    saveSettings({ ...settings, [key]: value });
  };

  const addDeliveryBoy = () => {
    if (!newDeliveryBoy.name || !newDeliveryBoy.phone) {
      toast.error('Name and phone are required');
      return;
    }
    const boy: DeliveryBoy = {
      id: Date.now().toString(),
      ...newDeliveryBoy,
      isActive: true
    };
    saveSettings({ ...settings, deliveryBoys: [...settings.deliveryBoys, boy] });
    setNewDeliveryBoy({ name: '', phone: '', vehicleNumber: '', vehicleType: 'bike', maxOrdersPerTrip: 3 });
    setShowAddForm(false);
  };

  const updateDeliveryBoy = (id: string, updates: Partial<DeliveryBoy>) => {
    const updated = settings.deliveryBoys.map(b => b.id === id ? { ...b, ...updates } : b);
    saveSettings({ ...settings, deliveryBoys: updated });
    setEditingId(null);
  };

  const deleteDeliveryBoy = (id: string) => {
    saveSettings({ ...settings, deliveryBoys: settings.deliveryBoys.filter(b => b.id !== id) });
    toast.success('Delivery boy removed');
  };

  const toggleDeliveryBoyStatus = (id: string) => {
    const boy = settings.deliveryBoys.find(b => b.id === id);
    if (boy) {
      updateDeliveryBoy(id, { isActive: !boy.isActive });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Delivery Boy Settings</h1>
            <p className="text-sm text-muted-foreground">Manage delivery personnel and settings</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Delivery Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Delivery Configuration
            </CardTitle>
            <CardDescription>Configure delivery rules and charges</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Enable Delivery Tracking</Label>
                <p className="text-sm text-muted-foreground">Track delivery in real-time</p>
              </div>
              <Switch
                checked={settings.enableDeliveryTracking}
                onCheckedChange={(v) => handleToggle('enableDeliveryTracking', v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Auto-Assign Orders</Label>
                <p className="text-sm text-muted-foreground">Automatically assign to available delivery boys</p>
              </div>
              <Switch
                checked={settings.autoAssignOrders}
                onCheckedChange={(v) => handleToggle('autoAssignOrders', v)}
              />
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Delivery Radius (km)</Label>
                <Input
                  type="number"
                  value={settings.maxDeliveryRadius}
                  onChange={(e) => handleNumberChange('maxDeliveryRadius', parseInt(e.target.value) || 5)}
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label>Delivery Charge per km (₹)</Label>
                <Input
                  type="number"
                  value={settings.deliveryChargePerKm}
                  onChange={(e) => handleNumberChange('deliveryChargePerKm', parseFloat(e.target.value) || 0)}
                  min={0}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Enable Free Delivery</Label>
                <p className="text-sm text-muted-foreground">Free delivery above certain amount</p>
              </div>
              <Switch
                checked={settings.enableFreeDelivery}
                onCheckedChange={(v) => handleToggle('enableFreeDelivery', v)}
              />
            </div>
            {settings.enableFreeDelivery && (
              <div className="space-y-2">
                <Label>Free Delivery Above (₹)</Label>
                <Input
                  type="number"
                  value={settings.freeDeliveryAbove}
                  onChange={(e) => handleNumberChange('freeDeliveryAbove', parseInt(e.target.value) || 0)}
                  min={0}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery Verification */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery Verification</CardTitle>
            <CardDescription>Configure delivery confirmation options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Enable Delivery OTP</Label>
                <p className="text-sm text-muted-foreground">Customer OTP verification on delivery</p>
              </div>
              <Switch
                checked={settings.enableDeliveryOTP}
                onCheckedChange={(v) => handleToggle('enableDeliveryOTP', v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Enable Delivery Photo</Label>
                <p className="text-sm text-muted-foreground">Take photo proof on delivery</p>
              </div>
              <Switch
                checked={settings.enableDeliveryPhoto}
                onCheckedChange={(v) => handleToggle('enableDeliveryPhoto', v)}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Maximum COD Amount (₹)</Label>
              <Input
                type="number"
                value={settings.maxCODAmount}
                onChange={(e) => handleNumberChange('maxCODAmount', parseInt(e.target.value) || 0)}
                min={0}
              />
              <p className="text-xs text-muted-foreground">Maximum cash on delivery amount allowed</p>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Boys List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bike className="w-5 h-5 text-primary" />
                  Delivery Boys
                </CardTitle>
                <CardDescription>Manage your delivery personnel</CardDescription>
              </div>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Delivery Boy
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {showAddForm && (
              <div className="p-4 border border-border rounded-lg bg-muted/30 space-y-4">
                <h4 className="font-medium">Add New Delivery Boy</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      value={newDeliveryBoy.name}
                      onChange={(e) => setNewDeliveryBoy({ ...newDeliveryBoy, name: e.target.value })}
                      placeholder="Enter name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone *</Label>
                    <Input
                      value={newDeliveryBoy.phone}
                      onChange={(e) => setNewDeliveryBoy({ ...newDeliveryBoy, phone: e.target.value })}
                      placeholder="Enter phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vehicle Number</Label>
                    <Input
                      value={newDeliveryBoy.vehicleNumber}
                      onChange={(e) => setNewDeliveryBoy({ ...newDeliveryBoy, vehicleNumber: e.target.value })}
                      placeholder="e.g., MH 01 AB 1234"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vehicle Type</Label>
                    <Select
                      value={newDeliveryBoy.vehicleType}
                      onValueChange={(v: any) => setNewDeliveryBoy({ ...newDeliveryBoy, vehicleType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bike">Bike</SelectItem>
                        <SelectItem value="scooter">Scooter</SelectItem>
                        <SelectItem value="bicycle">Bicycle</SelectItem>
                        <SelectItem value="car">Car</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Max Orders Per Trip</Label>
                    <Input
                      type="number"
                      value={newDeliveryBoy.maxOrdersPerTrip}
                      onChange={(e) => setNewDeliveryBoy({ ...newDeliveryBoy, maxOrdersPerTrip: parseInt(e.target.value) || 1 })}
                      min={1}
                      max={10}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={addDeliveryBoy}>Save</Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {settings.deliveryBoys.map((boy) => (
                <div
                  key={boy.id}
                  className={`p-4 border rounded-lg ${boy.isActive ? 'border-border bg-card' : 'border-border/50 bg-muted/50 opacity-60'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-muted-foreground" />
                      <h4 className="font-semibold">{boy.name}</h4>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteDeliveryBoy(boy.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{boy.phone}</span>
                    </div>
                    {boy.vehicleNumber && (
                      <div className="flex items-center gap-2">
                        <Bike className="w-4 h-4" />
                        <span>{boy.vehicleNumber}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="capitalize">{boy.vehicleType}</Badge>
                      <Badge variant="outline">Max {boy.maxOrdersPerTrip} orders</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      {boy.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <Switch
                      checked={boy.isActive}
                      onCheckedChange={() => toggleDeliveryBoyStatus(boy.id)}
                    />
                  </div>
                </div>
              ))}
            </div>

            {settings.deliveryBoys.length === 0 && !showAddForm && (
              <div className="text-center py-8 text-muted-foreground">
                <Bike className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No delivery boys added</p>
                <p className="text-sm">Add delivery personnel to start managing deliveries</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DeliveryBoySettings;
