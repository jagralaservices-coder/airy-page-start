
-- Delete all staff attendance
DELETE FROM public.staff_attendance;

-- Delete all staff schedules
DELETE FROM public.staff_schedules;

-- Delete all staff notifications
DELETE FROM public.staff_notifications;

-- Delete all leave requests
DELETE FROM public.leave_requests;

-- Delete all advance requests
DELETE FROM public.advance_requests;

-- Delete all bill counters
DELETE FROM public.bill_counters;

-- Delete all store categories
DELETE FROM public.store_categories;

-- Delete all store settings
DELETE FROM public.store_settings;

-- Delete all held bills
DELETE FROM public.held_bills;

-- Delete all menu item ingredients
DELETE FROM public.menu_item_ingredients;

-- Delete all menu item variations
DELETE FROM public.menu_item_variations;

-- Delete all menu items
DELETE FROM public.menu_items;

-- Delete all inventory components
DELETE FROM public.inventory_components;

-- Delete all inventory items
DELETE FROM public.inventory_items;

-- Delete all orders
DELETE FROM public.orders;

-- Delete all online orders
DELETE FROM public.online_orders;

-- Delete all expenses
DELETE FROM public.expenses;

-- Delete all payment disputes
DELETE FROM public.payment_disputes;

-- Delete all payment settlements
DELETE FROM public.payment_settlements;

-- Delete all payments
DELETE FROM public.payments;

-- Delete all pos customers
DELETE FROM public.pos_customers;

-- Delete all chat messages
DELETE FROM public.chat_messages;

-- Delete all chat participants
DELETE FROM public.chat_participants;

-- Delete all chat conversations
DELETE FROM public.chat_conversations;

-- Delete all stores
DELETE FROM public.stores;

-- Delete all user roles (staff, owners, managers - but keep admin roles)
DELETE FROM public.user_roles WHERE role != 'admin';

-- Delete all customers
DELETE FROM public.customers;

-- Delete profiles for non-admin users
DELETE FROM public.profiles WHERE id IN (
  SELECT id FROM public.profiles WHERE id NOT IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  )
);
