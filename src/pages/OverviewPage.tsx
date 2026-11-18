import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { todayIsoDate } from '../services/factoryService';
import {
  KpiCard,
  MachineRunIcon,
  PageHeader,
  RecordOriginText,
  StatusLabel,
} from '../components/CommonUI';

type DateRangeKey = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export const OverviewPage: React.FC = () => {
  const { dataset, factory, dataLoading } = useAuth();
  const [range, setRange] = useState<DateRangeKey>('week');
  const [customStart, setCustomStart] = useState(todayIsoDate(-7));
  const [customEnd, setCustomEnd] = useState(todayIsoDate(0));

  const { startDate, endDate } = useMemo(() => {
    const today = todayIsoDate(0);
    if (range === 'today') return { startDate: today, endDate: today };
    if (range === 'yesterday') {
      const y = todayIsoDate(-1);
      return { startDate: y, endDate: y };
    }
    if (range === 'week') return { startDate: todayIsoDate(-7), endDate: today };
    if (range === 'month') return { startDate: todayIsoDate(-30), endDate: today };
    return { startDate: customStart, endDate: customEnd };
  }, [range, customStart, customEnd]);

  const inRange = (dateStr?: string) => {
    if (!dateStr) return true;
    return dateStr >= startDate && dateStr <= endDate;
  };

  const metrics = useMemo(() => {
    const prod = dataset.productionRecords.filter((r) => inRange(r.productionDate));
    const totalProd = prod.reduce((s, r) => s + (r.actualQty || 0), 0);
    const totalTarget = prod.reduce((s, r) => s + (r.targetQty || 0), 0);
    const efficiency = totalTarget > 0 ? ((totalProd / totalTarget) * 100).toFixed(1) : '0.0';

    const matReceived = dataset.materials.reduce((s, m) => s + (m.quantity || 0), 0);
    const matConsumed = dataset.materials.reduce((s, m) => s + (m.consumedQty || 0), 0);
    const matAvailable = dataset.materials.reduce((s, m) => s + (m.remainingQty || 0), 0);

    const activeMachines = dataset.machines.filter((m) => m.status === 'running').length;
    const stoppedMachines = dataset.machines.filter((m) => m.status === 'stopped' || m.status === 'maintenance').length;
    const openIncidents = dataset.machineIncidents.filter((i) => i.status !== 'resolved').length;

    const dtFiltered = dataset.downtimeRecords.filter((d) => inRange(d.date));
    const totalDowntimeMin = dtFiltered.reduce((s, d) => s + (d.totalStoppageMinutes || 0), 0);

    const allMaint = [...dataset.electricalMaintenance, ...dataset.mechanicalMaintenance].filter((m) =>
      inRange(m.recordDate)
    );
    const maintCompleted = allMaint.filter((m) => m.status === 'completed' || m.status === 'approved').length;
    const pendingPM = dataset.preventiveSchedules.filter((p) => p.status !== 'completed').length;
    const pendingReports = dataset.shiftReports.filter((r) => r.status !== 'reviewed').length;

    return {
      totalProd,
      totalTarget,
      efficiency,
      matReceived,
      matConsumed,
      matAvailable,
      activeMachines,
      stoppedMachines,
      openIncidents,
      totalDowntimeMin,
      maintCompleted,
      pendingPM,
      pendingReports,
    };
  }, [dataset, startDate, endDate]);

  const productionChartData = useMemo(() => {
    const byLine: Record<string, { line: string; Target: number; Actual: number; Rejected: number }> = {};
    dataset.productionRecords
      .filter((r) => inRange(r.productionDate))
      .forEach((r) => {
        if (!byLine[r.productionLine]) {
          byLine[r.productionLine] = { line: r.productionLine, Target: 0, Actual: 0, Rejected: 0 };
        }
        byLine[r.productionLine].Target += r.targetQty || 0;
        byLine[r.productionLine].Actual += r.actualQty || 0;
        byLine[r.productionLine].Rejected += r.rejectedQty || 0;
      });
    return Object.values(byLine);
  }, [dataset.productionRecords, startDate, endDate]);

  const materialChartData = useMemo(
    () =>
      dataset.materials.slice(0, 6).map((m) => ({
        name: m.materialCode,
        Remaining: m.remainingQty,
        Consumed: m.consumedQty,
        Wasted: m.wastedQty,
      })),
    [dataset.materials]
  );

  const hasSampleRecords =
    dataset.machines.some((m) => m.recordOrigin === 'sample') ||
    dataset.productionRecords.some((p) => p.recordOrigin === 'sample');

  const recentIncidents = dataset.machineIncidents.slice(0, 5);
  const recentReports = dataset.shiftReports.slice(0, 4);
  const unreadNotifs = dataset.notifications.filter((n) => !n.isRead).slice(0, 4);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plant Operations Overview"
        subtitle={`${factory?.name || 'Factory Workspace'} · Live database telemetry (${startDate} to ${endDate})`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg">
              {([
                ['today', 'Today'],
                ['yesterday', 'Yesterday'],
                ['week', 'This Week'],
                ['month', 'This Month'],
                ['custom', 'Custom'],
              ] as [DateRangeKey, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setRange(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    range === key
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {range === 'custom' && (
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                />
              </div>
            )}
          </div>
        }
      />

      {hasSampleRecords && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-xs text-blue-900 flex items-center justify-between gap-4">
          <span>
            Pilot dataset notice: Initial equipment and historical records marked <strong>Sample Data</strong> are included for pilot validation. New floor entries are tagged <strong>Verified Operational</strong>.
          </span>
          <Link to="/settings" className="font-semibold text-blue-700 hover:underline whitespace-nowrap shrink-0">
            Manage Data Origin
          </Link>
        </div>
      )}

      {/* Primary KPI Grid */}
      {dataLoading && dataset.machines.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-lg p-4 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <KpiCard
            label="Production Output"
            value={metrics.totalProd.toLocaleString()}
            detail={`Target: ${metrics.totalTarget.toLocaleString()} pcs`}
          />
          <KpiCard
            label="Production Efficiency"
            value={`${metrics.efficiency}%`}
            detail="Actual vs. target yield"
            tone={Number(metrics.efficiency) >= 90 ? 'success' : 'warning'}
          />
          <KpiCard
            label="Materials Received / Consumed"
            value={`${metrics.matReceived.toLocaleString()} / ${metrics.matConsumed.toLocaleString()}`}
            detail={`Available stock: ${metrics.matAvailable.toLocaleString()} units`}
          />
          <KpiCard
            label="Active / Stopped Machines"
            value={`${metrics.activeMachines} / ${metrics.stoppedMachines}`}
            detail={`${dataset.machines.length} total registered assets`}
            tone={metrics.stoppedMachines > 0 ? 'warning' : 'success'}
          />
          <KpiCard
            label="Open Incidents & Downtime"
            value={`${metrics.openIncidents} open`}
            detail={`${metrics.totalDowntimeMin} min downtime · ${metrics.maintCompleted} repairs · ${metrics.pendingPM} PM · ${metrics.pendingReports} reports`}
            tone={metrics.openIncidents > 0 ? 'danger' : 'default'}
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Production Output vs. Target</h2>
              <p className="text-xs text-slate-500">Aggregated by production line in selected range</p>
            </div>
            <Link to="/production" className="text-xs font-medium text-blue-600 hover:underline">
              Open Production
            </Link>
          </div>
          <div className="h-64">
            {productionChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No production records in selected date range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productionChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="line" tick={{ fontSize: 12, fill: '#475569' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#475569' }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Target" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Actual" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Material Inventory & Consumption</h2>
              <p className="text-xs text-slate-500">Remaining vs. consumed quantities by material batch</p>
            </div>
            <Link to="/materials" className="text-xs font-medium text-blue-600 hover:underline">
              Open Materials
            </Link>
          </div>
          <div className="h-64">
            {materialChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No material batches registered yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={materialChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Remaining" fill="#16A34A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Consumed" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Wasted" fill="#D97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Machine Status & Maintenance Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Machine Status Overview</h2>
            <Link to="/machines" className="text-xs font-medium text-blue-600 hover:underline">
              All {dataset.machines.length} Assets
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {dataset.machines.slice(0, 6).map((m) => (
              <div key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <MachineRunIcon status={m.status} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{m.name}</div>
                    <div className="text-xs text-slate-500 font-mono">
                      {m.machineCode} · {m.productionLine} · {m.runningHours.toLocaleString()} hrs
                    </div>
                  </div>
                </div>
                <StatusLabel status={m.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Maintenance Activity Timeline</h2>
            <Link to="/electrical-maintenance" className="text-xs font-medium text-blue-600 hover:underline">
              View Logbooks
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {[...dataset.electricalMaintenance, ...dataset.mechanicalMaintenance]
              .slice(0, 5)
              .map((rec) => (
                <div key={rec.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {rec.machineName} · {rec.faultCategory || rec.discipline}
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">{rec.actionTaken}</div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5 tabular-nums">
                      {rec.recordDate} · {rec.technicianName} · {rec.downtimeMinutes} min · <RecordOriginText origin={rec.recordOrigin} />
                    </div>
                  </div>
                  <StatusLabel status={rec.status} />
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Incidents, Shift Reports, Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Recent Machine Incidents</h2>
            <Link to="/incidents" className="text-xs font-medium text-blue-600 hover:underline">
              View All
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentIncidents.map((inc) => (
              <div key={inc.id} className="py-2.5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900 truncate">{inc.machineName}</span>
                  <StatusLabel status={inc.status} />
                </div>
                <div className="text-xs text-slate-600 truncate">{inc.faultCategory}</div>
                <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                  {inc.reportedDate} {inc.reportedTime} · {inc.department} · {inc.severity}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Recent Shift Reports</h2>
            <Link to="/shift-reports" className="text-xs font-medium text-blue-600 hover:underline">
              Handovers
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentReports.map((rep) => (
              <div key={rep.id} className="py-2.5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900 truncate">
                    {rep.department} ({rep.shift})
                  </span>
                  <StatusLabel status={rep.status} />
                </div>
                <div className="text-xs text-slate-600 line-clamp-2">{rep.activitiesCompleted}</div>
                <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                  {rep.reportDate} · {rep.supervisorName}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Important Notifications</h2>
            <Link to="/notifications" className="text-xs font-medium text-blue-600 hover:underline">
              Notification Center
            </Link>
          </div>
          {unreadNotifs.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">All operational alerts acknowledged.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {unreadNotifs.map((n) => (
                <div key={n.id} className="py-2.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 truncate">{n.title}</span>
                    <StatusLabel status={n.severity} />
                  </div>
                  <p className="text-xs text-slate-600">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
