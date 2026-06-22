import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ShoppingCart, Plus, Minus, Search, X, Send, CheckCircle2, Clock, Phone, User, Store, LogOut, History, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface StoreInfo {
  id: string;
  name: string;
  address: string;
  phone: string;
  business_type: string;
  currency_code: string;
  tax_percentage: number;
  tax_type: string;
}

interface MenuCategory {
  category_id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
}

interface MenuVariation {
  id: string;
  name: string;
  price: number;
  unit: string | null;
}

interface PublicMenuItem {
  id: string;
  name: string;
  name_hindi: string | null;
  category: string;
  price: number;
  image_url: string | null;
  description: string | null;
  is_available: boolean;
  preparation_time: number | null;
  variations: MenuVariation[];
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  variation?: string;
  category?: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ',
};

const CustomerMenuPage: React.FC = () => {
  const { storeCode } = useParams<{ storeCode: string }>();

  const [store, setStore] = useState<StoreInfo | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<PublicMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [orderType, setOrderType] = useState<'dine-in' | 'delivery'>('dine-in');
  const [tableNumber, setTableNumber] = useState('');
  const [address, setAddress] = useState('');
  const [placing, setPlacing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<{ order_number: string; total: number; store_code: string } | null>(null);

  const [qrSettings, setQrSettings] = useState<any>(null);
  const [sessionCustomer, setSessionCustomer] = useState<{ name: string; phone: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const currencySymbol = CURRENCY_SYMBOLS[store?.currency_code || 'INR'] || '₹';
  const formatPrice = (price: number) => `${currencySymbol}${price.toFixed(2)}`;

  useEffect(() => {
    if (!storeCode) return;
    fetchMenu();
  }, [storeCode]);

  const fetchQRSettings = async (storeId: string) => {
    try {
      const { data } = await supabase
        .from('store_settings' as any)
        .select('setting_value')
        .eq('store_id', storeId)
        .eq('setting_key', 'qr_automation')
        .maybeSingle();

      if (data && (data as any).setting_value) {
        setQrSettings((data as any).setting_value);
      }
    } catch (e) {
      console.error('Failed to fetch QR settings:', e);
    }
  };

  const fetchCustomerHistory = async (storeId: string, phone: string) => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('qr_orders')
        .select('*')
        .eq('store_id', storeId)
        .eq('customer_phone', phone.trim())
        .order('created_at', { ascending: false });

      if (!error && data) {
        setHistoryOrders(data);
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCustomerLogin = (name: string, phone: string) => {
    if (!name.trim() || !phone.trim() || phone.trim().length < 10) {
      toast.error('Please enter valid Name and Mobile Number');
      return;
    }
    const session = { name: name.trim(), phone: phone.trim() };
    setSessionCustomer(session);
    localStorage.setItem('customer_qr_session', JSON.stringify(session));
    setCustomerName(name.trim());
    setCustomerPhone(phone.trim());
    setLoginOpen(false);
    toast.success(`Logged in as ${name.trim()}`);
    if (store?.id) {
      fetchCustomerHistory(store.id, phone);
    }
  };

  const handleCustomerLogout = () => {
    setSessionCustomer(null);
    localStorage.removeItem('customer_qr_session');
    setCustomerName('');
    setCustomerPhone('');
    setHistoryOrders([]);
    toast.info('Logged out successfully');
  };

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/get-store-menu?store_code=${storeCode}`,
        { headers: { 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      if (!res.ok) throw new Error('Store not found');
      const data = await res.json();
      setStore(data.store);
      setCategories(data.categories);
      setMenuItems(data.menu_items);
      
      if (data.store?.id) {
        fetchQRSettings(data.store.id);
        
        const saved = localStorage.getItem('customer_qr_session');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.phone) {
              setSessionCustomer(parsed);
              setCustomerName(parsed.name);
              setCustomerPhone(parsed.phone);
              fetchCustomerHistory(data.store.id, parsed.phone);
            }
          } catch {}
        }
      }
    } catch (e) {
      setError('Store not found or unavailable');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch && item.is_available;
    });
  }, [menuItems, activeCategory, searchQuery]);

  const activeCategories = useMemo(() => {
    return categories.filter(cat => menuItems.some(item => item.category === cat.category_id && item.is_available));
  }, [categories, menuItems]);

  const addToCart = (item: PublicMenuItem, variation?: MenuVariation) => {
    const cartId = variation ? `${item.id}_${variation.id}` : item.id;
    const name = variation ? `${item.name} (${variation.name})` : item.name;
    const price = variation ? variation.price : item.price;

    setCart(prev => {
      const existing = prev.find(c => c.id === cartId);
      if (existing) {
        return prev.map(c => c.id === cartId ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { id: cartId, name, price, quantity: 1, variation: variation?.name, category: item.category }];
    });
    toast.success(`${name} added`);
  };

  const updateQty = (cartId: string, delta: number) => {
    setCart(prev => prev
      .map(c => c.id === cartId ? { ...c, quantity: c.quantity + delta } : c)
      .filter(c => c.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const placeOrder = async () => {
    if (cart.length === 0) return;
    if (!customerName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 10) {
      toast.error('Please enter valid mobile number');
      return;
    }
    if (orderType === 'dine-in' && !tableNumber.trim()) {
      toast.error('Please enter your table number');
      return;
    }
    if (orderType === 'delivery' && !address.trim()) {
      toast.error('Please enter your delivery address');
      return;
    }

    setPlacing(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const finalNotes = orderType === 'delivery' 
        ? `Address: ${address.trim()}\nNotes: ${notes.trim()}`.trim()
        : notes.trim();

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/place-qr-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            store_code: storeCode,
            customer_name: customerName.trim(),
            customer_phone: customerPhone.trim(),
            table_number: orderType === 'dine-in' ? tableNumber.trim() : undefined,
            items: cart.map(c => ({ name: c.name, price: c.price, quantity: c.quantity, category: c.category || 'General' })),
            notes: finalNotes || undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrderPlaced({ order_number: data.order.order_number, total: data.order.total, store_code: storeCode! });
      setCart([]);
      setCartOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  // ========== LOADING ==========
  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  // ========== ERROR ==========
  if (error || !store) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <div className="text-center">
          <Store className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Store Not Found</h1>
          <p className="text-gray-500">{error || 'This store is unavailable'}</p>
        </div>
      </div>
    );
  }

  // ========== ORDER SUCCESS ==========
  if (orderPlaced) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
        <div className="text-center max-w-sm w-full">
          <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Order Placed Successfully ✅</h1>
          <p className="text-gray-600 mb-6">Your order has been sent to the kitchen</p>
          <div className="bg-white rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Order No</span>
              <span className="font-bold text-2xl text-gray-800">{orderPlaced.order_number}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total</span>
              <span className="font-bold text-xl text-green-600">{formatPrice(orderPlaced.total)}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">Please wait, your order is being prepared</p>
          <a
            href={`/track/${orderPlaced.store_code}/${orderPlaced.order_number}`}
            className="mt-4 w-full bg-green-600 text-white rounded-xl py-3 font-bold text-base hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <Clock className="w-4 h-4" /> Track Order Live
          </a>
          <button
            className="mt-3 w-full bg-orange-500 text-white rounded-xl py-3 font-bold text-base hover:bg-orange-600 transition-colors"
            onClick={() => { setOrderPlaced(null); setCustomerName(''); setCustomerPhone(''); setNotes(''); }}
          >
            Order Again
          </button>
        </div>
      </div>
    );
  }

  // ========== MAIN MENU ==========
  return (
    <div className="min-h-[100dvh] bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">{store.name}</h1>
              {store.address && <p className="text-[11px] text-gray-400 mt-0.5">{store.address}</p>}
            </div>
            
            <div className="flex items-center gap-2">
              {/* History / Login Button */}
              {sessionCustomer ? (
                <button
                  onClick={() => setShowHistory(true)}
                  className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 w-9 h-9 rounded-full shadow-sm transition-all"
                  title="View Order History"
                >
                  <History className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setLoginOpen(true)}
                  className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Login</span>
                </button>
              )}

              {/* Cart Button */}
              <button
                onClick={() => setCartOpen(true)}
                className="relative bg-orange-500 hover:bg-orange-600 active:scale-95 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-1.5 shadow-md transition-all"
              >
                <ShoppingCart className="w-4 h-4" />
                {formatPrice(cartTotal)}
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-gray-100 rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveCategory('all')}
            className={cn(
              'px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all',
              activeCategory === 'all' ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-600'
            )}
          >
            All
          </button>
          {activeCategories.map(cat => (
            <button
              key={cat.category_id}
              onClick={() => setActiveCategory(cat.category_id)}
              className={cn(
                'px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5',
                activeCategory === cat.category_id ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-600'
              )}
            >
              <span>{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="p-4 pb-28">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-2">🍽️</p>
            <p>No items found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map(item => {
              const inCart = cart.find(c => c.id === item.id);
              return (
                <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex">
                  {item.image_url && (
                    <img src={item.image_url} alt={item.name} className="w-24 h-24 object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 p-3 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-gray-900">{item.name}</h3>
                      {item.description && <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{item.description}</p>}
                      {item.preparation_time && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400 mt-0.5">
                          <Clock className="w-3 h-3" /> {item.preparation_time} min
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-sm text-orange-600">
                        {item.variations.length > 0
                          ? `${formatPrice(Math.min(item.price, ...item.variations.map(v => v.price)))}+`
                          : formatPrice(item.price)}
                      </span>
                      {item.variations.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.variations.map(v => (
                            <button
                              key={v.id}
                              onClick={() => addToCart(item, v)}
                              className="px-2 py-1 text-[10px] font-semibold rounded-lg bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 transition-colors"
                            >
                              {v.name} · {formatPrice(v.price)}
                            </button>
                          ))}
                        </div>
                      ) : inCart ? (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold text-sm w-5 text-center">{inCart.quantity}</span>
                          <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> ADD
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Cart Bar */}
      {cartCount > 0 && !cartOpen && (
        <div className="fixed bottom-4 left-4 right-4 z-40">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full bg-orange-500 text-white rounded-2xl py-4 px-6 shadow-xl flex items-center justify-between hover:bg-orange-600 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span className="font-bold">{cartCount} item{cartCount > 1 ? 's' : ''}</span>
            </span>
            <span className="font-bold text-lg">{formatPrice(cartTotal)} →</span>
          </button>
        </div>
      )}

      {/* Cart Overlay */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setCartOpen(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5">
              {/* Handle */}
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
              
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                <ShoppingCart className="w-5 h-5" /> Your Order
              </h2>

              {/* Cart Items */}
              <div className="space-y-3 max-h-[30vh] overflow-y-auto">
                {cart.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">Your cart is empty</p>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-500">{formatPrice(item.price)} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-sm w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="font-bold text-sm ml-3 w-16 text-right">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="mt-4 space-y-3 border-t pt-4">
                  {/* Order Type Selector */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">Order Mode</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setOrderType('dine-in')}
                        className={cn(
                          "flex-1 py-2 text-xs font-bold rounded-xl border transition-all",
                          orderType === 'dine-in'
                            ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                            : "bg-gray-50 text-gray-600 border-gray-200"
                        )}
                      >
                        🍽️ Dine-in
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderType('delivery')}
                        className={cn(
                          "flex-1 py-2 text-xs font-bold rounded-xl border transition-all",
                          orderType === 'delivery'
                            ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                            : "bg-gray-50 text-gray-600 border-gray-200"
                        )}
                      >
                        🛵 Delivery
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Table/Address fields */}
                  {orderType === 'dine-in' ? (
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">
                        Table Number <span className="text-red-500">*</span>
                      </label>
                      {qrSettings?.qrTableSelectionEnabled !== false ? (
                        <select
                          value={tableNumber}
                          onChange={e => setTableNumber(e.target.value)}
                          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                        >
                          <option value="">Select Table</option>
                          {Array.from({ length: qrSettings?.activeQRTables || 10 }, (_, i) => i + 1).map(num => (
                            <option key={num} value={num.toString()}>Table {num}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          placeholder="Enter table number (e.g. 5)"
                          value={tableNumber}
                          onChange={e => setTableNumber(e.target.value)}
                          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                        />
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">
                        Delivery Address <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        placeholder="Enter your complete delivery address"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                        rows={2}
                      />
                    </div>
                  )}

                  {/* Customer Details */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 flex items-center gap-1 mb-1">
                      <User className="w-3 h-3" /> Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      placeholder="Enter your name"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 flex items-center gap-1 mb-1">
                      <Phone className="w-3 h-3" /> Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="Enter mobile number"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Notes (optional)</label>
                    <textarea
                      placeholder="Any special requests..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                      rows={2}
                    />
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center font-bold text-lg pt-2">
                    <span>Total</span>
                    <span className="text-orange-600">{formatPrice(cartTotal)}</span>
                  </div>

                  {/* Place Order Button */}
                  <button
                    className="w-full bg-orange-500 text-white rounded-xl py-3.5 font-bold text-base flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors disabled:opacity-50"
                    onClick={placeOrder}
                    disabled={placing}
                  >
                    {placing ? (
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Place Order
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Customer Login Overlay */}
      {loginOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setLoginOpen(false)}>
          <div
            className="bg-white rounded-3xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-orange-500" /> Customer Login
                </h3>
                <button onClick={() => setLoginOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-gray-500 mb-5">
                Login with your name and phone number to trace and view all your active/past orders in real-time.
              </p>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get('name') as string;
                const phone = formData.get('phone') as string;
                handleCustomerLogin(name, phone);
              }} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Your Name</label>
                  <input
                    name="name"
                    type="text"
                    required
                    placeholder="Enter your name"
                    defaultValue={customerName}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Mobile Number</label>
                  <input
                    name="phone"
                    type="tel"
                    required
                    placeholder="Enter 10-digit mobile number"
                    defaultValue={customerPhone}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 active:scale-98 text-white rounded-xl py-3.5 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  Verify & Login <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Order History Overlay */}
      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowHistory(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5">
              {/* Handle */}
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />

              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
                    <History className="w-5 h-5 text-orange-500" /> Order History
                  </h2>
                  {sessionCustomer && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Logged in as <span className="font-semibold text-gray-700">{sessionCustomer.name}</span> ({sessionCustomer.phone})
                    </p>
                  )}
                </div>
                <button
                  onClick={handleCustomerLogout}
                  className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>

              {/* Orders List */}
              <div className="space-y-4 mt-4">
                {historyLoading ? (
                  <div className="py-12 text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Loading your history...</p>
                  </div>
                ) : historyOrders.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-4xl mb-2">📄</p>
                    <p className="text-sm">No orders found under this phone number</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {historyOrders.map(order => {
                      const orderDate = new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                      });
                      
                      const getStatusBadge = (status: string) => {
                        switch (status) {
                          case 'pending':
                            return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 uppercase">Pending</span>;
                          case 'accepted':
                            return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800 uppercase">Accepted</span>;
                          case 'preparing':
                            return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-800 uppercase">Preparing</span>;
                          case 'ready':
                            return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-teal-100 text-teal-800 uppercase">Ready</span>;
                          case 'completed':
                            return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-100 text-green-800 uppercase">Completed</span>;
                          case 'cancelled':
                            return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-800 uppercase">Cancelled</span>;
                          default:
                            return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gray-100 text-gray-800 uppercase">{status}</span>;
                        }
                      };

                      return (
                        <div key={order.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-sm text-gray-800">Order #{order.order_number}</p>
                              <p className="text-[10px] text-gray-400">{orderDate}</p>
                            </div>
                            {getStatusBadge(order.status)}
                          </div>

                          {/* Order Items */}
                          <div className="border-y border-dashed border-gray-200 py-2">
                            {(order.items || []).map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-xs py-0.5 text-gray-600">
                                <span>{item.name} <span className="text-gray-400 font-medium">×{item.quantity}</span></span>
                                <span>{formatPrice(item.price * item.quantity)}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between items-center pt-1">
                            <div className="text-xs">
                              <span className="text-gray-500">Total Paid: </span>
                              <span className="font-bold text-sm text-gray-800">{formatPrice(order.total)}</span>
                            </div>

                            <a
                              href={`/track/${storeCode}/${order.order_number}`}
                              className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-xl transition-all"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>Track Live</span>
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerMenuPage;
