// Mirrors public.feature_catalog seed in DB. Used for UI labels, prices,
// and locked-status computation. DB remains the authoritative access source.

export type FeatureCategory =
  | 'sales'
  | 'inventory'
  | 'staff'
  | 'customer'
  | 'reports'
  | 'operations'
  | 'delivery'
  | 'ai';

export type PlanName = 'basic' | 'gold' | 'platinum';

export interface CatalogFeature {
  key: string;
  label: string;
  category: FeatureCategory;
  priceYearly: number;
  includedIn: PlanName[];
}

export const FEATURE_CATALOG: CatalogFeature[] = [
  // Sales & Billing
  { key: 'billing_pos', label: 'Billing & KOT', category: 'sales', priceYearly: 0, includedIn: ['basic','gold','platinum'] },
  { key: 'gst_invoice', label: 'GST Invoice', category: 'sales', priceYearly: 0, includedIn: ['basic','gold','platinum'] },
  { key: 'multiple_payments', label: 'Multiple Payment Option', category: 'sales', priceYearly: 0, includedIn: ['basic','gold','platinum'] },
  { key: 'dine_in', label: 'Dine-In', category: 'sales', priceYearly: 999, includedIn: ['gold','platinum'] },
  { key: 'takeaway', label: 'Takeaway', category: 'sales', priceYearly: 499, includedIn: ['gold','platinum'] },
  { key: 'delivery', label: 'Delivery', category: 'sales', priceYearly: 999, includedIn: ['gold','platinum'] },
  { key: 'kot_system', label: 'KOT System', category: 'sales', priceYearly: 999, includedIn: ['gold','platinum'] },
  { key: 'kot_listing', label: 'KOT Listing', category: 'sales', priceYearly: 499, includedIn: ['gold','platinum'] },
  { key: 'kot_print', label: 'KOT Print', category: 'sales', priceYearly: 499, includedIn: ['gold','platinum'] },
  { key: 'kot_search', label: 'KOT Search', category: 'sales', priceYearly: 299, includedIn: ['gold','platinum'] },
  { key: 'qr_orders', label: 'QR Orders', category: 'sales', priceYearly: 1499, includedIn: ['gold','platinum'] },
  { key: 'qr_menu_ordering', label: 'QR Menu Ordering', category: 'sales', priceYearly: 999, includedIn: ['gold','platinum'] },

  // Inventory
  { key: 'basic_inventory', label: 'Basic Inventory', category: 'inventory', priceYearly: 0, includedIn: ['basic','gold','platinum'] },
  { key: 'manual_stock_update', label: 'Manual Stock Update', category: 'inventory', priceYearly: 0, includedIn: ['basic','gold','platinum'] },
  { key: 'full_inventory', label: 'Full Inventory Management', category: 'inventory', priceYearly: 1499, includedIn: ['gold','platinum'] },
  { key: 'recipe_management', label: 'Recipe Management', category: 'inventory', priceYearly: 1999, includedIn: ['platinum'] },
  { key: 'recipe_auto_deduction', label: 'Recipe Based Auto Deduction', category: 'inventory', priceYearly: 1499, includedIn: ['platinum'] },
  { key: 'auto_stock_requirement', label: 'Auto Stock Requirement (AI)', category: 'inventory', priceYearly: 2499, includedIn: ['platinum'] },
  { key: 'smart_inventory_ai', label: 'Smart Inventory AI Prediction', category: 'inventory', priceYearly: 2999, includedIn: ['platinum'] },
  { key: 'purchase_orders', label: 'Purchase Orders', category: 'inventory', priceYearly: 1499, includedIn: ['platinum'] },
  { key: 'auto_purchase_orders', label: 'Auto Purchase Orders', category: 'inventory', priceYearly: 1999, includedIn: ['platinum'] },

  // Staff & HR
  { key: 'staff_management', label: 'Staff Management', category: 'staff', priceYearly: 1499, includedIn: ['gold','platinum'] },
  { key: 'face_attendance', label: 'Face Verification Attendance', category: 'staff', priceYearly: 999, includedIn: ['gold','platinum'] },
  { key: 'geo_fencing', label: 'Geo Fencing', category: 'staff', priceYearly: 799, includedIn: ['gold','platinum'] },
  { key: 'delivery_boys', label: 'Delivery Boys Management', category: 'staff', priceYearly: 999, includedIn: ['gold','platinum'] },
  { key: 'team_chat', label: 'Team Chat', category: 'staff', priceYearly: 499, includedIn: ['gold','platinum'] },
  { key: 'workforce_analytics', label: 'Workforce Analytics', category: 'staff', priceYearly: 2499, includedIn: ['platinum'] },

  // Customer
  { key: 'customer_management', label: 'Customer Management', category: 'customer', priceYearly: 0, includedIn: ['basic','gold','platinum'] },
  { key: 'credit_ledger', label: 'Credit Ledger', category: 'customer', priceYearly: 0, includedIn: ['basic','gold','platinum'] },

  // Reports
  { key: 'rpt_category_summary', label: 'Category Summary', category: 'reports', priceYearly: 0, includedIn: ['basic','gold','platinum'] },
  { key: 'rpt_item_summary', label: 'Item Summary', category: 'reports', priceYearly: 0, includedIn: ['basic','gold','platinum'] },
  { key: 'rpt_sales_summary', label: 'Sales Summary', category: 'reports', priceYearly: 0, includedIn: ['basic','gold','platinum'] },
  { key: 'rpt_order_summary', label: 'Order Summary', category: 'reports', priceYearly: 0, includedIn: ['basic','gold','platinum'] },
  { key: 'rpt_executive_sales', label: 'Executive Sales', category: 'reports', priceYearly: 499, includedIn: ['gold','platinum'] },
  { key: 'rpt_employee_summary', label: 'Employee Summary', category: 'reports', priceYearly: 299, includedIn: ['gold','platinum'] },
  { key: 'rpt_group_summary', label: 'Group Summary', category: 'reports', priceYearly: 299, includedIn: ['gold','platinum'] },
  { key: 'rpt_variation_summary', label: 'Variation Summary', category: 'reports', priceYearly: 299, includedIn: ['gold','platinum'] },
  { key: 'rpt_cover_size_summary', label: 'Cover Size Summary', category: 'reports', priceYearly: 299, includedIn: ['gold','platinum'] },
  { key: 'rpt_tip_summary', label: 'Tip Summary', category: 'reports', priceYearly: 299, includedIn: ['gold','platinum'] },
  { key: 'rpt_counter_summary', label: 'Counter Summary', category: 'reports', priceYearly: 299, includedIn: ['gold','platinum'] },
  { key: 'rpt_expense_tracker', label: 'Expense Tracker', category: 'reports', priceYearly: 499, includedIn: ['gold','platinum'] },
  { key: 'rpt_due_payment', label: 'Due Payment', category: 'reports', priceYearly: 0, includedIn: ['basic','gold','platinum'] },
  { key: 'rpt_cash_flow', label: 'Cash Flow', category: 'reports', priceYearly: 499, includedIn: ['gold','platinum'] },
  { key: 'rpt_withdrawal', label: 'Withdrawal', category: 'reports', priceYearly: 299, includedIn: ['gold','platinum'] },
  { key: 'rpt_cash_topup', label: 'Cash Top-Up', category: 'reports', priceYearly: 299, includedIn: ['gold','platinum'] },
  { key: 'rpt_profit_loss', label: 'Profit & Loss', category: 'reports', priceYearly: 999, includedIn: ['platinum'] },
  { key: 'rpt_sales_trend', label: 'Sales Trend', category: 'reports', priceYearly: 499, includedIn: ['platinum'] },
  { key: 'rpt_hourly', label: 'Hourly Report', category: 'reports', priceYearly: 299, includedIn: ['platinum'] },
  { key: 'rpt_customers', label: 'Customers Report', category: 'reports', priceYearly: 299, includedIn: ['gold','platinum'] },
  { key: 'rpt_tables', label: 'Tables Report', category: 'reports', priceYearly: 299, includedIn: ['gold','platinum'] },
  { key: 'rpt_orders', label: 'Orders Report', category: 'reports', priceYearly: 299, includedIn: ['gold','platinum'] },
  { key: 'rpt_payment', label: 'Payment Report', category: 'reports', priceYearly: 299, includedIn: ['gold','platinum'] },
  { key: 'rpt_discount', label: 'Discount Report', category: 'reports', priceYearly: 299, includedIn: ['gold','platinum'] },
  { key: 'rpt_loss_control', label: 'Loss Control Report', category: 'reports', priceYearly: 499, includedIn: ['platinum'] },
  { key: 'rpt_tax_gst', label: 'Tax / GST Report', category: 'reports', priceYearly: 299, includedIn: ['gold','platinum'] },
  { key: 'rpt_items', label: 'Items Report', category: 'reports', priceYearly: 299, includedIn: ['gold','platinum'] },
  { key: 'rpt_retention', label: 'Retention Report', category: 'reports', priceYearly: 499, includedIn: ['platinum'] },
  { key: 'rpt_targets', label: 'Targets Report', category: 'reports', priceYearly: 499, includedIn: ['platinum'] },
  { key: 'rpt_kitchen', label: 'Kitchen Report', category: 'reports', priceYearly: 299, includedIn: ['gold','platinum'] },
  { key: 'rpt_delivery', label: 'Delivery Report', category: 'reports', priceYearly: 299, includedIn: ['gold','platinum'] },
  { key: 'rpt_invoices', label: 'Invoices Report', category: 'reports', priceYearly: 299, includedIn: ['gold','platinum'] },
  { key: 'rpt_outlets', label: 'Outlets Report', category: 'reports', priceYearly: 499, includedIn: ['platinum'] },

  // Operations
  { key: 'table_management', label: 'Table Management', category: 'operations', priceYearly: 999, includedIn: ['gold','platinum'] },
  
  { key: 'tax_engine', label: 'Tax Engine', category: 'operations', priceYearly: 999, includedIn: ['gold','platinum'] },
  { key: 'multi_outlet', label: 'Multi Outlet', category: 'operations', priceYearly: 4999, includedIn: ['platinum'] },

  // Delivery
  { key: 'delivery_tracking', label: 'Delivery Tracking', category: 'delivery', priceYearly: 1999, includedIn: ['platinum'] },

  // AI & Automation
  { key: 'alerts_notifications', label: 'Alerts & Notifications', category: 'ai', priceYearly: 499, includedIn: ['platinum'] },
  { key: 'ai_stock_requirement', label: 'AI Stock Requirement', category: 'ai', priceYearly: 1999, includedIn: ['platinum'] },
  { key: 'ai_insights', label: 'AI Smart Insights', category: 'ai', priceYearly: 2999, includedIn: ['platinum'] },
  { key: 'dynamic_pricing', label: 'Dynamic Pricing', category: 'ai', priceYearly: 1999, includedIn: ['platinum'] },
  { key: 'revenue_forecast', label: 'Revenue Forecast', category: 'ai', priceYearly: 1999, includedIn: ['platinum'] },

  { key: 'advanced_reports', label: 'Advanced Reports Bundle', category: 'reports', priceYearly: 2499, includedIn: ['gold','platinum'] },
];

export const CATEGORY_LABEL: Record<FeatureCategory, string> = {
  sales: 'Sales & Billing',
  inventory: 'Inventory',
  staff: 'Staff & HR',
  customer: 'Customer',
  reports: 'Reports',
  operations: 'Operations',
  delivery: 'Delivery',
  ai: 'AI & Automation',
};

// Legacy → new feature key alias map. Used so existing canAccess('liveView') checks
// still resolve against the new catalog.
export const LEGACY_FEATURE_ALIASES: Record<string, string> = {
  
  tableManagement: 'table_management',
  kotListing: 'kot_listing',
  qrMenuOrdering: 'qr_menu_ordering',
  deliveryTracking: 'delivery_tracking',
  swiggyZomato: 'delivery',
  teamChat: 'team_chat',
  staffManagement: 'staff_management',
  faceVerification: 'face_attendance',
  geoFencing: 'geo_fencing',
  expenseTracking: 'rpt_expense_tracker',
  creditLedger: 'credit_ledger',
  cashFlow: 'rpt_cash_flow',
  withdrawal: 'rpt_withdrawal',
  cashTopUp: 'rpt_cash_topup',
  advancedAnalytics: 'advanced_reports',
  advancedReports: 'advanced_reports',
  aiInsights: 'ai_insights',
  aiControlCenter: 'ai_insights',
  smartInventory: 'smart_inventory_ai',
  dynamicPricing: 'dynamic_pricing',
  revenueForecast: 'revenue_forecast',
  workforceAnalytics: 'workforce_analytics',
  purchaseOrders: 'purchase_orders',
  apiIntegrations: 'ai_insights',
  taxEngine: 'tax_engine',
  recipeManagement: 'recipe_management',
  multiOutlet: 'multi_outlet',
  executiveDashboard: 'advanced_reports',
  orderSummaryReport: 'rpt_order_summary',
  executiveSaleReport: 'rpt_executive_sales',
  employeeSummaryReport: 'rpt_employee_summary',
  groupSummaryReport: 'rpt_group_summary',
  variationSummaryReport: 'rpt_variation_summary',
  coverSizeSummaryReport: 'rpt_cover_size_summary',
  tipSummaryReport: 'rpt_tip_summary',
  counterSummaryReport: 'rpt_counter_summary',
  qrOrders: 'qr_orders',
  kot: 'kot_system',
  dineIn: 'dine_in',
  takeaway: 'takeaway',
  delivery: 'delivery',
};

export function resolveFeatureKey(key: string): string {
  return LEGACY_FEATURE_ALIASES[key] || key;
}

export function getFeaturesForPlan(plan: PlanName): Set<string> {
  return new Set(FEATURE_CATALOG.filter(f => f.includedIn.includes(plan)).map(f => f.key));
}

export function isLockedForPlan(plan: PlanName, key: string): boolean {
  return getFeaturesForPlan(plan).has(key);
}

export function getCatalogByCategory(): Record<FeatureCategory, CatalogFeature[]> {
  const grouped: Record<string, CatalogFeature[]> = {};
  for (const f of FEATURE_CATALOG) {
    (grouped[f.category] = grouped[f.category] || []).push(f);
  }
  return grouped as Record<FeatureCategory, CatalogFeature[]>;
}

export function priceFor(keys: string[]): number {
  const map = new Map(FEATURE_CATALOG.map(f => [f.key, f.priceYearly]));
  return keys.reduce((sum, k) => sum + (map.get(k) || 0), 0);
}
