import React from "react";
import { Download, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const PRD_CONTENT = `
# MAXORA — Product Requirements Document (PRD)
**Version:** 1.0 | **Date:** February 2026 | **Platform:** Web (PWA), Android, iOS, Windows

---

## 1. Executive Summary

MAXORA is an all-in-one, offline-first Point of Sale system for small-to-medium restaurants, cafés, and retail businesses — primarily in India. It enables business owners to manage billing, inventory, staff, customers, payments, and multi-store operations from a single multi-platform application. The system supports tiered subscriptions (Basic / Pro / Enterprise) with feature gating.

---

## 2. Product Vision & Goals

| Goal | Description |
|------|-------------|
| Unified Operations | Single app for billing, inventory, staff, reports, payments |
| Offline-First | Full POS functionality without internet; background sync |
| Multi-Platform | Same codebase → Web, Android, iOS, Windows |
| Multi-Store | Owners manage multiple stores under one account |
| Affordable | Free tier for small businesses; paid tiers for growth |
| Localized | Hindi + English UI; INR-first; GST-compliant |

---

## 3. User Roles & Permissions Matrix

| Capability | Admin | Owner | Store Manager | Staff |
|-----------|-------|-------|--------------|-------|
| Platform admin dashboard | ✅ | ❌ | ❌ | ❌ |
| Approve/delete owners | ✅ | ❌ | ❌ | ❌ |
| Create/manage stores | ✅ | ✅ | ❌ | ❌ |
| Owner dashboard & reports | ✅ | ✅ | ❌ | ❌ |
| Refund management | ✅ | ✅ | ❌ | ❌ |
| Owner payment dashboard | ✅ | ✅ | ❌ | ❌ |
| POS billing | ✅ | ✅ | ✅ | ❌ |
| Menu/inventory management | ✅ | ✅ | ✅ | ❌ |
| Table/order management | ✅ | ✅ | ✅ | ❌ |
| Kitchen display | ✅ | ✅ | ✅ | ❌ |
| Settings & config | ✅ | ✅ | ✅ | ❌ |
| Expenses tracking | ✅ | ✅ | ✅ | ❌ |
| Customer management | ✅ | ✅ | ✅ | ❌ |
| Delivery management | ✅ | ✅ | ✅ | ❌ |
| Online orders | ✅ | ✅ | ✅ | ❌ |
| Staff dashboard | ✅ | ✅ | ✅ | ✅ |
| Leave/advance requests | ❌ | ❌ | ❌ | ✅ |
| Chat | ✅ | ✅ | ✅ | ✅ |

---

## 4. Authentication & Authorization

### 4.1 Authentication Methods

| Method | User Type | Flow |
|--------|----------|------|
| Email + Password (Supabase Auth) | Admin, Owner | Signup → email verification → admin approval → login |
| Store Code + Password | Store Manager | Enter store code + password → direct POS access |
| Staff PIN | Staff | 4-6 digit PIN → staff dashboard |
| Face Capture | Staff | Camera-based face verification at check-in (optional) |
| Biometric/Fingerprint | Staff | Device biometric via Capacitor (optional) |
| OAuth Callback | Owner | Social login via /auth/callback and /~oauth routes |

### 4.2 Session Management
- Supabase JWT tokens for owner/admin sessions
- localStorage key 'pos_staff_session' for staff sessions
- POSContext manages store login state (isStoreLogin, activeStore)
- Auto-redirect based on role after login

### 4.3 Security Measures
- login_attempts table logs all auth attempts (type, IP, success/fail)
- security_audit_log tracks data mutations (table, old_data, new_data, user_id)
- Row-Level Security (RLS) on all database tables
- Route-level protection via ProtectedRoute component with allowedRoles, allowStoreLogin, allowStaffLogin flags
- Input validation with Zod schemas

---

## 5. Core Modules — Detailed Specifications

### 5.1 POS Billing Engine

#### 5.1.1 Menu Display
- MenuGrid: Category tabs → item cards with name, price, image, availability badge
- Real-time search by item name or barcode
- Hindi name display (name_hindi) based on locale setting
- Item availability toggle (is_available flag)
- Variation selector sheet (e.g., Half/Full, Small/Medium/Large) with independent pricing & stock

#### 5.1.2 Cart Management
- Add items with quantity increment/decrement
- Per-item notes (OrderItemNotes)
- Per-item and order-level discount
- Variation selection before adding to cart
- Cart formula: subtotal + tax + container_charge + delivery_charge + tip - discount
- Dedicated mobile cart view (MobileCart) for small screens

#### 5.1.3 Order Types

| Type | Fields |
|------|--------|
| Dine-in | Table number (from TableGrid) |
| Takeaway | Customer name (optional) |
| Delivery | Customer name, phone, address, delivery charge |
| Pickup | Customer name, pickup time |
| Online | Platform (Swiggy/Zomato), platform_order_id |

#### 5.1.4 Bill Operations

| Operation | Description |
|-----------|-------------|
| Generate Bill | Creates order in orders table with bill_number, items JSON, totals |
| Hold Bill | Saves cart to held_bills table; resume later |
| Split Bill | Divide bill among multiple payments (SplitBillDialog) |
| Cancel Order | Requires reason; logs cancelled_by, cancelled_at |
| Reset Bill | Clear current cart (ResetBillDialog) |
| Search Bill | Find past bills by bill number, date range, customer |
| Print Bill | Thermal printer (ESC/POS native) or browser print |
| Share Bill | WhatsApp/SMS share via billShareUtils |

#### 5.1.5 Bill Configuration
- Configurable prefix + sequential number
- Auto-reset options (daily, monthly, never)
- Custom header/footer text and logo
- Stored in store_settings table

#### 5.1.6 Tax Calculation
- Tax type: Inclusive or Exclusive (per store)
- Tax percentage: Configurable (e.g., 5%, 12%, 18% GST)
- Inclusive formula: tax = total - (total / (1 + rate))
- Exclusive formula: tax = subtotal × rate

#### 5.1.7 Keyboard Shortcuts
- F1: Save Order
- F2: Save & Print Order
- F3: Generate KOT without Print
- F4: Focus on search/add new item
- F5: New Order
- F6: Generate KOT with Print
- F7: Search by Table number
- F8: Save & eBill Order
- F9: Select Delivery mode
- F11: Select Dine In mode
- F12: Select Pick Up mode
- Ctrl+A: Accept online order
- Ctrl+E: Focus on bill number search
- Ctrl+H: Hold bill
- Ctrl+P: Print
- And more Ctrl shortcuts for navigation

---

### 5.2 Payment Processing

#### 5.2.1 Payment Methods

| Method | Implementation |
|--------|---------------|
| Cash | Manual entry; cash drawer top-up/withdrawal tracking |
| UPI | Razorpay checkout (QR code + UPI ID + app intent) |
| Card | Razorpay checkout (credit/debit) |
| Split | Multiple methods on one bill |
| Part Payment | Partial payment now; due amount tracked |
| Due/Credit | Full amount on credit; tracked per customer |

#### 5.2.2 Razorpay Integration
- Edge Function: create-payment-order → creates Razorpay order
- Edge Function: check-payment-status → polls payment status
- Edge Function: payment-webhook → receives Razorpay webhook callbacks
- Edge Function: process-refund → initiates Razorpay refund
- Frontend: RazorpayPaymentDialog with UPI + Card display blocks
- Config: UPI shown first, card second; netbanking/wallet/EMI/paylater hidden

#### 5.2.3 Payment Lifecycle
Created → Authorized → Captured → Settled
                    ↘ Failed
Captured → Refund Initiated → Refunded
Captured → Disputed → Resolved/Escalated

#### 5.2.4 Payment Management Pages

| Page | Path | Purpose |
|------|------|---------|
| Payment Settings | /payment-settings | Razorpay key config, UPI settings, sound settings |
| Payment Analytics | /payment-analytics | Charts: daily/weekly/monthly collections, method breakdown |
| Payment Reconciliation | /payment-reconciliation | Match Razorpay settlements with internal records |
| Payment History | /payment-history | Searchable list of all transactions |
| Payment Alerts | /payment-alerts | Failed payment alerts, expiring payments |
| Payment Disputes | /payment-disputes | Raise/resolve disputes on payments |
| Settlements | /settlements | Track Razorpay settlement UTR, fees, net amount |
| Refund Management | /refund-management | Process full/partial refunds |
| Daily Reconciliation | /daily-reconciliation | Auto-reconcile day's cash + digital totals |
| Owner Payment Dashboard | /owner-payment-dashboard | Owner-level aggregate payment analytics |

#### 5.2.5 Cash Management
- Opening balance tracking
- Cash top-up dialog (CashTopUpDialog)
- Withdrawal dialog (WithdrawalDialog)
- Denomination tracking
- Cash settings configuration

---

### 5.3 Menu Management

#### 5.3.1 Menu Items Data Model

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| store_id | UUID | FK → stores |
| name | text | Item name (English) |
| name_hindi | text | Item name (Hindi) |
| category | text | Category grouping |
| price | numeric | Base price |
| description | text | Optional description |
| image_url | text | Item photo URL |
| is_available | boolean | On/off toggle |
| barcode | text | Linked barcode |
| sku | text | Stock keeping unit |
| stock | integer | Current stock count |
| preparation_time | integer | Minutes to prepare |
| gramage_per_unit | numeric | Weight per unit |
| linked_inventory_id | UUID | FK → inventory_items |

#### 5.3.2 Variations (menu_item_variations)
- Each menu item can have N variations (e.g., Small ₹99, Medium ₹149, Large ₹199)
- Per variation: name, price, stock, SKU, sort_order, is_available, unit

#### 5.3.3 Ingredients (menu_item_ingredients)
- Link menu items to inventory items for recipe management
- Define quantity_required + unit per ingredient
- Enables auto-deduction on order completion

#### 5.3.4 Bulk Upload
- CSV upload for mass item creation
- PDF menu parser (pdfMenuParser.ts) for importing from existing printed menus
- Validation & preview before commit

#### 5.3.5 Barcode Operations
- Link barcode to menu items (LinkBarcodeDialog)
- Print barcode labels (BarcodePrintDialog)
- Scan barcode to add items (BarcodeScannerDialog)
- Uses JsBarcode for generation, html5-qrcode for scanning

---

### 5.4 Inventory Management

#### 5.4.1 Inventory Items Data Model

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| store_id | UUID | FK → stores |
| name | text | Item name |
| quantity | numeric | Current stock |
| unit | text | kg, litre, piece, etc. |
| cost_per_unit | numeric | Purchase cost |
| cost_unit | text | Cost measurement unit |
| min_stock | numeric | Alert threshold |
| gst_percentage | numeric | GST on purchase |
| hsn_code | text | HSN classification |
| barcode | text | Barcode identifier |
| batch_number | text | Batch tracking |
| expiry_date | date | Expiry tracking |
| production_yield | numeric | Yield from raw material |
| production_yield_unit | text | Yield unit |

#### 5.4.2 Component/Recipe System (inventory_components)
- Parent-child relationship between inventory items
- Example: "Dough" requires 1kg Flour + 0.5L Water + 10g Yeast
- Used for production yield and auto-deduction calculations

#### 5.4.3 Stock Operations
- Manual stock adjustment (add/subtract)
- Barcode scan to find item (InventoryBarcodeScanner)
- Low stock alerts (StockAlertsDialog) when quantity < min_stock
- Bulk inventory upload via CSV
- Auto-deduction via useInventoryDeduction hook when orders complete
- Auto-production tracking (autoProductionUtils.ts)

---

### 5.5 Table & Order Management

#### 5.5.1 Table System
- Configurable table count per store (TableSettings)
- Visual table grid showing status: Available / Occupied / Reserved
- Assign order to table; release on bill settlement
- Table-wise order tracking

#### 5.5.2 Order Lifecycle
New → In Progress → Ready → Served → Billed → Paid
                                            ↘ Cancelled (with reason)

#### 5.5.3 Kitchen Display System (KDS)
- /kitchen route shows incoming orders in real-time
- Real-time updates via Supabase Realtime subscriptions
- Order items grouped by category for kitchen efficiency
- Status toggle: Preparing → Ready

#### 5.5.4 KOT (Kitchen Order Ticket)
- Auto-generated on order placement
- Printable KOT with table number, items, quantities, time
- KOT listing page (/kot-listing) for history
- KOT settings (auto-print, format, printer selection)

#### 5.5.5 Online Orders Integration
- Webhook endpoint (online-order-webhook) receives orders from Swiggy/Zomato
- Stored in online_orders table with platform-specific data
- Commission tracking: commission_percentage, commission_amount, net_receivable
- Merged into unified order flow
- Auto-accept settings configurable per store

---

### 5.6 Staff Management

#### 5.6.1 Staff Data (via user_roles table)

| Field | Description |
|-------|-------------|
| user_id | Auth user reference |
| role | admin / owner / store_manager / staff |
| store_id | Assigned store |
| customer_id | Parent business |
| pin | 4-6 digit login PIN |
| staff_code | Unique staff identifier |
| salary | Monthly salary |
| work_start_time | Shift start time |
| work_end_time | Shift end time |
| face_photo_url | Face verification photo |
| fingerprint_enabled | Biometric enabled flag |

#### 5.6.2 Staff CRUD Operations
- Edge Function: create-staff → creates auth user + role assignment
- Edge Function: delete-staff → removes staff access
- Edge Function: get-store-staff → lists all staff for a store
- Staff management UI with role assignment

#### 5.6.3 Attendance System (staff_attendance)
- Check-in: Records time + GPS coordinates + distance from store
- Check-out: Same with duration calculation
- Verification methods: PIN, Face, Fingerprint, GPS
- Distance validation against store GPS coordinates (configurable geofence)
- Attendance calendar view (AttendanceCalendar)
- Overtime calculation & reports (OvertimeReport)
- Location verification via useLocationVerification hook

#### 5.6.4 Leave Management (leave_requests)
- Staff submits: leave_type, start_date, end_date, reason
- Owner/manager approves/rejects with timestamp
- Types: Casual, Sick, Earned, Emergency
- Status flow: Pending → Approved/Rejected

#### 5.6.5 Advance Requests (advance_requests)
- Staff requests salary advance with amount + reason
- Approval workflow: Pending → Approved → Paid
- Payment tracking with paid_at timestamp

#### 5.6.6 Staff Scheduling (staff_schedules)
- Assign shifts (Morning/Evening/Night) with date, start_time, end_time
- Visual schedule calendar view
- Notes per schedule entry
- Notifications for schedule changes

#### 5.6.7 Staff Notifications (staff_notifications)
- Push notifications to specific staff or broadcast to all
- Types: Schedule, Announcement, Alert, Approval
- Read/unread tracking with is_read flag

---

### 5.7 Customer Management

#### 5.7.1 POS Customers (pos_customers)

| Field | Type | Required |
|-------|------|----------|
| name | text | ✅ |
| phone | text | Optional |
| email | text | Optional |
| address | text | Optional |
| city | text | Optional |
| state | text | Optional |
| pincode | text | Optional |
| store_id | UUID | ✅ |

#### 5.7.2 Features
- Customer lookup during billing (phone search)
- Customer-wise order history
- Payment notifications to customers (CustomerPaymentNotifications)
- Due payment tracking per customer
- Customer settings (mandatory fields, loyalty config)

---

### 5.8 Expense Tracking (expenses)

| Field | Type | Description |
|-------|------|-------------|
| store_id | UUID | Store reference |
| category | text | Rent, Salary, Supplies, Utilities, etc. |
| amount | numeric | Expense amount |
| date | date | Expense date |
| description | text | Notes |
| paid_by | text | Who paid |

- Daily/weekly/monthly expense summary
- Category-wise breakdown charts
- Export to PDF/Excel

---

### 5.9 Multi-Store Management

#### 5.9.1 Business Hierarchy

Admin (Platform)
  └── Customer (Business/Owner account)
        ├── Store 1 (Restaurant A)
        │     ├── Menu Items, Inventory, Orders, Staff, Settings
        ├── Store 2 (Restaurant B)
        └── Store 3 (Retail Shop)

#### 5.9.2 Store Configuration (stores table)

| Field | Description |
|-------|-------------|
| store_name | Display name |
| store_code | Unique login code for store manager |
| password | Store login password |
| business_type | restaurant / retail / cafe |
| address | Physical address |
| phone | Contact number |
| country | Country code |
| currency_code | INR, USD, etc. |
| tax_percentage | Default tax rate |
| tax_type | inclusive / exclusive |
| latitude/longitude | GPS for staff attendance geofencing |
| is_active | Enable/disable store |

#### 5.9.3 Store Settings (store_settings)
- Key-value JSON store per store
- Settings: bill_config, print_settings, kot_settings, closing_hours, business_date, etc.
- Complete data isolation — no cross-store data leakage

#### 5.9.4 Owner Multi-Store Dashboard
- Aggregate view across all stores
- Store-wise sales comparison
- Store selection dialog for drill-down (OwnerStoreSelectionDialog)
- Store data sync (useStoreDataSync hook)

---

### 5.10 Reports & Analytics

#### 5.10.1 Dashboard (/dashboard)
- Today's sales total, order count, average order value
- Payment method breakdown (pie chart)
- Hourly sales trend (line chart)
- Top-selling items

#### 5.10.2 Report Types

| Report | Route | Data |
|--------|-------|------|
| Sales Summary | /reports/sales | Date-range sales with totals, tax, discounts |
| Category Summary | /reports/category | Sales grouped by menu category |
| Item Summary | /reports/item | Per-item quantity sold, revenue |
| Order Summary | /reports/order | Order count by type, status, time |
| Executive Sales | /reports/executive | High-level KPIs for owner |
| Employee Summary | /reports/employee | Staff-wise sales, attendance |
| Group Summary | /reports/group | Custom groupings |
| Variation Summary | /reports/variation | Sales by item variation |
| Cover Size Summary | /reports/cover-size | Table occupancy analysis |
| Tip Summary | /reports/tip | Tip collection by staff/date |
| Counter Summary | /reports/counter | Counter/register-wise sales |

#### 5.10.3 Report Tier Access
- Basic tier: First 5 reports (Sales, Order, Item, Category + main reports page)
- Pro tier: All 11 report types
- Enterprise tier: All reports + export capabilities

#### 5.10.4 Export & Print
- PDF generation via reportExportUtils
- Excel export
- Thermal print via reportPrintUtils
- Date range filters on all reports

---

### 5.11 Delivery Management

- Delivery boy registration & assignment (DeliveryBoySettings)
- Order → assign delivery boy → out for delivery → delivered
- Delivery charge configuration per store
- Delivery management page (/delivery)

---

### 5.12 Chat System

#### 5.12.1 Data Model
- chat_conversations: type (direct/group), participants, store_id, customer_id
- chat_messages: content, media (image/file), sender info, read status
- chat_participants: user_id, role, last_read_at

#### 5.12.2 Features
- Owner ↔ Staff messaging
- Store-level group chats
- Media sharing (images, files)
- Read receipts
- Real-time via Supabase Realtime
- AI assistant integration (chat-assistant edge function)

---

### 5.13 Printing System

#### 5.13.1 Architecture
- Standardized for 80mm thermal printers
- Native print (Capacitor) + browser print fallback
- ESC/POS command support for Android

#### 5.13.2 Bill Print Configuration
- Custom header/footer text
- Logo upload with client-side optimization (canvas grayscale + contrast)
- Configurable logo dimensions (Width: 40-300px, Height: 20-200px)
- 4000ms print delay for Base64 asset rendering
- Tax Invoice and Token sections (configurable)
- Paid By section (12px font, dashed border)

#### 5.13.3 Print Types
- Bill/Invoice print
- KOT print
- Report print
- Barcode label print

---

### 5.14 Admin Panel

#### 5.14.1 Admin Dashboard (/admin-dashboard)
- Overview of all customers (business owners)
- Owner approval/rejection workflow
- Create/delete owner accounts
- Edge Functions: create-owner, approve-owner, delete-owner

#### 5.14.2 Admin Approvals (/admin-approvals)
- Pending leave requests across stores
- Pending advance requests
- Staff schedule approvals

---

### 5.15 Support System

- In-app support page (/support)
- Help documentation
- Contact support options

---

## 6. Subscription & Feature Gating

### 6.1 Tier Configuration

| Tier | Max Stores | Max Users | Max Reports | Key Features |
|------|-----------|-----------|-------------|--------------|
| Basic | 1 | 2 | 5 | Dashboard, POS, Orders, Menu, Inventory, Expenses, GST Billing, Tables, Takeaway/Pickup |
| Pro | 1 | Unlimited | All | + All Reports, Delivery, Online Orders, Commission Analytics, Leave & Advance, Face Verification, Staff Management |
| Enterprise | Unlimited | Unlimited | All | + Multi-Store, API Access, Custom Integrations |

### 6.2 Feature Gating Implementation
- UpgradeGate component: Blurs locked content + lock icon + required tier badge
- ProBadge / EnterpriseBadge: Sidebar indicators on locked items
- useSubscription hook: Checks current tier against required tier
- subscriptionConfig.ts: Maps features → required tier
- Admin role bypasses all gates

---

## 7. Platform & Infrastructure

### 7.1 Frontend Architecture

src/
├── components/
│   ├── ui/          → shadcn/ui primitives (40+ components)
│   ├── pos/         → POS-specific components (80+ components)
│   ├── layout/      → MainLayout, AppHeader, AppSidebar
│   └── admin/       → Admin-specific components
├── contexts/        → Auth, POS, Theme, Locale, SupabaseAuth (5 contexts)
├── hooks/           → 25+ custom hooks
├── pages/           → 60+ route pages (all lazy-loaded)
├── lib/             → Utilities (print, bill, export, i18n, store, barcode)
└── integrations/    → Supabase client & types

### 7.2 State Management

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Server state | TanStack Query | API data caching, background sync |
| Auth state | SupabaseAuthContext | User session, role, customer info |
| POS state | POSContext | Active store, cart, current order |
| Theme | ThemeContext | Light/dark mode toggle |
| Locale | LocaleContext | Language, date format, currency |
| Persistent | localStorage | Offline data, staff session, settings |

### 7.3 Offline-First Architecture
- Service Worker (sw.js, pwabuilder-sw.js) caches static assets
- useOrderSync hook queues orders when offline; syncs on reconnect
- useStoreDataSync syncs store data bidirectionally
- OfflineIndicator component shows connectivity status bar
- localStorage-based data persistence for critical POS operations
- PWA install prompt (PWAInstallPrompt) for app-like experience

### 7.4 Native Capabilities (Capacitor Plugins)

| Plugin | Purpose |
|--------|---------|
| @capacitor/camera | Face capture, product photos |
| @capacitor/geolocation | Staff attendance GPS verification |
| @capacitor/push-notifications | Staff/order push notifications |
| @capacitor/app | Back button handling, app state management |

### 7.5 Backend (Lovable Cloud Edge Functions)

| Function | Purpose |
|----------|---------|
| secure-store-login | Validate store code + password |
| staff-login | Validate staff PIN |
| create-owner | Register new owner account |
| approve-owner | Admin approves owner registration |
| delete-owner | Admin removes owner and data |
| create-staff | Owner creates staff auth account + role |
| delete-staff | Owner removes staff access |
| get-store-staff | List all staff for a store |
| create-payment-order | Create Razorpay payment order |
| check-payment-status | Poll Razorpay for payment status |
| payment-webhook | Razorpay webhook handler (verify signature) |
| process-refund | Initiate Razorpay refund |
| online-order-webhook | Receive Swiggy/Zomato order webhook |
| sync-orders | Sync offline orders to database |
| sync-store-data | Bidirectional store data synchronization |
| chat-assistant | AI-powered chat assistant |
| verify-face | Face recognition verification |

### 7.6 Database Schema (27 Tables)

**Core:** stores, customers, profiles, user_roles, store_settings
**POS:** orders, menu_items, menu_item_variations, menu_item_ingredients, held_bills, pos_customers
**Inventory:** inventory_items, inventory_components
**Payments:** payments, payment_disputes, payment_settlements
**Staff:** staff_attendance, staff_notifications, staff_schedules, leave_requests, advance_requests
**Finance:** expenses, online_orders
**Chat:** chat_conversations, chat_messages, chat_participants
**Security:** login_attempts, security_audit_log

---

## 8. Settings Taxonomy

| Settings Group | Component | Key Configs |
|---------------|-----------|-------------|
| Billing System | BillingSystemSettings | Bill format, auto-reset, prefix |
| Bill Config | BillConfigSettings | Header/footer text, logo upload, logo dimensions |
| Print | PrintSettings | Printer type, paper size, auto-print |
| Calculations | CalculationsSettings | Rounding rules, tax calculation method |
| Display | DisplaySettings | Theme (light/dark), font size, compact mode |
| Locale | LocaleSettings | Language (EN/HI), date format, currency symbol |
| Restaurant Config | RestaurantConfigSettings | Dine-in/takeaway toggle, service charge |
| Table | TableSettings | Table count, naming convention |
| KOT | KOTSettings | Auto-print KOT, KOT format |
| Cash | CashSettings | Opening balance, denomination tracking |
| Customer | CustomerSettings | Mandatory phone, loyalty config |
| Staff/Shift | StaffShiftSettings | Shift timings, overtime rules |
| Store Location | StoreLocationSettings | GPS coordinates, geofence radius |
| Payment | PaymentSettingsPanel | Razorpay keys, enabled payment methods |
| Payment UX | PaymentUXSettings | Auto-close dialog, receipt format |
| Payment Sound | PaymentSoundSettings | Success/failure sound alerts |
| Feedback | FeedbackSettings | Post-bill feedback prompt |
| Online Orders | OnlineOrderSettings | Platform API keys, auto-accept toggle |
| Delivery Boy | DeliveryBoySettings | Delivery personnel management |
| Due Payment | DuePaymentSettings | Credit limits, reminder frequency |
| Sales Reset | SalesResetSettings | Daily reset time, auto-reconcile |
| Linked Services | LinkedServicesSettings | Third-party integrations |
| Admin/Owner | AdminOwnerSettings | Business profile, subscription management |

---

## 9. UI/UX Specifications

### 9.1 Layout Modes

| Mode | Layout |
|------|--------|
| Desktop | Collapsible sidebar + header + content area |
| Mobile | Bottom navigation + hamburger menu + swipeable panels |
| POS Desktop | Full-screen split: Menu (left 60%) + Cart (right 40%) |
| Mobile POS | Stacked layout with floating cart button |
| Kitchen Display | Full-screen order cards |

### 9.2 Design System
- Framework: shadcn/ui (40+ Radix-based components)
- Theming: CSS custom properties with HSL values; light/dark mode
- Typography: System font stack
- Icons: Lucide React (200+ icons used)
- Charts: Recharts (bar, line, pie, area)
- Animations: CSS transitions + tailwindcss-animate
- Toast: Dual system — Sonner (bottom) + Radix Toast (top-right)
- Modals: Radix Dialog + Vaul Drawer (mobile)

### 9.3 Responsive Breakpoints
- Mobile: < 768px (detected via use-mobile hook)
- Tablet: 768px–1024px
- Desktop: > 1024px

### 9.4 Mobile-Specific Components
- MobileHeader: Compact header with back button
- MobileCart: Full-screen cart overlay
- MobileMenuManagement: Touch-optimized menu editor
- MobilePOSPage: Dedicated mobile POS layout

---

## 10. Security Requirements

| Requirement | Implementation |
|------------|----------------|
| Authentication | Multi-method (email, store code, PIN, biometric, face) |
| Authorization | Role-based route guards + database RLS policies |
| Data Isolation | Store-level RLS — users only access their store's data |
| Audit Trail | security_audit_log for all data mutations |
| Login Protection | login_attempts with rate limiting |
| API Security | Edge Functions validate auth tokens |
| Password Storage | Hashed via Supabase Auth |
| HTTPS | Enforced on all endpoints |
| Input Validation | Zod schemas on all forms |
| CORS | Configured per edge function |

---

## 11. Performance Requirements

| Metric | Target |
|--------|--------|
| Initial Load (LCP) | < 3s on 3G |
| Route Navigation | < 500ms (code-split, lazy-loaded) |
| Bill Generation | < 200ms |
| Offline → Online Sync | < 5s for queued orders |
| Search Response | < 100ms (client-side filtering) |
| Bundle Size | Code-split per route; < 500KB initial |
| Print Execution | < 5s including 4s render delay |

---

## 12. Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS + shadcn/ui |
| State Management | React Context + TanStack Query |
| Backend/Database | Lovable Cloud (PostgreSQL) |
| Auth | Supabase Auth + custom store/staff login |
| Edge Functions | Deno-based serverless functions |
| Native Apps | Capacitor (Android/iOS) |
| PWA | Service Worker + Web Manifest |
| Payments | Razorpay |
| Charts | Recharts |
| Barcode | JsBarcode (generation) + html5-qrcode (scanning) |
| QR Code | qrcode.react |
| Forms | React Hook Form + Zod |
| Date Handling | date-fns |
| Routing | React Router DOM v6 |

---

## 13. Custom Hooks Reference

| Hook | Purpose |
|------|---------|
| useAndroidBackButton | Handle Android hardware back button |
| useAppPermissions | Request camera, GPS, notification permissions |
| useAnalytics | Track user events |
| useBarcodeScanner | Camera-based barcode scanning |
| useBillTranslations | Bilingual bill text |
| useBiometricAuth | Fingerprint/face authentication |
| useBusinessDate | Business day calculation |
| useClosingTimeWarning | Alert near closing hours |
| useFingerprintAuth | Fingerprint-specific auth |
| useHaptic | Vibration feedback on actions |
| useInventoryDeduction | Auto-deduct stock on order |
| useKeyboardShortcuts | POS keyboard shortcuts |
| useLocationVerification | GPS distance validation |
| useOrderSync | Offline order queue & sync |
| useOwnerStore | Owner's store selection |
| usePayment | Payment processing logic |
| usePaymentSettings | Payment configuration |
| usePaymentSound | Audio feedback for payments |
| usePlatform | Detect web/android/ios |
| useScanConfirmation | Barcode scan confirmation |
| useStaffAttendance | Check-in/out logic |
| useStoreDataSync | Bidirectional store sync |
| useStoreInitializer | Initial store setup |
| useStoreSettings | Read/write store settings |
| useSubscription | Tier-based feature gating |

---

## 14. Future Roadmap (Planned)

| Feature | Target Tier | Status |
|---------|-------------|--------|
| AI Control Center | Enterprise | Planned |
| AI Analytics Dashboard | Enterprise | Planned |
| App Marketplace | Pro+ | Planned |
| API Management Portal | Enterprise | Planned |
| Brand Management | Enterprise | Planned |
| Loyalty & Rewards Program | Pro | Planned |
| WhatsApp Order Bot | Pro | Planned |
| Multi-language QR Menu | Pro | Planned |
| Windows MSIX Distribution | All | Planned |
| iOS App Store Release | All | Planned |

---

## 15. Glossary

| Term | Definition |
|------|------------|
| KOT | Kitchen Order Ticket — printed/displayed order for kitchen staff |
| KDS | Kitchen Display System — real-time screen in kitchen |
| RLS | Row-Level Security — database access control per user |
| HSN | Harmonized System of Nomenclature — Indian tax classification |
| GST | Goods and Services Tax — Indian indirect tax |
| UTR | Unique Transaction Reference — bank settlement identifier |
| ESC/POS | Epson Standard Code for Point of Sale — thermal printer commands |
| PWA | Progressive Web App — installable web application |

---

*Document generated from MAXORA codebase analysis — February 2026*
`;

const PRDPage: React.FC = () => {
  const navigate = useNavigate();

  const downloadPRD = (format: 'md' | 'txt') => {
    const blob = new Blob([PRD_CONTENT.trim()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MAXORA-POS-PRD.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Simple markdown to HTML renderer
  const renderMarkdown = (md: string) => {
    let html = md
      // Headers
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-6 mb-2 text-foreground">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-8 mb-3 text-foreground border-b border-border pb-2">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-8 mb-4 text-foreground">$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Code blocks
      .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm">$1</code>')
      // Horizontal rules
      .replace(/^---$/gm, '<hr class="my-6 border-border" />')
      // List items
      .replace(/^- (.*$)/gm, '<li class="ml-4 text-sm text-muted-foreground">$1</li>')
      // Table handling
      .replace(/\|(.+)\|/g, (match) => {
        const cells = match.split('|').filter(c => c.trim());
        if (cells.every(c => /^[\s-:]+$/.test(c))) return ''; // separator row
        const isHeader = cells.some(c => /[A-Z]/.test(c));
        const tag = isHeader ? 'th' : 'td';
        const cls = isHeader
          ? 'px-3 py-2 text-left text-xs font-semibold text-foreground bg-muted'
          : 'px-3 py-2 text-xs text-muted-foreground border-t border-border';
        return '<tr>' + cells.map(c => `<${tag} class="${cls}">${c.trim()}</${tag}>`).join('') + '</tr>';
      })
      // Paragraphs
      .replace(/^(?!<[hluot]|<hr|<tr|<li)(.*\S.*)$/gm, '<p class="text-sm text-muted-foreground mb-2">$1</p>')
      // Wrap table rows
      .replace(/(<tr>.*?<\/tr>\s*)+/g, '<div class="overflow-x-auto my-4"><table class="w-full border border-border rounded-lg overflow-hidden">$&</table></div>')
      // Wrap list items  
      .replace(/(<li.*?<\/li>\s*)+/g, '<ul class="my-2 space-y-1">$&</ul>');
    
    return html;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => downloadPRD('md')}>
              <Download className="w-4 h-4 mr-2" /> Download .md
            </Button>
            <Button size="sm" onClick={() => downloadPRD('txt')}>
              <Download className="w-4 h-4 mr-2" /> Download .txt
            </Button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div 
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(PRD_CONTENT) }} 
        />
      </div>
    </div>
  );
};

export default PRDPage;
