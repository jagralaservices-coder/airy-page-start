import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bell, AlertTriangle, Package, CheckCircle, BellRing, Globe } from 'lucide-react';
import { usePOS } from '@/contexts/POSContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  requestNotificationPermission, 
  getNotificationStatus,
  showLowStockAlert,
  showOutOfStockAlert
} from '@/lib/notifications';
import { toast } from 'sonner';

interface StockAlertsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StockAlertsDialog: React.FC<StockAlertsDialogProps> = ({ isOpen, onClose }) => {
  const { menuItems } = usePOS();
  const [notificationStatus, setNotificationStatus] = useState<string>(getNotificationStatus());
  const [pushEnabled, setPushEnabled] = useState<boolean>(() => {
    return localStorage.getItem('push_notifications_enabled') === 'true';
  });
  const [onlineOrderAlerts, setOnlineOrderAlerts] = useState<boolean>(() => {
    return localStorage.getItem('online_order_alerts') === 'true';
  });

  useEffect(() => {
    setNotificationStatus(getNotificationStatus());
  }, [isOpen]);

  // Get items with low stock (where stock <= threshold)
  const lowStockItems = menuItems.filter(item => {
    if (item.stockAlertThreshold !== undefined && item.stock !== undefined) {
      return item.stock <= item.stockAlertThreshold;
    }
    return false;
  });

  // Get items with zero stock
  const outOfStockItems = menuItems.filter(item => item.stock === 0);

  // Get items with stock alerts configured
  const alertConfiguredItems = menuItems.filter(item => item.stockAlertThreshold !== undefined);

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationStatus(getNotificationStatus());
    if (granted) {
      toast.success('Push notifications enabled!');
      setPushEnabled(true);
      localStorage.setItem('push_notifications_enabled', 'true');
    } else {
      toast.error('Notification permission denied');
    }
  };

  const handleTogglePush = (enabled: boolean) => {
    setPushEnabled(enabled);
    localStorage.setItem('push_notifications_enabled', String(enabled));
    if (enabled && notificationStatus !== 'granted') {
      handleEnableNotifications();
    } else {
      toast.success(enabled ? 'Stock alerts enabled' : 'Stock alerts disabled');
    }
  };

  const handleToggleOnlineOrders = (enabled: boolean) => {
    setOnlineOrderAlerts(enabled);
    localStorage.setItem('online_order_alerts', String(enabled));
    toast.success(enabled ? 'Online order alerts enabled' : 'Online order alerts disabled');
  };

  const handleTestNotification = () => {
    if (lowStockItems.length > 0) {
      showLowStockAlert(lowStockItems.map(i => ({ name: i.name, stock: i.stock || 0 })));
    } else if (outOfStockItems.length > 0) {
      showOutOfStockAlert(outOfStockItems.map(i => ({ name: i.name })));
    } else {
      showLowStockAlert([{ name: 'Test Item', stock: 5 }]);
    }
    toast.success('Test notification sent!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Stock Alerts
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-xs text-muted-foreground">Out of Stock</span>
              </div>
              <p className="text-2xl font-bold text-destructive">{outOfStockItems.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">Low Stock</span>
              </div>
              <p className="text-2xl font-bold text-orange-500">{lowStockItems.length}</p>
            </div>
          </div>

          {/* Out of Stock Items */}
          {outOfStockItems.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-destructive mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Out of Stock ({outOfStockItems.length})
              </h3>
              <div className="space-y-2">
                {outOfStockItems.map(item => (
                  <div 
                    key={item.id} 
                    className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 flex justify-between items-center"
                  >
                    <span className="font-medium text-sm">{item.name}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-destructive text-destructive-foreground">
                      0 in stock
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Low Stock Items */}
          {lowStockItems.filter(item => item.stock! > 0).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-orange-500 mb-2 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Low Stock ({lowStockItems.filter(item => item.stock! > 0).length})
              </h3>
              <div className="space-y-2">
                {lowStockItems.filter(item => item.stock! > 0).map(item => (
                  <div 
                    key={item.id} 
                    className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20 flex justify-between items-center"
                  >
                    <div>
                      <span className="font-medium text-sm">{item.name}</span>
                      <p className="text-xs text-muted-foreground">
                        Alert threshold: {item.stockAlertThreshold}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-orange-500 text-white">
                      {item.stock} left
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Good Message */}
          {outOfStockItems.length === 0 && lowStockItems.length === 0 && (
            <div className="text-center py-6">
              <CheckCircle className="w-10 h-10 mx-auto text-green-500 mb-2" />
              <h3 className="font-semibold text-foreground text-sm">All Stock Levels OK</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {alertConfiguredItems.length > 0 
                  ? `Monitoring ${alertConfiguredItems.length} items`
                  : 'Set thresholds in Menu'}
              </p>
            </div>
          )}

          {/* Push Notification Settings */}
          <div className="border-t border-border pt-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BellRing className="w-4 h-4" />
              Push Notifications
            </h3>

            {notificationStatus === 'unsupported' ? (
              <p className="text-xs text-muted-foreground">
                Browser notifications not supported
              </p>
            ) : notificationStatus === 'denied' ? (
              <p className="text-xs text-destructive">
                Notifications blocked. Enable in browser settings.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-orange-500" />
                    <span className="text-sm">Low Stock Alerts</span>
                  </div>
                  <Switch 
                    checked={pushEnabled} 
                    onCheckedChange={handleTogglePush}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    <span className="text-sm">Online Order Alerts</span>
                  </div>
                  <Switch 
                    checked={onlineOrderAlerts} 
                    onCheckedChange={handleToggleOnlineOrders}
                  />
                </div>

                {notificationStatus === 'granted' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={handleTestNotification}
                  >
                    Test Notification
                  </Button>
                )}

                {notificationStatus === 'default' && (
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={handleEnableNotifications}
                  >
                    Enable Push Notifications
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Info */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">
              <strong>Tip:</strong> Set stock thresholds in Menu → Edit Item
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
