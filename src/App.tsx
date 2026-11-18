import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import type { NavSectionId } from './types/factory';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { DocumentArchivePage } from './pages/DocumentArchivePage';
import { DowntimePage } from './pages/DowntimePage';
import { FactoryMemoryAIPage } from './pages/FactoryMemoryAIPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { LoginView } from './pages/LoginView';
import { MachinesPage } from './pages/MachinesPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { MaterialsPage } from './pages/MaterialsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { OverviewPage } from './pages/OverviewPage';
import { PreventivePage } from './pages/PreventivePage';
import { ProductionPage } from './pages/ProductionPage';
import { QualityControlPage } from './pages/QualityControlPage';
import { SettingsPage } from './pages/SettingsPage';
import { ShiftReportsPage } from './pages/ShiftReportsPage';
import { UserManagementPage } from './pages/UserManagementPage';

const RoleGuard: React.FC<{ section: NavSectionId; children: React.ReactNode }> = ({
  section,
  children,
}) => {
  const { roleDef } = useAuth();
  if (!roleDef.navAccess.includes(section)) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 max-w-lg mx-auto mt-10 text-center space-y-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-600">
          <Lock className="w-5 h-5" />
        </div>
        <h2 className="text-base font-semibold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Your assigned role ({roleDef.label}) does not have permission to view this module. Contact your Factory Administrator or Super Administrator if you require departmental access.
        </p>
      </div>
    );
  }
  return <>{children}</>;
};

const AppShell: React.FC = () => {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-lg px-6 py-5 text-center space-y-2">
          <div className="text-sm font-semibold text-slate-900">Factory Memory OS</div>
          <div className="text-xs text-slate-500">Verifying credentials and loading factory workspace...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <Layout>
      <Routes>
        <Route
          path="/"
          element={
            <RoleGuard section="overview">
              <OverviewPage />
            </RoleGuard>
          }
        />
        <Route
          path="/production"
          element={
            <RoleGuard section="production">
              <ProductionPage />
            </RoleGuard>
          }
        />
        <Route
          path="/materials"
          element={
            <RoleGuard section="materials">
              <MaterialsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/machines"
          element={
            <RoleGuard section="machines">
              <MachinesPage />
            </RoleGuard>
          }
        />
        <Route
          path="/incidents"
          element={
            <RoleGuard section="incidents">
              <IncidentsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/electrical-maintenance"
          element={
            <RoleGuard section="electrical-maintenance">
              <MaintenancePage discipline="electrical" />
            </RoleGuard>
          }
        />
        <Route
          path="/mechanical-maintenance"
          element={
            <RoleGuard section="mechanical-maintenance">
              <MaintenancePage discipline="mechanical" />
            </RoleGuard>
          }
        />
        <Route
          path="/preventive-maintenance"
          element={
            <RoleGuard section="preventive-maintenance">
              <PreventivePage />
            </RoleGuard>
          }
        />
        <Route
          path="/downtime"
          element={
            <RoleGuard section="downtime">
              <DowntimePage />
            </RoleGuard>
          }
        />
        <Route
          path="/quality-control"
          element={
            <RoleGuard section="quality-control">
              <QualityControlPage />
            </RoleGuard>
          }
        />
        <Route
          path="/shift-reports"
          element={
            <RoleGuard section="shift-reports">
              <ShiftReportsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/document-archive"
          element={
            <RoleGuard section="document-archive">
              <DocumentArchivePage />
            </RoleGuard>
          }
        />
        <Route
          path="/factory-ai"
          element={
            <RoleGuard section="factory-ai">
              <FactoryMemoryAIPage />
            </RoleGuard>
          }
        />
        <Route
          path="/analytics"
          element={
            <RoleGuard section="analytics">
              <AnalyticsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/notifications"
          element={
            <RoleGuard section="notifications">
              <NotificationsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/user-management"
          element={
            <RoleGuard section="user-management">
              <UserManagementPage />
            </RoleGuard>
          }
        />
        <Route
          path="/settings"
          element={
            <RoleGuard section="settings">
              <SettingsPage />
            </RoleGuard>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
