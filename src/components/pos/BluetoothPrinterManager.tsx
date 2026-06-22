import React, { useState, useEffect, useCallback } from 'react';
import { Bluetooth, Search, Check, X, Trash2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  BluetoothDevice,
  scanForPrinters,
  connectToPrinter,
  disconnectPrinter,
  getSavedPrinter,
  savePrinter,
  clearSavedPrinter,
  isBluetoothPrintAvailable,
  bluetoothPrint,
} from '@/lib/bluetoothPrinter';

const BluetoothPrinterManager: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [savedDevice, setSavedDevice] = useState<BluetoothDevice | null>(getSavedPrinter());
  const [isAvailable] = useState(isBluetoothPrintAvailable());

  const handleScan = useCallback(() => {
    setScanning(true);
    setDevices([]);

    const stopScan = scanForPrinters((found) => {
      setDevices(found);
    }, 10000);

    setTimeout(() => {
      setScanning(false);
      stopScan();
    }, 10000);
  }, []);

  const handleConnect = async (device: BluetoothDevice) => {
    setConnecting(device.address);
    const success = await connectToPrinter(device.address);
    setConnecting(null);

    if (success) {
      savePrinter(device);
      setSavedDevice(device);
      toast.success(`Connected to ${device.name || device.address}`);
    } else {
      toast.error('Failed to connect to printer');
    }
  };

  const handleDisconnect = async () => {
    await disconnectPrinter();
    clearSavedPrinter();
    setSavedDevice(null);
    toast.success('Printer disconnected');
  };

  const handleTestPrint = async () => {
    const testHtml = `
      <html><body style="text-align:center;font-family:monospace;">
        <h2>TEST PRINT</h2>
        <hr/>
        <p>Printer: ${savedDevice?.name || 'Unknown'}</p>
        <p>Time: ${new Date().toLocaleString()}</p>
        <hr/>
        <p>✓ Bluetooth printing works!</p>
        <p>★ ★ ★ ★ ★</p>
      </body></html>
    `;
    const success = await bluetoothPrint(testHtml);
    if (success) {
      toast.success('Test print sent!');
    } else {
      toast.error('Test print failed');
    }
  };

  if (!isAvailable) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bluetooth className="w-5 h-5 text-muted-foreground" />
            Bluetooth Thermal Printer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Bluetooth printing is only available in the native Android/iOS app. 
            Build and install the APK to use silent Bluetooth printing.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bluetooth className="w-5 h-5 text-primary" />
          Bluetooth Thermal Printer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Saved Printer */}
        {savedDevice ? (
          <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">
                  {savedDevice.name || 'Unknown Printer'}
                </p>
                <p className="text-xs text-muted-foreground">{savedDevice.address}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">Connected</Badge>
              <Button variant="ghost" size="icon" onClick={handleTestPrint}>
                <Printer className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDisconnect}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No printer connected. Scan to find nearby Bluetooth thermal printers.
          </p>
        )}

        {/* Scan Button */}
        <Button
          variant="outline"
          onClick={handleScan}
          disabled={scanning}
          className="w-full"
        >
          <Search className="w-4 h-4 mr-2" />
          {scanning ? 'Scanning...' : 'Scan for Printers'}
        </Button>

        {/* Discovered Devices */}
        {devices.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Found {devices.length} device(s):
            </p>
            {devices.map((device) => (
              <div
                key={device.address}
                className="flex items-center justify-between p-3 rounded-lg border border-border"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {device.name || 'Unknown Device'}
                  </p>
                  <p className="text-xs text-muted-foreground">{device.address}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleConnect(device)}
                  disabled={connecting === device.address}
                >
                  {connecting === device.address ? 'Connecting...' : 'Connect'}
                </Button>
              </div>
            ))}
          </div>
        )}

        {scanning && devices.length === 0 && (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Searching for printers...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BluetoothPrinterManager;
