import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Bell, CheckCircle, Megaphone, ListTodo, Calendar, DollarSign, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  staffId?: string;
}

const getStoreId = (): string | null => {
  try { const d = localStorage.getItem('pos_active_store_data'); if (d) { const p = JSON.parse(d); if (p?.id) return p.id; } } catch {}
  try { const a = localStorage.getItem('pos_active_store'); if (a) return JSON.parse(a); } catch {}
  return null;
};
const getStoreCode = (): string | null => {
  try { const d = localStorage.getItem('pos_active_store_data'); if (d) { const p = JSON.parse(d); if (p?.storeCode) return p.storeCode; } } catch {}
  return null;
};

const StaffNotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isValidSession, setIsValidSession] = useState(false);

  useEffect(() => {
    const loggedInStaff = localStorage.getItem('logged_in_staff');
    const posStaffSession = localStorage.getItem('pos_staff_session');
    if (!loggedInStaff && !posStaffSession) { navigate('/staff-dashboard'); return; }
    setIsValidSession(true);

    let staffData: any = null;
    if (posStaffSession) { staffData = JSON.parse(posStaffSession); }
    else if (loggedInStaff) { staffData = JSON.parse(loggedInStaff); }
    setStaff(staffData);

    fetchNotifications(staffData?.id || staffData?.user_id || staffData?.staff_code);
  }, [navigate]);

  const fetchNotifications = async (staffId: string) => {
    const storeId = getStoreId();
    if (!storeId) {
      // Fallback to localStorage
      loadFromLocalStorage(staffId);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('sync-store-data', {
        body: { action: 'fetch', store_id: storeId, data_type: 'staff_notifications', staff_id: staffId, store_code: getStoreCode() }
      });
      if (!error && data?.items) {
        setNotifications(data.items.map((n: any) => ({
          id: n.id, type: n.type, title: n.title, message: n.message || '',
          read: n.is_read, createdAt: n.created_at, staffId: n.staff_id,
        })));
        return;
      }
    } catch {}
    loadFromLocalStorage(staffId);
  };

  const loadFromLocalStorage = (staffId: string) => {
    const staffNotifications = JSON.parse(localStorage.getItem('staff_notifications') || '[]');
    const posNotifications = JSON.parse(localStorage.getItem('pos_notifications') || '[]');
    const all = [...staffNotifications, ...posNotifications];
    const mine = all.filter((n: any) => !n.staffId || n.staffId === staffId);
    setNotifications(mine);
  };

  const markAsRead = async (notificationId: string) => {
    const storeId = getStoreId();
    if (storeId) {
      try {
        await supabase.functions.invoke('sync-store-data', {
          body: { action: 'update', store_id: storeId, data_type: 'staff_notifications', item_id: notificationId, updates: { is_read: true }, store_code: getStoreCode() }
        });
      } catch {}
    }
    setNotifications(notifications.map(n => n.id === notificationId ? { ...n, read: true } : n));
  };

  const markAllAsRead = async () => {
    const storeId = getStoreId();
    for (const n of notifications.filter(n => !n.read)) {
      if (storeId) {
        try {
          await supabase.functions.invoke('sync-store-data', {
            body: { action: 'update', store_id: storeId, data_type: 'staff_notifications', item_id: n.id, updates: { is_read: true }, store_code: getStoreCode() }
          });
        } catch {}
      }
    }
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'announcement': return <Megaphone className="w-5 h-5" />;
      case 'task': return <ListTodo className="w-5 h-5" />;
      case 'leave': return <Calendar className="w-5 h-5" />;
      case 'salary': return <DollarSign className="w-5 h-5" />;
      case 'alert': return <AlertTriangle className="w-5 h-5" />;
      case 'shift_update': return <Clock className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };
  const getIconColor = (type: string) => {
    switch (type) {
      case 'announcement': return 'bg-blue-500/15 text-blue-500';
      case 'task': return 'bg-purple-500/15 text-purple-500';
      case 'leave': return 'bg-green-500/15 text-green-500';
      case 'salary': return 'bg-emerald-500/15 text-emerald-500';
      case 'alert': return 'bg-warning/15 text-warning';
      case 'shift_update': return 'bg-orange-500/15 text-orange-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  if (!staff || !isValidSession) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/staff-dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Notifications</h1>
              {unreadCount > 0 && <p className="text-sm text-muted-foreground">{unreadCount} unread</p>}
            </div>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-8 text-center">
              <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(notification => (
              <button key={notification.id} onClick={() => markAsRead(notification.id)}
                className={cn('w-full text-left bg-card rounded-xl border p-4 transition-all hover:bg-muted/50', notification.read ? 'border-border' : 'border-primary/30 bg-primary/5')}>
                <div className="flex gap-4">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', getIconColor(notification.type))}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('font-medium', !notification.read && 'text-primary')}>{notification.title}</p>
                      {!notification.read && <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">{format(new Date(notification.createdAt), 'MMM d, h:mm a')}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffNotificationsPage;
