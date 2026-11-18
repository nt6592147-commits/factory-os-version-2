import React, { useMemo, useState } from 'react';
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
import { Download, Printer } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { exportRecordsToCsv, todayIsoDate } from '../services/factoryService';
import { KpiCard, PageHeader } from '../components/CommonUI';

export const AnalyticsPage: React.FC = () => {
  const { dataset } = useAuth();
  const [tab, setTab] = useState<'production' | 'maintenance' | 'materials' | 'quality'>('production');
  const [startDate, setStartDate] = useState(todayIsoDate(-30));
  const [endDate, setEndDate] = useState(todayIsoDate(0));

  const inRange = (d?: string) => !d || (d >= startDate && d <= endDate);

  const prodFiltered = useMemo(
    () => dataset.productionRecords.filter((r) => inRange(r.productionDate)),
    [dataset.productionRecords, startDate, endDate]
  );

  const prodByDate = useMemo(() => {
    const map: Record<string, { date: string; Output: number; Target: number; Rejected: number }> = {};
    prodFiltered.forEach((r) => {
      if (!map[r.productionDate]) {
        map[r.productionDate] = { date: r.productionDate, Output: 0, Target: 0, Rejected: 0 };
      }
      map[r.productionDate].Output += r.actualQty;
      map[r.productionDate].Target += r.targetQty;
      map[r.productionDate].Rejected += r.rejectedQty;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [prodFiltered]);

  const maintChartData = useMemo(() => {
    const electrical = dataset.electricalMaintenance.filter((r) => inRange(r.recordDate));
    const mechanical = dataset.mechanicalMaintenance.filter((r) => inRange(r.recordDate));
    return [
      {
        discipline: 'Electrical',
        Faults: dataset.machineIncidents.filter((i) => i.department === 'electrical').length,
        CompletedLogs: electrical.length,
        DowntimeMin: electrical.reduce((s, r) => s + r.downtimeMinutes, 0),
      },
      {
        discipline: 'Mechanical',
        Faults: dataset.machineIncidents.filter((i) => i.department === 'mechanical').length,
        CompletedLogs: mechanical.length,
        DowntimeMin: mechanical.reduce((s, r) => s + r.downtimeMinutes, 0),
      },
    ];
  }, [dataset, startDate, endDate]);

  const qcChartData = useMemo(() => {
    const map: Record<string, { line: string; Defective: number; Inspections: number }> = {};
    dataset.qualityInspections
      .filter((q) => inRange(q.inspectionDate))
      .forEach((q) => {
        if (!map[q.productionLine]) map[q.productionLine] = { line: q.productionLine, Defective: 0, Inspections: 0 };
        map[q.productionLine].Defective += q.defectiveQty;
        map[q.productionLine].Inspections += 1;
      });
    return Object.values(map);
  }, [dataset.qualityInspections, startDate, endDate]);

  const handleExportActive = () => {
    if (tab === 'production') exportRecordsToCsv('analytics_production.csv', prodFiltered as unknown as Record<string, unknown>[]);
    else if (tab === 'maintenance') exportRecordsToCsv('analytics_maintenance.csv', [...dataset.electricalMaintenance, ...dataset.mechanicalMaintenance] as unknown as Record<string, unknown>[]);
    else if (tab === 'materials') exportRecordsToCsv('analytics_materials.csv', dataset.materials as unknown as Record<string, unknown>[]);
    else exportRecordsToCsv('analytics_quality.csv', dataset.qualityInspections as unknown as Record<string, unknown>[]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Management Analytics & Reporting"
        subtitle="Cross-departmental performance metrics, date comparisons, and CSV/PDF report exports."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white" />
            <span className="text-xs text-slate-400">to</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white" />
            <button onClick={handleExportActive} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              <Printer className="w-3.5 h-3.5" />
              Export PDF
            </button>
          </div>
        }
      />

      <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg w-fit">
        {([
          ['production', 'Production Analytics'],
          ['maintenance', 'Maintenance Analytics'],
          ['materials', 'Material Analytics'],
          ['quality', 'Quality Analytics'],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
              tab === k ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'production' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Output" value={prodFiltered.reduce((s, r) => s + r.actualQty, 0).toLocaleString()} />
            <KpiCard label="Total Target" value={prodFiltered.reduce((s, r) => s + r.targetQty, 0).toLocaleString()} />
            <KpiCard label="Rejected Products" value={prodFiltered.reduce((s, r) => s + r.rejectedQty, 0).toLocaleString()} tone="warning" />
            <KpiCard label="Recorded Shifts" value={prodFiltered.length} />
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prodByDate}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Target" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Output" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Rejected" fill="#D97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'maintenance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Electrical Faults" value={dataset.machineIncidents.filter((i) => i.department === 'electrical').length} />
            <KpiCard label="Mechanical Faults" value={dataset.machineIncidents.filter((i) => i.department === 'mechanical').length} />
            <KpiCard
              label="PM Completion Rate"
              value={`${dataset.preventiveSchedules.length > 0 ? Math.round((dataset.preventiveSchedules.filter((p) => p.status === 'completed').length / dataset.preventiveSchedules.length) * 100) : 0}%`}
            />
            <KpiCard label="Total Stoppage Minutes" value={dataset.downtimeRecords.reduce((s, d) => s + d.totalStoppageMinutes, 0)} tone="danger" />
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maintChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="discipline" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Faults" fill="#D97706" radius={[4, 4, 0, 0]} />
                <Bar dataKey="CompletedLogs" name="Completed Logs" fill="#16A34A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="DowntimeMin" name="Downtime (min)" fill="#DC2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'materials' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Received Volume" value={dataset.materials.reduce((s, m) => s + m.quantity, 0).toLocaleString()} />
          <KpiCard label="Consumed Volume" value={dataset.materials.reduce((s, m) => s + m.consumedQty, 0).toLocaleString()} />
          <KpiCard label="Recorded Wastage" value={dataset.materials.reduce((s, m) => s + m.wastedQty, 0).toLocaleString()} tone="warning" />
          <KpiCard label="Inspections Logged" value={dataset.materialInspections.length} />
        </div>
      )}

      {tab === 'quality' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <KpiCard label="QC Inspections" value={dataset.qualityInspections.length} />
            <KpiCard label="Total Defective Qty" value={dataset.qualityInspections.reduce((s, q) => s + q.defectiveQty, 0)} tone="warning" />
            <KpiCard label="Rejected / Hold Batches" value={dataset.qualityInspections.filter((q) => q.result !== 'passed').length} tone="danger" />
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={qcChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="line" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="Defective" name="Defective Units" fill="#DC2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
