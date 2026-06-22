import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Users, Clock, Calendar, Phone, Edit2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

interface TableConfig {
  id: string;
  number: number;
  name?: string; // Custom alias like "Window Seat", "VIP 1"
  capacity: number;
  section: string;
  isActive: boolean;
}

interface TableSettingsConfig {
  enableAdvanceBooking: boolean;
  advanceBookingDays: number;
  minAdvanceHours: number;
  maxAdvanceHours: number;
  bookingSlotDuration: number;
  requirePhoneForBooking: boolean;
  requireDepositForBooking: boolean;
  depositAmount: number;
  autoReleaseMinutes: number;
  enableTableMerge: boolean;
  enableWaitlist: boolean;
  maxWaitlistSize: number;
  sections: string[];
  tables: TableConfig[];
}

interface TableSettingsProps {
  onBack: () => void;
}

const defaultSettings: TableSettingsConfig = {
  enableAdvanceBooking: true,
  advanceBookingDays: 7,
  minAdvanceHours: 2,
  maxAdvanceHours: 168,
  bookingSlotDuration: 60,
  requirePhoneForBooking: true,
  requireDepositForBooking: false,
  depositAmount: 500,
  autoReleaseMinutes: 15,
  enableTableMerge: true,
  enableWaitlist: true,
  maxWaitlistSize: 20,
  sections: ['Main Hall', 'Outdoor', 'Private Room', 'Bar Area'],
  tables: [
    { id: '1', number: 1, capacity: 2, section: 'Main Hall', isActive: true },
    { id: '2', number: 2, capacity: 4, section: 'Main Hall', isActive: true },
    { id: '3', number: 3, capacity: 4, section: 'Main Hall', isActive: true },
    { id: '4', number: 4, capacity: 6, section: 'Main Hall', isActive: true },
    { id: '5', number: 5, capacity: 2, section: 'Outdoor', isActive: true },
    { id: '6', number: 6, capacity: 4, section: 'Outdoor', isActive: true },
    { id: '7', number: 7, capacity: 8, section: 'Private Room', isActive: true },
    { id: '8', number: 8, capacity: 10, section: 'Private Room', isActive: true },
  ]
};

const TableSettings: React.FC<TableSettingsProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<TableSettingsConfig>(defaultSettings);
  const [newSection, setNewSection] = useState('');
  const [editingTable, setEditingTable] = useState<string | null>(null);
  const [newTable, setNewTable] = useState({ number: 0, name: '', capacity: 2, section: 'Main Hall' });
  const [showAddTable, setShowAddTable] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('table_settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse table settings', e);
      }
    }
  }, []);

  const saveSettings = (newSettings: TableSettingsConfig) => {
    setSettings(newSettings);
    localStorage.setItem('table_settings', JSON.stringify(newSettings));
    toast.success('Table settings saved');
  };

  const handleToggle = (key: keyof TableSettingsConfig, value: boolean) => {
    saveSettings({ ...settings, [key]: value });
  };

  const handleNumberChange = (key: keyof TableSettingsConfig, value: number) => {
    saveSettings({ ...settings, [key]: value });
  };

  const addSection = () => {
    if (!newSection.trim()) return;
    if (settings.sections.includes(newSection.trim())) {
      toast.error('Section already exists');
      return;
    }
    saveSettings({ ...settings, sections: [...settings.sections, newSection.trim()] });
    setNewSection('');
  };

  const removeSection = (section: string) => {
    const tablesInSection = settings.tables.filter(t => t.section === section);
    if (tablesInSection.length > 0) {
      toast.error('Cannot delete section with tables. Move or delete tables first.');
      return;
    }
    saveSettings({ ...settings, sections: settings.sections.filter(s => s !== section) });
  };

  const addTable = () => {
    if (newTable.number <= 0) {
      toast.error('Please enter a valid table number');
      return;
    }
    if (settings.tables.some(t => t.number === newTable.number)) {
      toast.error('Table number already exists');
      return;
    }
    const table: TableConfig = {
      id: Date.now().toString(),
      number: newTable.number,
      name: newTable.name || undefined,
      capacity: newTable.capacity,
      section: newTable.section,
      isActive: true
    };
    saveSettings({ ...settings, tables: [...settings.tables, table] });
    setNewTable({ number: 0, name: '', capacity: 2, section: settings.sections[0] || 'Main Hall' });
    setShowAddTable(false);
  };

  const updateTable = (id: string, updates: Partial<TableConfig>) => {
    const updatedTables = settings.tables.map(t => 
      t.id === id ? { ...t, ...updates } : t
    );
    saveSettings({ ...settings, tables: updatedTables });
    setEditingTable(null);
  };

  const deleteTable = (id: string) => {
    saveSettings({ ...settings, tables: settings.tables.filter(t => t.id !== id) });
    toast.success('Table deleted');
  };

  const toggleTableStatus = (id: string) => {
    const table = settings.tables.find(t => t.id === id);
    if (table) {
      updateTable(id, { isActive: !table.isActive });
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
            <h1 className="text-xl font-bold text-foreground">Table Settings</h1>
            <p className="text-sm text-muted-foreground">Manage tables and advance booking</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Advance Booking Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Advance Booking
            </CardTitle>
            <CardDescription>Configure table reservation and booking settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Enable Advance Booking</Label>
                <p className="text-sm text-muted-foreground">Allow customers to book tables in advance</p>
              </div>
              <Switch
                checked={settings.enableAdvanceBooking}
                onCheckedChange={(v) => handleToggle('enableAdvanceBooking', v)}
              />
            </div>

            {settings.enableAdvanceBooking && (
              <>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Advance Booking Days</Label>
                    <Input
                      type="number"
                      value={settings.advanceBookingDays}
                      onChange={(e) => handleNumberChange('advanceBookingDays', parseInt(e.target.value) || 1)}
                      min={1}
                      max={90}
                    />
                    <p className="text-xs text-muted-foreground">How many days in advance can customers book</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Booking Slot Duration (minutes)</Label>
                    <Select
                      value={settings.bookingSlotDuration.toString()}
                      onValueChange={(v) => handleNumberChange('bookingSlotDuration', parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Minimum Advance Hours</Label>
                    <Input
                      type="number"
                      value={settings.minAdvanceHours}
                      onChange={(e) => handleNumberChange('minAdvanceHours', parseInt(e.target.value) || 1)}
                      min={1}
                    />
                    <p className="text-xs text-muted-foreground">Minimum hours before booking allowed</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Auto-Release (minutes)</Label>
                    <Input
                      type="number"
                      value={settings.autoReleaseMinutes}
                      onChange={(e) => handleNumberChange('autoReleaseMinutes', parseInt(e.target.value) || 10)}
                      min={5}
                      max={60}
                    />
                    <p className="text-xs text-muted-foreground">Release table if customer doesn't arrive</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Require Phone Number
                    </Label>
                    <p className="text-sm text-muted-foreground">Phone is mandatory for booking</p>
                  </div>
                  <Switch
                    checked={settings.requirePhoneForBooking}
                    onCheckedChange={(v) => handleToggle('requirePhoneForBooking', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Require Deposit</Label>
                    <p className="text-sm text-muted-foreground">Collect advance deposit for booking</p>
                  </div>
                  <Switch
                    checked={settings.requireDepositForBooking}
                    onCheckedChange={(v) => handleToggle('requireDepositForBooking', v)}
                  />
                </div>
                {settings.requireDepositForBooking && (
                  <div className="space-y-2">
                    <Label>Deposit Amount (₹)</Label>
                    <Input
                      type="number"
                      value={settings.depositAmount}
                      onChange={(e) => handleNumberChange('depositAmount', parseInt(e.target.value) || 0)}
                      min={0}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Table Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Table Features
            </CardTitle>
            <CardDescription>Additional table management features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Enable Table Merge</Label>
                <p className="text-sm text-muted-foreground">Allow merging multiple tables for large groups</p>
              </div>
              <Switch
                checked={settings.enableTableMerge}
                onCheckedChange={(v) => handleToggle('enableTableMerge', v)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Enable Waitlist</Label>
                <p className="text-sm text-muted-foreground">Allow customers to join waitlist when full</p>
              </div>
              <Switch
                checked={settings.enableWaitlist}
                onCheckedChange={(v) => handleToggle('enableWaitlist', v)}
              />
            </div>
            {settings.enableWaitlist && (
              <div className="space-y-2">
                <Label>Maximum Waitlist Size</Label>
                <Input
                  type="number"
                  value={settings.maxWaitlistSize}
                  onChange={(e) => handleNumberChange('maxWaitlistSize', parseInt(e.target.value) || 10)}
                  min={5}
                  max={100}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sections Management */}
        <Card>
          <CardHeader>
            <CardTitle>Table Sections</CardTitle>
            <CardDescription>Organize tables into different areas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="New section name..."
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSection()}
              />
              <Button onClick={addSection}>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {settings.sections.map((section) => (
                <div
                  key={section}
                  className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full"
                >
                  <span className="text-sm">{section}</span>
                  <button
                    onClick={() => removeSection(section)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tables Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tables</CardTitle>
                <CardDescription>Manage your restaurant tables</CardDescription>
              </div>
              <Button onClick={() => setShowAddTable(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Table
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {showAddTable && (
              <div className="p-4 border border-border rounded-lg bg-muted/30 space-y-4">
                <h4 className="font-medium">Add New Table</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Table Number</Label>
                    <Input
                      type="number"
                      value={newTable.number || ''}
                      onChange={(e) => setNewTable({ ...newTable, number: parseInt(e.target.value) || 0 })}
                      placeholder="e.g., 9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Table Name (Optional)</Label>
                    <Input
                      value={newTable.name}
                      onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
                      placeholder="e.g., Window Seat"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Capacity</Label>
                    <Select
                      value={newTable.capacity.toString()}
                      onValueChange={(v) => setNewTable({ ...newTable, capacity: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2, 4, 6, 8, 10, 12].map((cap) => (
                          <SelectItem key={cap} value={cap.toString()}>
                            {cap} persons
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Section</Label>
                    <Select
                      value={newTable.section}
                      onValueChange={(v) => setNewTable({ ...newTable, section: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {settings.sections.map((section) => (
                          <SelectItem key={section} value={section}>
                            {section}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={addTable}>Save Table</Button>
                  <Button variant="outline" onClick={() => setShowAddTable(false)}>Cancel</Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {settings.tables.sort((a, b) => a.number - b.number).map((table) => (
                <div
                  key={table.id}
                  className={`p-4 border rounded-lg ${
                    table.isActive ? 'border-border bg-card' : 'border-border/50 bg-muted/50 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-lg">
                      {table.name ? `${table.name} (T${table.number})` : `Table ${table.number}`}
                    </h4>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditingTable(editingTable === table.id ? null : table.id)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteTable(table.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {editingTable === table.id ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Table Name</Label>
                        <Input
                          className="h-8"
                          value={table.name || ''}
                          onChange={(e) => updateTable(table.id, { name: e.target.value || undefined })}
                          placeholder="e.g., Window Seat"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Capacity</Label>
                        <Select
                          value={table.capacity.toString()}
                          onValueChange={(v) => updateTable(table.id, { capacity: parseInt(v) })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[2, 4, 6, 8, 10, 12].map((cap) => (
                              <SelectItem key={cap} value={cap.toString()}>
                                {cap} persons
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Section</Label>
                        <Select
                          value={table.section}
                          onValueChange={(v) => updateTable(table.id, { section: v })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {settings.sections.map((section) => (
                              <SelectItem key={section} value={section}>
                                {section}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Users className="w-4 h-4" />
                        <span>{table.capacity} persons</span>
                      </div>
                      <div className="text-xs text-muted-foreground mb-3">
                        {table.section}
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      {table.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <Switch
                      checked={table.isActive}
                      onCheckedChange={() => toggleTableStatus(table.id)}
                    />
                  </div>
                </div>
              ))}
            </div>

            {settings.tables.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No tables configured</p>
                <p className="text-sm">Add tables to start managing reservations</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TableSettings;
