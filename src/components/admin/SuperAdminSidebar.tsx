import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, UserPlus, CreditCard, Store, 
  TrendingUp, Activity, UserCheck, Package, Boxes, 
  UserSquare2, FileText, Bell, Shield, Sparkles, LogOut,
  ChevronLeft, ChevronRight, Menu, Inbox
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const getNavItems = (isSuperAdmin: boolean) => {
  const items = [
    { group: 'Overview', items: [
      { name: 'Executive Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    ]},
    { group: 'Management', items: [
      ...(isSuperAdmin ? [{ name: 'Platform Admins', path: '/admin/platform-admins', icon: Shield }] : []),
      ...(isSuperAdmin ? [{ name: 'Pending Approvals', path: '/admin/approvals', icon: UserCheck }] : []),
      { name: 'Account Setup', path: '/admin/accounts', icon: UserPlus },
      { name: 'Merchants', path: '/admin/merchants', icon: Users },
      { name: 'Stores', path: '/admin/stores', icon: Store },
      { name: 'Subscriptions', path: '/admin/subscriptions', icon: CreditCard },
      { name: 'Subscription Requests', path: '/admin/subscription-requests', icon: Inbox },
    ]},
    { group: 'Analytics', items: [
      { name: 'Financial', path: '/admin/finance', icon: TrendingUp },
      { name: 'System Performance', path: '/admin/system', icon: Activity },
      { name: 'Customers', path: '/admin/customers', icon: UserCheck },
      { name: 'Staff', path: '/admin/staff', icon: UserSquare2 },
    ]},
    { group: 'Operations', items: [
      { name: 'Report Center', path: '/admin/reports', icon: FileText },
      { name: 'Notifications', path: '/admin/notifications', icon: Bell },
      { name: 'Audit & Security', path: '/admin/audit', icon: Shield },
      { name: 'AI Insights', path: '/admin/ai-insights', icon: Sparkles },
    ]}
  ];

  return items;
};

export const SuperAdminSidebar = ({ 
  isCollapsed, 
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen
}: { 
  isCollapsed: boolean, 
  setIsCollapsed: (v: boolean) => void,
  isMobileOpen: boolean,
  setIsMobileOpen: (v: boolean) => void
}) => {
  const { logout, isSuperAdmin } = useSupabaseAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = getNavItems(isSuperAdmin());

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800 transition-all duration-300">
      <div className={cn("flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-800", isCollapsed ? "justify-center" : "justify-between")}>
        {!isCollapsed && (
          <div className="flex items-center gap-2 font-bold text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            <Shield className="w-6 h-6 text-blue-600" />
            MAXORA
          </div>
        )}
        {isCollapsed && <Shield className="w-8 h-8 text-blue-600" />}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </Button>
      </div>

      <ScrollArea className="flex-1 py-4">
        <div className="space-y-6 px-3">
          {navItems.map((group, idx) => (
            <div key={idx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {group.group}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                      isActive 
                        ? "text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300" 
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800/50",
                      isCollapsed ? "justify-center" : ""
                    )}
                    title={isCollapsed ? item.name : undefined}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-md" />
                    )}
                    <Icon className={cn("w-5 h-5", isActive ? "text-blue-600 dark:text-blue-400" : "")} />
                    {!isCollapsed && <span>{item.name}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <Button 
          variant="ghost" 
          className={cn("w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30", isCollapsed ? "justify-center px-0" : "justify-start")}
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-2" />
          {!isCollapsed && "Logout"}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:block fixed inset-y-0 left-0 z-50 transition-all duration-300",
        isCollapsed ? "w-20" : "w-64"
      )}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="p-0 w-72 bg-transparent border-none">
          <div className="h-full w-full bg-white dark:bg-gray-950">
            <SidebarContent />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
