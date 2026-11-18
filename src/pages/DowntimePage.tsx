import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { generateSafeId, todayIsoDate } from '../services/factoryService';
import { KpiCard, PageHeader, RecordOriginText } from '../components/CommonUI';

function diffMinutes(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const sMin = sh * 60 + sm;
  let eMin = eh * 60 + em;
  if (eMin < sMin) eMin += 24 * 60;
  return Math.max(0, eMin - sMin);
}

export const DowntimePage: React.FC = () => {
  const { dataset, submitRecord } = useAuth();
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    machineId: dataset.machines[0]?.id || '',
    date: todayIsoDate(0),
    timeStopped: '08:10',
    timeReported: '08:13',
    maintenanceStartTime: '08:20',
    timeResolved: '08:52',
    timeProductionResumed: '09:00',
    reason: '',
    departmentResponsible: 'Electrical Maintenance',
    technicianAssigned: '',
    resolution: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const machine = dataset.machines.find((m) => m.id === form.machineId);
    if (!machine) return;
    const totalStoppageMinutes = diffMinutes(form.timeStopped, form.timeProductionResumed);
    const activeRepairMinutes = diffMinutes(form.maintenanceStartTime, form.timeResolved);

    await submitRecord(
      'downtimeRecords',
      generateSafeId('dt'),
      {
        machineId: machine.id,
        machineName: machine.name,
        productionLine: machine.productionLine,
        date: form.date,
        timeStopped: form.timeStopped,
        timeReported: form.timeReported,
        maintenanceStartTime: form.maintenanceStartTime,
        timeResolved: form.timeResolved,
        timeProductionResumed: form.timeProductionResumed,
        totalStoppageMinutes,
        activeRepairMinutes,
        reason: form.reason.trim(),
        departmentResponsible: form.departmentResponsible,
        technicianAssigned: form.technicianAssigned.trim(),
        resolution: form.resolution.trim(),
        recordOrigin: 'operational',
      },
      `Logged downtime on ${machine.name}: ${totalStoppageMinutes} min stoppage / ${activeRepairMinutes} min repair`
    );
    setShowForm(false);
  };

  const chartData = useMemo(() => {
    const byMachine: Record<string, { machine: string; TotalStoppage: number; ActiveRepair: number }> = {};
    dataset.downtimeRecords.forEach((d) => {
      if (!byMachine[d.machineName]) {
        byMachine[d.machineName] = { machine: d.machineName, TotalStoppage: 0, ActiveRepair: 0 };
      }
      byMachine[d.machineName].TotalStoppage += d.totalStoppageMinutes || 0;
      byMachine[d.machineName].ActiveRepair += d.activeRepairMinutes || 0;
    });
    return Object.values(byMachine);
  }, [dataset.downtimeRecords]);

  const totalStop = dataset.downtimeRecords.reduce((s, d) => s + d.totalStoppageMinutes, 0);
  const totalRepair = dataset.downtimeRecords.reduce((s, d) => s + d.activeRepairMinutes, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Machine Downtime Tracking"
        subtitle="Timestamped stoppage vs. active repair analytics across machines, production lines, and departments."
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            {showForm ? 'Close Form' : 'Log Downtime Event'}
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Production Stoppage" value={`${totalStop} min`} tone="danger" />
        <KpiCard label="Active Repair Duration" value={`${totalRepair} min`} />
        <KpiCard label="Response / Restart Lag" value={`${Math.max(0, totalStop - totalRepair)} min`} tone="warning" />
        <KpiCard label="Logged Stoppage Events" value={dataset.downtimeRecords.length} />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Record Machine Downtime Timestamps</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <select value={form.machineId} onChange={(e) => setForm({ ...form, machineId: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              {dataset.machines.map((m) => <option key={m.id} value={m.id}>{m.machineCode} — {m.name}</option>)}
            </select>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <select value={form.departmentResponsible} onChange={(e) => setForm({ ...form, departmentResponsible: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              <option value="Electrical Maintenance">Electrical Maintenance</option>
              <option value="Mechanical Maintenance">Mechanical Maintenance</option>
              <option value="Production">Production</option>
              <option value="Materials & Receiving">Materials & Receiving</option>
            </select>
            <input required placeholder="Technician Assigned" value={form.technicianAssigned} onChange={(e) => setForm({ ...form, technicianAssigned: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <div>
              <label className="block text-xs text-slate-600 mb-1">Time Stopped</label>
              <input type="time" value={form.timeStopped} onChange={(e) => setForm({ ...form, timeStopped: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Maint. Start Time</label>
              <input type="time" value={form.maintenanceStartTime} onChange={(e) => setForm({ ...form, maintenanceStartTime: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Time Resolved</label>
              <input type="time" value={form.timeResolved} onChange={(e) => setForm({ ...form, timeResolved: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Production Resumed</label>
              <input type="time" value={form.timeProductionResumed} onChange={(e) => setForm({ ...form, timeProductionResumed: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <input required placeholder="Reason for Downtime" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="sm:col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input required placeholder="Resolution Summary" value={form.resolution} onChange={(e) => setForm({ ...form, resolution: e.target.value })} className="sm:col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg">Calculate & Save Downtime</button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Stoppage vs. Active Repair Minutes by Machine</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="machine" tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="TotalStoppage" name="Total Stoppage (min)" fill="#DC2626" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ActiveRepair" name="Active Repair (min)" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <th className="py-3 px-4">Date & Machine</th>
              <th className="py-3 px-4">Stop / Repair / Resume</th>
              <th className="py-3 px-4 text-right">Total Stoppage</th>
              <th className="py-3 px-4 text-right">Active Repair</th>
              <th className="py-3 px-4">Department & Cause</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {dataset.downtimeRecords.map((dt) => (
              <tr key={dt.id}>
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-900">{dt.machineName}</div>
                  <div className="font-mono text-slate-500">{dt.date} · {dt.productionLine}</div>
                </td>
                <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                  Stop {dt.timeStopped} · Maint {dt.maintenanceStartTime}-{dt.timeResolved} · Run {dt.timeProductionResumed}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-red-700">{dt.totalStoppageMinutes} min</td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-blue-700">{dt.activeRepairMinutes} min</td>
                <td className="py-3 px-4">
                  <div className="font-medium text-slate-900">{dt.departmentResponsible} ({dt.technicianAssigned})</div>
                  <div className="text-slate-600">{dt.reason} — {dt.resolution}</div>
                  <RecordOriginText origin={dt.recordOrigin} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
