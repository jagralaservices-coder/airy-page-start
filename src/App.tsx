import { useState, lazy, Suspense, useEffect } from 'react';

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { POSProvider, usePOSSafe } from "@/contexts/POSContext";
import { SupabaseAuthProvider, useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { FeatureAccessProvider } from "@/contexts/FeatureAccessContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { FeatureGuard } from "@/components/FeatureGuard";
import { ImpersonationProvider, useImpersonation } from "@/contexts/ImpersonationContext";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";

import { PermissionRequestScreen } from "@/components/PermissionRequestScreen";
import { useAndroidBackButton } from "@/hooks/useAndroidBackButton";
import { BackupRestoreGate } from "@/components/pos/BackupRestoreGate";

// Lazy-loaded pages for code splitting
const WelcomePage = lazy(() => import("./pages/WelcomePage"));
const AuthPage = lazy(() => import("./pages/auth/AuthPage"));
const AuthCallbackPage = lazy(() => import("./pages/auth/AuthCallbackPage"));
import { SuperAdminLayout } from "./components/admin/SuperAdminLayout";
const AdminExecutiveDashboardPage = lazy(() => import("./pages/admin/ExecutiveDashboardPage"));
const AccountManagementPage = lazy(() => import("./pages/admin/AccountManagementPage"));
const SubscriptionManagementPage = lazy(() => import("./pages/admin/SubscriptionManagementPage"));
const SubscriptionRequestsPage = lazy(() => import("./pages/admin/SubscriptionRequestsPage"));
const MerchantManagementPage = lazy(() => import("./pages/admin/MerchantManagementPage"));
const StoreManagementPage = lazy(() => import("./pages/admin/StoreManagementPage"));
const FinancialAnalyticsPage = lazy(() => import("./pages/admin/FinancialAnalyticsPage"));
const SystemAnalyticsPage = lazy(() => import("./pages/admin/SystemAnalyticsPage"));
const CustomerAnalyticsPage = lazy(() => import("./pages/admin/CustomerAnalyticsPage"));
const StaffAnalyticsPage = lazy(() => import("./pages/admin/StaffAnalyticsPage"));
const ReportCenterPage = lazy(() => import("./pages/admin/ReportCenterPage"));
const NotificationsCenterPage = lazy(() => import("./pages/admin/NotificationsCenterPage"));
const AuditSecurityPage = lazy(() => import("./pages/admin/AuditSecurityPage"));
const AIInsightsPage = lazy(() => import("./pages/admin/AIInsightsPage"));
const PlatformAdminsPage = lazy(() => import("./pages/admin/PlatformAdminsPage"));
const PendingApprovalsPage = lazy(() => import("./pages/admin/PendingApprovalsPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const POSBillingPage = lazy(() => import("./pages/POSBillingPage"));
const TablesManagementPage = lazy(() => import("./pages/TablesManagementPage"));
const OrdersManagementPage = lazy(() => import("./pages/OrdersManagementPage"));
const KitchenDisplayPage = lazy(() => import("./pages/KitchenDisplayPage"));
const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const StaffPortalPage = lazy(() => import("./pages/StaffPortalPage"));
const StaffDashboardPage = lazy(() => import("./pages/StaffDashboardPage"));
const LeaveRequestPage = lazy(() => import("./pages/LeaveRequestPage"));
const AdvanceRequestPage = lazy(() => import("./pages/AdvanceRequestPage"));
const StaffNotificationsPage = lazy(() => import("./pages/StaffNotificationsPage"));
const AdminApprovalsPage = lazy(() => import("./pages/AdminApprovalsPage"));
const StaffSchedulePage = lazy(() => import("./pages/StaffSchedulePage"));
const StaffSettingsPage = lazy(() => import("./pages/StaffSettingsPage"));
const AttendanceReportsPage = lazy(() => import("./pages/AttendanceReportsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const OwnerSettingsPage = lazy(() => import("./pages/OwnerSettingsPage"));
const OperationsPage = lazy(() => import("./pages/OperationsPage"));
const SearchBillPage = lazy(() => import("./pages/SearchBillPage"));
const BulkMenuUploadPage = lazy(() => import("./pages/BulkMenuUploadPage"));
const MenuPage = lazy(() => import("./pages/MenuPage"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const CategorySummaryPage = lazy(() => import("./pages/reports/CategorySummaryPage"));
const ItemSummaryPage = lazy(() => import("./pages/reports/ItemSummaryPage"));
const SalesSummaryPage = lazy(() => import("./pages/reports/SalesSummaryPage"));
const OrderSummaryPage = lazy(() => import("./pages/reports/OrderSummaryPage"));
const ExecutiveSalesPage = lazy(() => import("./pages/reports/ExecutiveSalesPage"));
const EmployeeSummaryPage = lazy(() => import("./pages/reports/EmployeeSummaryPage"));
const GroupSummaryPage = lazy(() => import("./pages/reports/GroupSummaryPage"));
const VariationSummaryPage = lazy(() => import("./pages/reports/VariationSummaryPage"));
const CoverSizeSummaryPage = lazy(() => import("./pages/reports/CoverSizeSummaryPage"));
const TipSummaryPage = lazy(() => import("./pages/reports/TipSummaryPage"));
const CounterSummaryPage = lazy(() => import("./pages/reports/CounterSummaryPage"));
const StoresPage = lazy(() => import("./pages/StoresPage"));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage"));
const CashFlowPage = lazy(() => import("./pages/CashFlowPage"));
const WithdrawalPage = lazy(() => import("./pages/WithdrawalPage"));
const CashTopUpPage = lazy(() => import("./pages/CashTopUpPage"));
const AdvancedReportsPage = lazy(() => import("./pages/AdvancedReportsPage"));
const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const OnlineOrdersPage = lazy(() => import("./pages/OnlineOrdersPage"));
const KOTListingPage = lazy(() => import("./pages/KOTListingPage"));
const DeliveryPage = lazy(() => import("./pages/DeliveryPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const ComplianceDashboardPage = lazy(() => import("./pages/ComplianceDashboardPage"));
const PurchaseOrdersPage = lazy(() => import("./pages/PurchaseOrdersPage"));
const WorkforceAnalyticsPage = lazy(() => import("./pages/WorkforceAnalyticsPage"));
const AIControlCenterPage = lazy(() => import("./pages/AIControlCenterPage"));
const SmartInventoryPage = lazy(() => import("./pages/SmartInventoryPage"));
const DynamicPricingPage = lazy(() => import("./pages/DynamicPricingPage"));
const ExecutiveDashboardPage = lazy(() => import("./pages/ExecutiveDashboardPage"));
const APIManagementPage = lazy(() => import("./pages/APIManagementPage"));
const TaxEnginePage = lazy(() => import("./pages/TaxEnginePage"));
const RevenueForecastPage = lazy(() => import("./pages/RevenueForecastPage"));
const PRDPage = lazy(() => import("./pages/PRDPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const CustomerMenuPage = lazy(() => import("./pages/CustomerMenuPage"));
const QROrdersPage = lazy(() => import("./pages/QROrdersPage"));
const OrderTrackingPage = lazy(() => import("./pages/OrderTrackingPage"));
const CreditLedgerPage = lazy(() => import("./pages/CreditLedgerPage"));
const UICustomizationPage = lazy(() => import("./pages/UICustomizationPage"));
const UpgradePlanPage = lazy(() => import("./pages/UpgradePlanPage"));
const AddonsMarketplacePage = lazy(() => import("./pages/AddonsMarketplacePage"));
const NotFound = lazy(() => import("./pages/NotFound"));
import { PWAInstallPrompt } from "./components/pos/PWAInstallPrompt";
import { BackgroundQROrderManager } from "./components/pos/BackgroundQROrderManager";

const queryClient = new QueryClient();

// Loading spinner component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
  </div>
);

// Protected route wrapper - defined outside to maintain stable identity
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[]; allowStoreLogin?: boolean; allowStaffLogin?: boolean }> = ({ 
  children, 
  allowedRoles,
  allowStoreLogin = false,
  allowStaffLogin = false
}) => {
  const { isAuthenticated, isLoading, userRole, customer } = useSupabaseAuth();
  const posContext = usePOSSafe();
  const { isImpersonating } = useImpersonation();
  
  // Safely access POS context values with defaults
  const isStoreLogin = posContext?.isStoreLogin ?? false;
  const activeStore = posContext?.activeStore ?? null;
  
  // Check for staff login session
  const staffSession = typeof window !== 'undefined' ? localStorage.getItem('pos_staff_session') : null;
  const isStaffLoggedIn = !!staffSession;
  const hasAuthenticatedStaffRole = isAuthenticated && userRole?.role === 'staff';
  
  // Helper to wrap component with BackupRestoreGate if storeId is resolved
  const renderWithGate = (content: React.ReactNode) => {
    // If the account is suspended and NOT an admin impersonating
    if (customer && !customer.is_active && !isImpersonating) {
      return (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground shadow-lg border rounded-lg max-w-md w-full p-6 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Account Suspended</h2>
              <p className="text-muted-foreground">Your merchant account has been suspended. Please contact the administrator for assistance.</p>
            </div>
            <button className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2" onClick={() => window.location.href = 'mailto:admin@maxora.com'}>Contact Support</button>
          </div>
        </div>
      );
    }
    return <>{content}</>;
  };

  // For staff-only routes (allowStaffLogin=true without allowedRoles), require staff session
  const isStaffOnlyRoute = allowStaffLogin && !allowedRoles && !allowStoreLogin;
  
  // Staff-only route: must have staff session, don't allow owner/admin Supabase auth
  if (isStaffOnlyRoute) {
    if (isStaffLoggedIn || hasAuthenticatedStaffRole) {
      return renderWithGate(<MainLayout>{children}</MainLayout>);
    }
    // No staff session - redirect to staff login
    try { localStorage.removeItem('pos_last_path'); } catch (e) {}
    return <Navigate to="/auth" replace />;
  }
  
  // Show loading while auth is initializing (only if not store/staff login)
  if (isLoading && !isStoreLogin && !isStaffLoggedIn) {
    return <LoadingSpinner />;
  }
  
  // Allow access if store login is enabled for this route and user is logged in via store
  if (allowStoreLogin && isStoreLogin && activeStore) {
    return renderWithGate(<MainLayout>{children}</MainLayout>);
  }
  
  // Allow access if staff login is enabled for this route and staff is logged in
  if (allowStaffLogin && (isStaffLoggedIn || hasAuthenticatedStaffRole)) {
    return renderWithGate(<MainLayout>{children}</MainLayout>);
  }
  
  // Redirect if not authenticated via any method
  if (!isAuthenticated && !isStoreLogin && !isStaffLoggedIn) {
    try { localStorage.removeItem('pos_last_path'); } catch (e) {}
    return <Navigate to="/" replace />;
  }

  // Check role-based access (only for Supabase auth)
  if (allowedRoles && (!userRole || !allowedRoles.includes(userRole.role)) && !isImpersonating) {
    // If store login is active, allow access
    if (isStoreLogin && activeStore) {
      return renderWithGate(<MainLayout>{children}</MainLayout>);
    }
    try { localStorage.removeItem('pos_last_path'); } catch (e) {}
    return <Navigate to="/" replace />;
  }
  
  return renderWithGate(<MainLayout>{children}</MainLayout>);
};

// Admin route wrapper - no MainLayout, no sidebar, no header
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, userRole } = useSupabaseAuth();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated || !userRole || !['admin', 'super_admin'].includes(userRole.role)) {
    try { localStorage.removeItem('pos_last_path'); } catch (e) {}
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

// Public route wrapper - shows content if not authenticated, redirects if authenticated
const SuperAdminOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, isSuperAdmin } = useSupabaseAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated || !isSuperAdmin()) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, userRole } = useSupabaseAuth();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (isAuthenticated) {
    // Redirect based on role if role exists
    if (userRole) {
      switch (userRole.role) {
        case 'super_admin':
        case 'admin':
          return <Navigate to="/admin/dashboard" replace />;
        case 'owner':
          return <Navigate to="/dashboard" replace />;
        case 'store_manager':
          return <Navigate to="/pos" replace />;
        case 'staff':
          return <Navigate to="/staff-dashboard" replace />;
      }
    }
    // If authenticated but no role yet, still show the page (they need to contact admin)
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  // Enable Android back button handling
  useAndroidBackButton();
  
  const location = useLocation();
  useEffect(() => {
    if (
      location.pathname !== '/auth' && 
      location.pathname !== '/' &&
      location.pathname !== '/index' &&
      location.pathname !== '/index.html' &&
      location.pathname !== '/auth/callback' && 
      location.pathname !== '/~oauth' &&
      location.pathname !== '/reset-password'
    ) {
      localStorage.setItem('pos_last_path', location.pathname + location.search);
    }
  }, [location]);
  
  return (
    <Suspense fallback={<LoadingSpinner />}>
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<WelcomePage />} />
      <Route path="/index" element={<Navigate to="/" replace />} />
      <Route path="/index.html" element={<Navigate to="/" replace />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/~oauth" element={<AuthCallbackPage />} />
      
      {/* Reset Password */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      
      {/* Public QR Menu for customers */}
      <Route path="/menu/:storeCode" element={<CustomerMenuPage />} />
      <Route path="/track/:storeCode/:orderNumber" element={<OrderTrackingPage />} />
      
      {/* Legacy routes - redirect to unified auth or new admin layout */}
      <Route path="/login" element={<Navigate to="/auth" replace />} />
      <Route path="/staff-login" element={<Navigate to="/auth" replace />} />
      <Route path="/admin-dashboard" element={<Navigate to="/admin/dashboard" replace />} />

      {/* Super Admin Routes */}
      <Route path="/admin" element={<AdminRoute><SuperAdminLayout /></AdminRoute>}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminExecutiveDashboardPage />} />
        <Route path="accounts" element={<AccountManagementPage />} />
        <Route path="subscriptions" element={<SubscriptionManagementPage />} />
        <Route path="subscription-requests" element={<SubscriptionRequestsPage />} />
        <Route path="merchants" element={<MerchantManagementPage />} />
        <Route path="stores" element={<StoreManagementPage />} />
        <Route path="finance" element={<FinancialAnalyticsPage />} />
        <Route path="system" element={<SystemAnalyticsPage />} />
        <Route path="customers" element={<CustomerAnalyticsPage />} />
        <Route path="staff" element={<StaffAnalyticsPage />} />
        <Route path="reports" element={<ReportCenterPage />} />
        <Route path="notifications" element={<NotificationsCenterPage />} />
        <Route path="audit" element={<AuditSecurityPage />} />
        <Route path="ai-insights" element={<AIInsightsPage />} />
        <Route path="platform-admins" element={<SuperAdminOnlyRoute><PlatformAdminsPage /></SuperAdminOnlyRoute>} />
        <Route path="approvals" element={<SuperAdminOnlyRoute><PendingApprovalsPage /></SuperAdminOnlyRoute>} />
      </Route>

      {/* Staff Routes (accessible after staff login) */}
      <Route path="/staff-dashboard" element={
        <ProtectedRoute allowStaffLogin><StaffDashboardPage /></ProtectedRoute>
      } />
      <Route path="/leave-request" element={
        <ProtectedRoute allowStaffLogin><LeaveRequestPage /></ProtectedRoute>
      } />
      <Route path="/advance-request" element={
        <ProtectedRoute allowStaffLogin><AdvanceRequestPage /></ProtectedRoute>
      } />
      <Route path="/staff-notifications" element={
        <ProtectedRoute allowStaffLogin><StaffNotificationsPage /></ProtectedRoute>
      } />
      
      {/* Protected Routes - Owner & Store Manager */}
      <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><DashboardPage /></ProtectedRoute>
      } />
      <Route path="/pos" element={<ProtectedRoute allowedRoles={['store_manager']} allowStoreLogin={true} allowStaffLogin={true}><POSBillingPage /></ProtectedRoute>} />
      <Route path="/tables" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><FeatureGuard featureKey="tableManagement"><TablesManagementPage /></FeatureGuard></ProtectedRoute>
      } />
      <Route path="/orders" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><OrdersManagementPage /></ProtectedRoute>
      } />
      <Route path="/kitchen" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><KitchenDisplayPage /></ProtectedRoute>
      } />
      <Route path="/inventory" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><InventoryPage /></ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><ReportsPage /></ProtectedRoute>
      } />
      <Route path="/staff-portal" element={
        <ProtectedRoute><StaffPortalPage /></ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><OwnerSettingsPage /></ProtectedRoute>
      } />
      <Route path="/owner-settings" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><OwnerSettingsPage /></ProtectedRoute>
      } />
      <Route path="/backup" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><SettingsPage /></ProtectedRoute>
      } />
      <Route path="/ui-customization" element={
        <ProtectedRoute allowStoreLogin allowStaffLogin><UICustomizationPage /></ProtectedRoute>
      } />
      <Route path="/operations" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><OperationsPage /></ProtectedRoute>
      } />
      <Route path="/search-bill" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><SearchBillPage /></ProtectedRoute>
      } />
      <Route path="/bulk-upload" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']}><BulkMenuUploadPage /></ProtectedRoute>
      } />
      <Route path="/menu" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><MenuPage /></ProtectedRoute>
      } />
      <Route path="/stores" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner']}><StoresPage /></ProtectedRoute>
      } />
      <Route path="/expenses" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><FeatureGuard featureKey="expenseTracking"><ExpensesPage /></FeatureGuard></ProtectedRoute>
      } />
      <Route path="/customers" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><CustomersPage /></ProtectedRoute>
      } />
      <Route path="/online-orders" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><FeatureGuard featureKey="swiggyZomato"><OnlineOrdersPage /></FeatureGuard></ProtectedRoute>
      } />
      <Route path="/qr-orders" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><FeatureGuard featureKey="qrMenuOrdering"><QROrdersPage /></FeatureGuard></ProtectedRoute>
      } />
      <Route path="/kot-listing" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><FeatureGuard featureKey="kotListing"><KOTListingPage /></FeatureGuard></ProtectedRoute>
      } />
      <Route path="/support" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><SupportPage /></ProtectedRoute>
      } />
      <Route path="/delivery" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><FeatureGuard featureKey="deliveryTracking"><DeliveryPage /></FeatureGuard></ProtectedRoute>
      } />
      <Route path="/credit-ledger" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><FeatureGuard featureKey="creditLedger"><CreditLedgerPage /></FeatureGuard></ProtectedRoute>
      } />
      <Route path="/cash-flow" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><FeatureGuard featureKey="cashFlow"><CashFlowPage /></FeatureGuard></ProtectedRoute>
      } />
      <Route path="/withdrawal" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><FeatureGuard featureKey="withdrawal"><WithdrawalPage /></FeatureGuard></ProtectedRoute>
      } />
      <Route path="/cash-topup" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><FeatureGuard featureKey="cashTopUp"><CashTopUpPage /></FeatureGuard></ProtectedRoute>
      } />
      <Route path="/advanced-reports" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><FeatureGuard featureKey="advancedAnalytics"><AdvancedReportsPage /></FeatureGuard></ProtectedRoute>
      } />
      <Route path="/chat" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin allowStaffLogin><FeatureGuard featureKey="teamChat"><ChatPage /></FeatureGuard></ProtectedRoute>
      } />
      {/* Admin Management Routes */}
      <Route path="/admin-approvals" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><AdminApprovalsPage /></ProtectedRoute>
      } />
      <Route path="/staff-schedule" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><StaffSchedulePage /></ProtectedRoute>
      } />
      <Route path="/staff-settings" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><StaffSettingsPage /></ProtectedRoute>
      } />
      <Route path="/attendance-reports" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><AttendanceReportsPage /></ProtectedRoute>
      } />
      
      {/* Report Routes */}
      <Route path="/reports/category" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><CategorySummaryPage /></ProtectedRoute>
      } />
      <Route path="/reports/item" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><ItemSummaryPage /></ProtectedRoute>
      } />
      <Route path="/reports/sales" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><SalesSummaryPage /></ProtectedRoute>
      } />
      <Route path="/reports/order" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><OrderSummaryPage /></ProtectedRoute>
      } />
      <Route path="/reports/executive" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><ExecutiveSalesPage /></ProtectedRoute>
      } />
      <Route path="/reports/employee" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><EmployeeSummaryPage /></ProtectedRoute>
      } />
      <Route path="/reports/group" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><GroupSummaryPage /></ProtectedRoute>
      } />
      <Route path="/reports/variation" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><VariationSummaryPage /></ProtectedRoute>
      } />
      <Route path="/reports/cover-size" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><CoverSizeSummaryPage /></ProtectedRoute>
      } />
      <Route path="/reports/tip" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><TipSummaryPage /></ProtectedRoute>
      } />
      <Route path="/reports/counter" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><CounterSummaryPage /></ProtectedRoute>
      } />
      
      <Route path="/compliance" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><FeatureGuard featureKey="compliance"><ComplianceDashboardPage /></FeatureGuard></ProtectedRoute>
      } />
      <Route path="/purchase-orders" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><FeatureGuard featureKey="purchaseOrders"><PurchaseOrdersPage /></FeatureGuard></ProtectedRoute>
      } />
      <Route path="/workforce-analytics" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><FeatureGuard featureKey="workforceAnalytics"><WorkforceAnalyticsPage /></FeatureGuard></ProtectedRoute>
      } />
      <Route path="/ai-control-center" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><FeatureGuard featureKey="aiControlCenter"><AIControlCenterPage /></FeatureGuard></ProtectedRoute>
      } />
      <Route path="/smart-inventory" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><FeatureGuard featureKey="smartInventory"><SmartInventoryPage /></FeatureGuard></ProtectedRoute>
      } />
      <Route path="/dynamic-pricing" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><FeatureGuard featureKey="dynamicPricing"><DynamicPricingPage /></FeatureGuard></ProtectedRoute>
      } />
      <Route path="/executive-dashboard" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner']} allowStoreLogin><FeatureGuard featureKey="executiveDashboard"><ExecutiveDashboardPage /></FeatureGuard></ProtectedRoute>
      } />
      <Route path="/api-management" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner']} allowStoreLogin><FeatureGuard featureKey="apiIntegrations"><APIManagementPage /></FeatureGuard></ProtectedRoute>
      } />
      <Route path="/tax-engine" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner', 'store_manager']} allowStoreLogin><FeatureGuard featureKey="taxEngine"><TaxEnginePage /></FeatureGuard></ProtectedRoute>
      } />
      <Route path="/revenue-forecast" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner']} allowStoreLogin><FeatureGuard featureKey="revenueForecast"><RevenueForecastPage /></FeatureGuard></ProtectedRoute>
      } />
      <Route path="/prd" element={<PRDPage />} />
      <Route path="/upgrade-plan" element={<UpgradePlanPage />} />
      <Route path="/addons" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner']}><AddonsMarketplacePage /></ProtectedRoute>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
};

const App = () => {
  const [permissionsComplete, setPermissionsComplete] = useState(() => {
    try {
      return localStorage.getItem('permissions_requested') === 'true';
    } catch {
      return true;
    }
  });

  // Show permission request screen on first launch (native only)
  if (!permissionsComplete) {
    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <PermissionRequestScreen onComplete={() => setPermissionsComplete(true)} />
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LocaleProvider>
            <SupabaseAuthProvider>
              <FeatureAccessProvider>
                <ImpersonationProvider>
                  <POSProvider>
                    <TooltipProvider>
                      <Toaster />
                      <Sonner />
                      <OfflineIndicator />
                      <ImpersonationBanner />
                      <BrowserRouter>
                        <BackgroundQROrderManager />
                        <AppRoutes />
                        <PWAInstallPrompt />
                      </BrowserRouter>
                    </TooltipProvider>
                  </POSProvider>
                </ImpersonationProvider>
              </FeatureAccessProvider>
            </SupabaseAuthProvider>
          </LocaleProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
