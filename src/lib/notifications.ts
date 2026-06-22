// Browser Push Notifications Utility

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const showNotification = (title: string, options?: NotificationOptions) => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      ...options,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  }
  return null;
};

export const showLowStockAlert = (items: { name: string; stock: number }[]) => {
  if (items.length === 0) return;

  const itemNames = items.slice(0, 3).map(i => `${i.name} (${i.stock})`).join(', ');
  const moreText = items.length > 3 ? ` and ${items.length - 3} more` : '';

  showNotification('⚠️ Low Stock Alert', {
    body: `${itemNames}${moreText}`,
    tag: 'low-stock',
    requireInteraction: true,
  });
};

export const showOutOfStockAlert = (items: { name: string }[]) => {
  if (items.length === 0) return;

  const itemNames = items.slice(0, 3).map(i => i.name).join(', ');
  const moreText = items.length > 3 ? ` and ${items.length - 3} more` : '';

  showNotification('🚨 Out of Stock!', {
    body: `${itemNames}${moreText}`,
    tag: 'out-of-stock',
    requireInteraction: true,
  });
};

export const showOnlineOrderAlert = (orderDetails: {
  platform: 'swiggy' | 'zomato' | 'other';
  orderNumber: string;
  amount: number;
}) => {
  const platformEmoji = orderDetails.platform === 'swiggy' ? '🟠' : 
                        orderDetails.platform === 'zomato' ? '🔴' : '🛒';
  
  showNotification(`${platformEmoji} New Online Order!`, {
    body: `Order #${orderDetails.orderNumber} - ₹${orderDetails.amount}`,
    tag: `online-order-${orderDetails.orderNumber}`,
    requireInteraction: true,
  });
};

export const showNewOrderAlert = (orderType: string, orderNumber: string) => {
  showNotification('🔔 New Order', {
    body: `${orderType} order #${orderNumber} received`,
    tag: `order-${orderNumber}`,
  });
};

export const getNotificationStatus = (): 'granted' | 'denied' | 'default' | 'unsupported' => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
};
