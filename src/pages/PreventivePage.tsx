import React, { useState } from 'react';
import { CheckCircle, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { generateSafeId, todayIsoDate } from '../services/factoryService';
import type { PreventiveSchedule } from '../types/factory';
import { KpiCard, PageHeader, RecordOriginText, StatusLabel } from '../components/CommonUI';

export const PreventivePage: React.FC = () => {
  const { dataset, roleDef, submitRecord, patchRecord } = useAuth();
  const [filter, setFilter] = useState<'all' | 'overdue' | 'due_soon' | 'scheduled' | 'completed'>('all');
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    machineId: dataset.machines[0]?.id || '',
    discipline: 'electrical' as 'electrical' | 'mechanical',
    taskTitle: '',
    intervalType: 'weekly' as PreventiveSchedule['intervalType'],
    intervalValue: 'Every 7 days',
    assignedTechnician: '',
    checklistSummary: '',
    nextDueDate: todayIsoDate(7),
  });

  const filtered = dataset.preventiveSchedules.filter((p) => filter === 'all' || p.status === filter);
  const overdueCount = dataset.preventiveSchedules.filter((p) => p.status === 'overdue').length;
  const dueSoonCount = dataset.preventiveSchedules.filter((p) => p.status === 'due_soon').length;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const machine = dataset.machines.find((m) => m.id === form.machineId);
    if (!machine) return;
    await submitRecord(
      'preventiveSchedules',
      generateSafeId('pm'),
      {
        machineId: machine.id,
        machineName: machine.name,
        discipline: form.discipline,
        taskTitle: form.taskTitle.trim(),
        intervalType: form.intervalType,
        intervalValue: form.intervalValue.trim(),
        assignedTechnician: form.assignedTechnician.trim(),
        checklistSummary: form.checklistSummary.trim(),
        lastCompletedDate: '',
        nextDueDate: form.nextDueDate,
        status: 'scheduled',
        recordOrigin: 'operational',
      },
      `Scheduled PM on ${machine.name}: ${form.taskTitle}`
    );
    setShowForm(false);
  };

  const handleCompletePM = async (pm: PreventiveSchedule) => {
    await patchRecord(
      'preventiveSchedules',
      pm.id,
      { status: 'completed', lastCompletedDate: todayIsoDate(0) },
      pm.status,
      'completed'
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Preventive Maintenance Schedules"
        subtitle="Configurable daily, weekly, monthly, custom, and running-hour preventive maintenance checklists."
        actions={
          roleDef.canManagePreventive ? (
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              {showForm ? 'Close Form' : 'Schedule Preventive Task'}
            </button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Schedules" value={dataset.preventiveSchedules.length} />
        <KpiCard label="Overdue" value={overdueCount} tone={overdueCount > 0 ? 'danger' : 'success'} />
        <KpiCard label="Due Soon" value={dueSoonCount} tone={dueSoonCount > 0 ? 'warning' : 'default'} />
        <KpiCard label="Completed" value={dataset.preventiveSchedules.filter((p) => p.status === 'completed').length} tone="success" />
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Configure Preventive Schedule</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <select value={form.machineId} onChange={(e) => setForm({ ...form, machineId: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              {dataset.machines.map((m) => <option key={m.id} value={m.id}>{m.machineCode} — {m.name}</option>)}
            </select>
            <select value={form.discipline} onChange={(e) => setForm({ ...form, discipline: e.target.value as 'electrical' | 'mechanical' })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              <option value="electrical">Electrical PM</option>
              <option value="mechanical">Mechanical PM</option>
            </select>
            <input required placeholder="Task Title (e.g. Sensor & Drive Torque Check)" value={form.taskTitle} onChange={(e) => setForm({ ...form, taskTitle: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <select value={form.intervalType} onChange={(e) => setForm({ ...form, intervalType: e.target.value as PreventiveSchedule['intervalType'] })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              <option value="daily">Daily Interval</option>
              <option value="weekly">Weekly Interval</option>
              <option value="monthly">Monthly Interval</option>
              <option value="custom">Custom Interval</option>
              <option value="running_hours">Machine Running Hours</option>
            </select>
            <input required placeholder="Interval Specification (e.g. Every 500 hrs)" value={form.intervalValue} onChange={(e) => setForm({ ...form, intervalValue: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input required placeholder="Assigned Technician" value={form.assignedTechnician} onChange={(e) => setForm({ ...form, assignedTechnician: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input type="date" required value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input placeholder="Checklist Steps" value={form.checklistSummary} onChange={(e) => setForm({ ...form, checklistSummary: e.target.value })} className="sm:col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg">Save PM Schedule</button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg w-fit">
        {(['all', 'overdue', 'due_soon', 'scheduled', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize ${
              filter === f ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <th className="py-3 px-4">Machine & Task</th>
              <th className="py-3 px-4">Interval</th>
              <th className="py-3 px-4">Checklist</th>
              <th className="py-3 px-4">Next Due</th>
              <th className="py-3 px-4">Technician</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filtered.map((pm) => (
              <tr key={pm.id} className="hover:bg-slate-50">
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-900">{pm.machineName}</div>
                  <div className="text-slate-700">{pm.taskTitle}</div>
                  <RecordOriginText origin={pm.recordOrigin} />
                </td>
                <td className="py-3 px-4 font-mono">{pm.intervalValue} ({pm.discipline})</td>
                <td className="py-3 px-4 text-slate-600 max-w-xs">{pm.checklistSummary}</td>
                <td className="py-3 px-4 font-mono tabular-nums">{pm.nextDueDate}</td>
                <td className="py-3 px-4">{pm.assignedTechnician}</td>
                <td className="py-3 px-4"><StatusLabel status={pm.status} /></td>
                <td className="py-3 px-4 text-right">
                  {pm.status !== 'completed' && roleDef.canManagePreventive && (
                    <button
                      onClick={() => handleCompletePM(pm)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-50 text-green-800 border border-green-200 rounded hover:bg-green-100"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Complete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
