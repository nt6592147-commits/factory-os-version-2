import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Archive,
  BarChart3,
  Bell,
  Bot,
  CalendarClock,
  CheckSquare,
  ClipboardList,
  Clock,
  Cog,
  Cpu,
  Factory,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  Users,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { NavSectionId } from '../types/factory';
import { OfflineSyncBanner, PWAInstallButton } from './PWAControls';

interface NavItemConfig {
  id: NavSectionId;
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: 'Operations' | 'Maintenance' | 'Intelligence & Records' | 'Administration';
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: 'overview', path: '/', label: 'Overview', icon: LayoutDashboard, group: 'Operations' },
  { id: 'production', path: '/production', label: 'Production', icon: Activity, group: 'Operations' },
  { id: 'materials', path: '/materials', label: 'Materials', icon: Package, group: 'Operations' },
  { id: 'machines', path: '/machines', label: 'Machines', icon: Cpu, group: 'Operations' },
  { id: 'incidents', path: '/incidents', label: 'Machine Incidents', icon: AlertTriangle, group: 'Maintenance' },
  { id: 'electrical-maintenance', path: '/electrical-maintenance', label: 'Electrical Maintenance', icon: Zap, group: 'Maintenance' },
  { id: 'mechanical-maintenance', path: '/mechanical-maintenance', label: 'Mechanical Maintenance', icon: Wrench, group: 'Maintenance' },
  { id: 'preventive-maintenance', path: '/preventive-maintenance', label: 'Preventive Maintenance', icon: CalendarClock, group: 'Maintenance' },
  { id: 'downtime', path: '/downtime', label: 'Downtime', icon: Clock, group: 'Maintenance' },
  { id: 'quality-control', path: '/quality-control', label: 'Quality Control', icon: CheckSquare, group: 'Operations' },
  { id: 'shift-reports', path: '/shift-reports', label: 'Shift Reports', icon: ClipboardList, group: 'Intelligence & Records' },
  { id: 'document-archive', path: '/document-archive', label: 'Document Archive', icon: Archive, group: 'Intelligence & Records' },
  { id: 'factory-ai', path: '/factory-ai', label: 'Factory Memory AI', icon: Bot, group: 'Intelligence & Records' },
  { id: 'analytics', path: '/analytics', label: 'Analytics', icon: BarChart3, group: 'Intelligence & Records' },
  { id: 'notifications', path: '/notifications', label: 'Notifications', icon: Bell, group: 'Administration' },
  { id: 'user-management', path: '/user-management', label: 'User Management', icon: Users, group: 'Administration' },
  { id: 'settings', path: '/settings', label: 'Settings', icon: Settings, group: 'Administration' },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user,
    factory,
    member,
    roleDef,
    dataset,
    offlineQueue,
    isSyncingQueue,
    syncOfflineQueue,
    signOutUser,
  } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const unreadCount = dataset.notifications.filter((n) => !n.isRead).length;
  const visibleNavItems = NAV_ITEMS.filter((item) => roleDef.navAccess.includes(item.id));
  const groups: NavItemConfig['group'][] = [
    'Operations',
    'Maintenance',
    'Intelligence & Records',
    'Administration',
  ];

  const currentNav = NAV_ITEMS.find((n) => n.path === location.pathname) || NAV_ITEMS[0];
  const pendingCount = offlineQueue.filter((q) => q.status === 'pending' || q.status === 'failed').length;
  const conflictCount = offlineQueue.filter((q) => q.status === 'conflict').length;

  const renderNavLinks = () => (
    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
      {groups.map((group) => {
        const items = visibleNavItems.filter((i) => i.group === group);
        if (items.length === 0) return null;
        return (
          <div key={group}>
            <div className="px-3 mb-2 text-[11px] font-semibold text-slate-400 tracking-wide">
              {group}
            </div>
            <div className="space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[40px] ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.id === 'notifications' && unreadCount > 0 && (
                      <span className="text-xs font-mono tabular-nums text-blue-300 ml-2">
                        {unreadCount}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Dark Navy Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-[#0F172A] text-slate-200 border-r border-slate-800 shrink-0 print:hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0">
            <Factory className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white tracking-tight truncate">
              Factory Memory OS
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {factory?.name || 'Operations Console'}
            </div>
          </div>
        </div>

        {renderNavLinks()}

        <div className="p-4 border-t border-slate-800 text-xs space-y-1">
          <div className="font-medium text-white truncate">
            {member?.displayName || user?.displayName || 'Personnel'}
          </div>
          <div className="text-slate-400 truncate">
            {roleDef.label} · {member?.department || 'Operations'}
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-[#0F172A] text-slate-200 flex flex-col h-full z-10">
            <div className="px-4 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <Factory className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-white">Factory Memory OS</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderNavLinks()}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 h-14 flex items-center justify-between gap-4 sticky top-0 z-20 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-500 hidden sm:inline truncate">
                {factory?.companyName || 'Plant'}
              </span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="font-semibold text-slate-900 truncate">{currentNav.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden md:inline text-xs text-slate-500 whitespace-nowrap">
              {roleDef.label}
              {member?.isMaintenanceHead ? ' · Maintenance Head' : ''}
            </span>
            <PWAInstallButton />
            <button
              onClick={signOutUser}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </header>

        <OfflineSyncBanner
          pendingCount={pendingCount}
          conflictCount={conflictCount}
          isSyncing={isSyncingQueue}
          onSyncNow={syncOfflineQueue}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
