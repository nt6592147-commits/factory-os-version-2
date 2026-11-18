import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { generateSafeId, todayIsoDate } from '../services/factoryService';
import type { MachineIncident } from '../types/factory';
import { EmptyState, PageHeader, RecordOriginText, StatusLabel } from '../components/CommonUI';

export const IncidentsPage: React.FC = () => {
  const { dataset, factory, member, user, roleDef, submitRecord, patchRecord } = useAuth();
  const [deptFilter, setDeptFilter] = useState<'all' | 'electrical' | 'mechanical' | 'operational'>('all');
  const [showForm, setShowForm] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [form, setForm] = useState({
    machineId: dataset.machines[0]?.id || '',
    department: 'electrical' as 'electrical' | 'mechanical' | 'operational',
    faultCategory: factory?.faultCategories?.[0] || 'Photoelectric sensor failure',
    description: '',
    alarmInfo: '',
    reportedDate: todayIsoDate(0),
    reportedTime: new Date().toTimeString().slice(0, 5),
    shift: factory?.shifts?.[0] || 'Morning',
    severity: 'high' as 'low' | 'medium' | 'high' | 'critical',
  });

  const filtered = dataset.machineIncidents.filter(
    (i) => deptFilter === 'all' || i.department === deptFilter
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const machine = dataset.machines.find((m) => m.id === form.machineId);
    if (!machine) return;
    const docId = generateSafeId('inc');
    const code = `INC-${form.department.slice(0, 2).toUpperCase()}-${Math.floor(100 + Math.random() * 899)}`;
    const actorName = member?.displayName || user?.displayName || 'Operator';

    const { queued } = await submitRecord(
      'machineIncidents',
      docId,
      {
        incidentCode: code,
        machineId: machine.id,
        machineCode: machine.machineCode,
        machineName: machine.name,
        department: form.department,
        faultCategory: form.faultCategory,
        description: form.description.trim(),
        alarmInfo: form.alarmInfo.trim(),
        reportedDate: form.reportedDate,
        reportedTime: form.reportedTime,
        reportedByName: actorName,
        shift: form.shift,
        severity: form.severity,
        status: 'open',
        recordOrigin: 'operational',
      },
      `Reported ${form.severity} ${form.department} incident on ${machine.name}: ${form.faultCategory}`
    );

    if (!queued) {
      await submitRecord(
        'notifications',
        generateSafeId('notif'),
        {
          type: 'new_machine_fault',
          title: `New ${form.severity.toUpperCase()} Fault: ${machine.name}`,
          message: `${form.faultCategory} reported by ${actorName} (${form.shift} shift).`,
          severity: form.severity === 'critical' || form.severity === 'high' ? 'critical' : 'warning',
          isRead: false,
          relatedModule: 'incidents',
          recordOrigin: 'operational',
        }
      );
    }

    setFeedback(queued ? 'Incident queued offline for sync.' : `Incident ${code} reported and maintenance notified.`);
    setShowForm(false);
    setForm({ ...form, description: '', alarmInfo: '' });
  };

  const advanceStatus = async (inc: MachineIncident, next: MachineIncident['status']) => {
    await patchRecord('machineIncidents', inc.id, { status: next }, inc.status, next);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Machine Incidents & Fault Reporting"
        subtitle="Report electrical, mechanical, and operational machine faults with alarm codes and shift traceability."
        actions={
          roleDef.canReportIncidents ? (
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              {showForm ? 'Close Form' : 'Report Machine Fault'}
            </button>
          ) : undefined
        }
      />

      {feedback && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
          {feedback}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Submit Machine Fault Report</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Machine</label>
              <select value={form.machineId} onChange={(e) => setForm({ ...form, machineId: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                {dataset.machines.map((m) => (
                  <option key={m.id} value={m.id}>{m.machineCode} — {m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
              <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value as typeof form.department })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                <option value="electrical">Electrical</option>
                <option value="mechanical">Mechanical</option>
                <option value="operational">Operational</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Fault Category</label>
              <select value={form.faultCategory} onChange={(e) => setForm({ ...form, faultCategory: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                {(factory?.faultCategories || []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Severity</label>
              <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as typeof form.severity })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical (Line Stoppage)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Shift</label>
              <select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                {(factory?.shifts || ['Morning', 'Afternoon', 'Night']).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">PLC / Machine Alarm Info</label>
              <input placeholder="e.g. ALM-204 Optical Trip" value={form.alarmInfo} onChange={(e) => setForm({ ...form, alarmInfo: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">Fault Description</label>
              <textarea required rows={2} placeholder="Describe observed symptom, panel message, or line stop behavior..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg">Submit Incident</button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg w-fit">
        {(['all', 'electrical', 'mechanical', 'operational'] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDeptFilter(d)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize ${
              deptFilter === d ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No incidents in this category" description="All equipment in this filter is running without open incident logs." />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Incident & Time</th>
                <th className="py-3 px-4">Machine</th>
                <th className="py-3 px-4">Category & Alarm</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Workflow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map((inc) => (
                <tr key={inc.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="font-mono font-semibold text-slate-900">{inc.incidentCode}</div>
                    <div className="text-slate-500 font-mono tabular-nums">{inc.reportedDate} {inc.reportedTime} · {inc.shift}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">{inc.machineName}</div>
                    <div className="text-slate-500">{inc.department} · By {inc.reportedByName}</div>
                  </td>
                  <td className="py-3 px-4 max-w-sm">
                    <div className="font-medium text-slate-900">{inc.faultCategory}</div>
                    <div className="text-slate-600">{inc.description}</div>
                    {inc.alarmInfo && <div className="text-slate-400 font-mono">Alarm: {inc.alarmInfo}</div>}
                    <RecordOriginText origin={inc.recordOrigin} />
                  </td>
                  <td className="py-3 px-4"><StatusLabel status={inc.severity} /></td>
                  <td className="py-3 px-4"><StatusLabel status={inc.status} /></td>
                  <td className="py-3 px-4 text-right">
                    {inc.status !== 'resolved' && (
                      <div className="inline-flex gap-1.5">
                        {inc.status === 'open' && (
                          <button
                            onClick={() => advanceStatus(inc, 'in_progress')}
                            className="px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 rounded hover:bg-amber-100"
                          >
                            Start Work
                          </button>
                        )}
                        <button
                          onClick={() => advanceStatus(inc, 'resolved')}
                          className="px-2.5 py-1 text-xs font-medium bg-green-50 text-green-800 border border-green-200 rounded hover:bg-green-100"
                        >
                          Resolve
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
