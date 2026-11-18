import React, { useMemo, useState } from 'react';
import { CheckCircle, Plus, Search, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { generateSafeId, todayIsoDate } from '../services/factoryService';
import type { MaintenanceRecord } from '../types/factory';
import { EmptyState, KpiCard, PageHeader, RecordOriginText, StatusLabel } from '../components/CommonUI';

export const MaintenancePage: React.FC<{ discipline: 'electrical' | 'mechanical' }> = ({ discipline }) => {
  const { dataset, factory, member, user, roleDef, isMaintenanceHead, submitRecord, patchRecord } = useAuth();
  const [tab, setTab] = useState<'logbook' | 'history' | 'parts' | 'shift_end'>('logbook');
  const [showForm, setShowForm] = useState(false);
  const [searchMachine, setSearchMachine] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const isElectrical = discipline === 'electrical';
  const collectionName = isElectrical ? 'electricalMaintenance' : 'mechanicalMaintenance';
  const records = isElectrical ? dataset.electricalMaintenance : dataset.mechanicalMaintenance;
  const openFaults = dataset.machineIncidents.filter(
    (i) => i.department === discipline && i.status !== 'resolved'
  );
  const parts = dataset.spareParts.filter(
    (p) => p.category === discipline || p.category === 'general'
  );
  const shiftEndReportType = isElectrical ? 'electrical_shift_end' : 'mechanical_shift_end';
  const shiftEndReports = dataset.shiftReports.filter((r) => r.reportType === shiftEndReportType);
  const canCreateLog = isElectrical ? roleDef.canLogElectrical : roleDef.canLogMechanical;

  const actorName = member?.displayName || user?.displayName || 'Technician';

  const [form, setForm] = useState({
    recordDate: todayIsoDate(0),
    machineId: dataset.machines[0]?.id || '',
    incidentId: '',
    faultCategory: factory?.faultCategories?.[0] || 'Other fault',
    faultDescription: '',
    actionTaken: '',
    sparePartsUsed: '',
    downtimeMinutes: 30,
    runningHours: 4800,
    servicingHours: 0.5,
    startTime: '09:00',
    completionTime: '09:30',
    restorationTime: '09:35',
    observations: '',
    shift: factory?.shifts?.[0] || 'Morning',
    status: 'completed' as MaintenanceRecord['status'],
  });

  const [shiftForm, setShiftForm] = useState({
    shift: factory?.shifts?.[0] || 'Morning',
    reportDate: todayIsoDate(0),
    activitiesCompleted: '',
    observations: '',
    handoverNotes: '',
  });

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const machine = dataset.machines.find((m) => m.id === form.machineId);
    if (!machine) return;
    const docId = generateSafeId(isElectrical ? 'elm' : 'mcm');

    await submitRecord(
      collectionName,
      docId,
      {
        discipline,
        recordDate: form.recordDate,
        machineId: machine.id,
        machineCode: machine.machineCode,
        machineName: machine.name,
        incidentId: form.incidentId || '',
        faultCategory: form.faultCategory,
        faultDescription: form.faultDescription.trim(),
        actionTaken: form.actionTaken.trim(),
        sparePartsUsed: form.sparePartsUsed.trim() || 'None',
        downtimeMinutes: Number(form.downtimeMinutes),
        runningHours: Number(form.runningHours),
        servicingHours: Number(form.servicingHours),
        technicianName: actorName,
        startTime: form.startTime,
        completionTime: form.completionTime,
        restorationTime: form.restorationTime,
        observations: form.observations.trim(),
        shift: form.shift,
        status: form.status,
        recordOrigin: 'operational',
      },
      `Logged ${discipline} maintenance on ${machine.name}: ${form.actionTaken}`
    );

    setFeedback(`${isElectrical ? 'Electrical' : 'Mechanical'} maintenance logbook entry saved.`);
    setShowForm(false);
  };

  // Compute Shift-End Report summary from real records for the chosen date/shift
  const shiftSummaryStats = useMemo(() => {
    const dayIncidents = dataset.machineIncidents.filter(
      (i) => i.department === discipline && i.reportedDate === shiftForm.reportDate
    );
    const dayMaint = records.filter((r) => r.recordDate === shiftForm.reportDate);
    return {
      totalFaults: dayIncidents.length,
      resolvedFaults: dayIncidents.filter((i) => i.status === 'resolved').length,
      unresolvedFaults: dayIncidents.filter((i) => i.status !== 'resolved').length,
      totalDowntime: dayMaint.reduce((s, r) => s + (r.downtimeMinutes || 0), 0),
      servicingHours: dayMaint.reduce((s, r) => s + (r.servicingHours || 0), 0),
      runningHours: dayMaint.reduce((s, r) => s + (r.runningHours || 0), 0),
      partsList: dayMaint.map((r) => r.sparePartsUsed).filter(Boolean).join('; ') || 'None recorded',
      activitiesList: dayMaint.map((r) => `${r.machineName}: ${r.actionTaken}`).join(' | ') || 'Routine shift inspection',
    };
  }, [dataset.machineIncidents, records, discipline, shiftForm.reportDate]);

  const handleSubmitShiftEnd = async (e: React.FormEvent) => {
    e.preventDefault();
    const docId = generateSafeId('sr');
    await submitRecord(
      'shiftReports',
      docId,
      {
        department: isElectrical ? 'Electrical Maintenance' : 'Mechanical Maintenance',
        reportType: shiftEndReportType,
        shift: shiftForm.shift,
        reportDate: shiftForm.reportDate,
        supervisorName: actorName,
        activitiesCompleted: shiftForm.activitiesCompleted.trim() || shiftSummaryStats.activitiesList,
        maintenanceActivities: `${records.filter((r) => r.recordDate === shiftForm.reportDate).length} logbook entries completed`,
        unresolvedIncidentsCount: shiftSummaryStats.unresolvedFaults,
        sparePartsUsed: shiftSummaryStats.partsList,
        totalDowntimeMinutes: shiftSummaryStats.totalDowntime,
        runningHours: shiftSummaryStats.runningHours,
        servicingHours: Number(shiftSummaryStats.servicingHours.toFixed(2)),
        observations: shiftForm.observations.trim(),
        handoverNotes: shiftForm.handoverNotes.trim(),
        status: 'submitted',
        recordOrigin: 'operational',
      },
      `Submitted ${discipline} shift-end report to Maintenance Head`
    );

    await submitRecord('notifications', generateSafeId('notif'), {
      type: 'report_submitted_maintenance_head',
      title: `${isElectrical ? 'Electrical' : 'Mechanical'} Shift-End Report Submitted`,
      message: `${shiftForm.shift} shift report (${shiftForm.reportDate}) submitted by ${actorName} for Maintenance Head review.`,
      severity: 'info',
      isRead: false,
      relatedModule: isElectrical ? 'electrical-maintenance' : 'mechanical-maintenance',
      recordOrigin: 'operational',
    });

    setFeedback('Shift-end maintenance report submitted to Maintenance Head.');
  };

  const handleReviewShiftReport = async (reportId: string) => {
    await patchRecord(
      'shiftReports',
      reportId,
      { status: 'reviewed', reviewedByName: actorName },
      'submitted',
      'reviewed'
    );
  };

  // Machine fault frequency aggregation for History tab
  const repeatedFaultSummary = useMemo(() => {
    const counts: Record<string, { machineName: string; count: number; totalDowntime: number; parts: string[] }> = {};
    records.forEach((r) => {
      if (searchMachine && !r.machineName.toLowerCase().includes(searchMachine.toLowerCase()) && !r.faultDescription.toLowerCase().includes(searchMachine.toLowerCase())) {
        return;
      }
      if (!counts[r.machineName]) {
        counts[r.machineName] = { machineName: r.machineName, count: 0, totalDowntime: 0, parts: [] };
      }
      counts[r.machineName].count += 1;
      counts[r.machineName].totalDowntime += r.downtimeMinutes || 0;
      if (r.sparePartsUsed && r.sparePartsUsed !== 'None') counts[r.machineName].parts.push(r.sparePartsUsed);
    });
    return Object.values(counts).sort((a, b) => b.count - a.count);
  }, [records, searchMachine]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isElectrical ? 'Electrical Maintenance' : 'Mechanical Maintenance'}
        subtitle={
          isElectrical
            ? 'Digital electrical logbook, sensor/heater fault tracking, spare parts, and Maintenance Head shift-end reporting.'
            : 'Departmental mechanical servicing logbook, parts replacement history, and shift-end reporting.'
        }
        actions={
          canCreateLog ? (
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              {showForm ? 'Close Form' : 'New Logbook Entry'}
            </button>
          ) : undefined
        }
      />

      {feedback && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Open Assigned Faults" value={openFaults.length} tone={openFaults.length > 0 ? 'danger' : 'success'} />
        <KpiCard label="Logbook Entries" value={records.length} />
        <KpiCard
          label="Cumulative Downtime"
          value={`${records.reduce((s, r) => s + (r.downtimeMinutes || 0), 0)} min`}
        />
        <KpiCard
          label="Shift Reports Awaiting Review"
          value={shiftEndReports.filter((r) => r.status === 'submitted').length}
          tone={shiftEndReports.some((r) => r.status === 'submitted') ? 'warning' : 'default'}
        />
      </div>

      {showForm && (
        <form onSubmit={handleLogSubmit} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Log {isElectrical ? 'Electrical' : 'Mechanical'} Maintenance Activity
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
              <input type="date" required value={form.recordDate} onChange={(e) => setForm({ ...form, recordDate: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Machine</label>
              <select value={form.machineId} onChange={(e) => setForm({ ...form, machineId: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                {dataset.machines.map((m) => (
                  <option key={m.id} value={m.id}>{m.machineCode} — {m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Fault Category</label>
              <select value={form.faultCategory} onChange={(e) => setForm({ ...form, faultCategory: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                {(factory?.faultCategories || []).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Linked Open Incident</label>
              <select value={form.incidentId} onChange={(e) => setForm({ ...form, incidentId: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                <option value="">Standalone / Preventive Check</option>
                {openFaults.map((i) => <option key={i.id} value={i.id}>{i.incidentCode} — {i.machineName}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Fault Description</label>
              <input required placeholder="Describe observed fault..." value={form.faultDescription} onChange={(e) => setForm({ ...form, faultDescription: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Action Taken</label>
              <input required placeholder="Describe repair / isolation / replacement..." value={form.actionTaken} onChange={(e) => setForm({ ...form, actionTaken: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Spare Parts Used</label>
              <input placeholder="e.g. SP-EL-04 (1 pc)" value={form.sparePartsUsed} onChange={(e) => setForm({ ...form, sparePartsUsed: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Downtime (min)</label>
              <input type="number" min={0} required value={form.downtimeMinutes} onChange={(e) => setForm({ ...form, downtimeMinutes: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Running Hours / Servicing Hours</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" min={0} value={form.runningHours} onChange={(e) => setForm({ ...form, runningHours: Number(e.target.value) })} className="px-2 py-2 border border-slate-300 rounded-lg text-sm" title="Running Hours" />
                <input type="number" step="0.1" min={0} value={form.servicingHours} onChange={(e) => setForm({ ...form, servicingHours: Number(e.target.value) })} className="px-2 py-2 border border-slate-300 rounded-lg text-sm" title="Servicing Hours" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Start / Completion / Restored</label>
              <div className="grid grid-cols-3 gap-1">
                <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="px-1 py-2 border border-slate-300 rounded-lg text-xs" />
                <input type="time" value={form.completionTime} onChange={(e) => setForm({ ...form, completionTime: e.target.value })} className="px-1 py-2 border border-slate-300 rounded-lg text-xs" />
                <input type="time" value={form.restorationTime} onChange={(e) => setForm({ ...form, restorationTime: e.target.value })} className="px-1 py-2 border border-slate-300 rounded-lg text-xs" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg">Save Maintenance Entry</button>
          </div>
        </form>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg w-fit overflow-x-auto max-w-full">
        {([
          ['logbook', 'Maintenance Logbook'],
          ['history', 'Machine Fault History'],
          ['parts', `Spare Parts (${parts.length})`],
          ['shift_end', 'Shift-End & Head Review'],
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

      {tab === 'logbook' && (
        records.length === 0 ? (
          <EmptyState title="No maintenance records yet" description="Log completed repairs, troubleshooting actions, and spare parts used." />
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Date & Machine</th>
                  <th className="py-3 px-4">Fault & Action Taken</th>
                  <th className="py-3 px-4">Spare Parts</th>
                  <th className="py-3 px-4 text-right">Downtime / Svc Hrs</th>
                  <th className="py-3 px-4">Technician & Times</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{r.machineName}</div>
                      <div className="font-mono text-slate-500">{r.recordDate} · {r.shift}</div>
                    </td>
                    <td className="py-3 px-4 max-w-md">
                      <div className="font-medium text-slate-900">{r.faultCategory}: {r.faultDescription}</div>
                      <div className="text-slate-600 mt-0.5">{r.actionTaken}</div>
                      <RecordOriginText origin={r.recordOrigin} />
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">{r.sparePartsUsed}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      <div>{r.downtimeMinutes} min</div>
                      <div className="text-slate-500">{r.servicingHours} svc hrs</div>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums">
                      <div className="font-sans text-slate-800">{r.technicianName}</div>
                      <div className="text-slate-500">{r.startTime} - {r.restorationTime}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <StatusLabel status={r.status} />
                        {isMaintenanceHead && r.status === 'awaiting_review' && (
                          <button
                            onClick={() => patchRecord(collectionName, r.id, { status: 'approved' }, r.status, 'approved')}
                            className="block text-[11px] font-semibold text-blue-600 hover:underline"
                          >
                            Approve Entry
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'history' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search machine or fault description..."
              value={searchMachine}
              onChange={(e) => setSearchMachine(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
            {repeatedFaultSummary.map((item) => (
              <div key={item.machineName} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{item.machineName}</div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Parts used: {item.parts.length > 0 ? item.parts.join(', ') : 'Adjustments / inspection only'}
                  </div>
                </div>
                <div className="text-xs font-mono tabular-nums text-slate-700 flex items-center gap-4">
                  <span>{item.count} fault record(s)</span>
                  <span>{item.totalDowntime} min total downtime</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'parts' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Part Code</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-right">Stock Qty</th>
                <th className="py-3 px-4 text-right">Min Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {parts.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-900">{p.partCode}</td>
                  <td className="py-3 px-4">{p.name}</td>
                  <td className="py-3 px-4 text-slate-500">{p.location}</td>
                  <td className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${p.stockQty <= p.minStockLevel ? 'text-red-700' : 'text-slate-900'}`}>
                    {p.stockQty} {p.unit}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">{p.minStockLevel} {p.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'shift_end' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form onSubmit={handleSubmitShiftEnd} className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Generate Shift-End Report</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Date</label>
                <input type="date" value={shiftForm.reportDate} onChange={(e) => setShiftForm({ ...shiftForm, reportDate: e.target.value })} className="w-full px-2.5 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Shift</label>
                <select value={shiftForm.shift} onChange={(e) => setShiftForm({ ...shiftForm, shift: e.target.value })} className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white">
                  {(factory?.shifts || ['Morning', 'Afternoon', 'Night']).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 font-mono tabular-nums">
              <div>Faults Reported: {shiftSummaryStats.totalFaults} · Resolved: {shiftSummaryStats.resolvedFaults} · Unresolved: {shiftSummaryStats.unresolvedFaults}</div>
              <div>Total Downtime: {shiftSummaryStats.totalDowntime} min · Servicing: {shiftSummaryStats.servicingHours.toFixed(1)} hrs</div>
              <div className="font-sans text-slate-600">Parts Used: {shiftSummaryStats.partsList}</div>
            </div>
            <textarea rows={2} placeholder="Activities summary (auto-populated from logbook if blank)" value={shiftForm.activitiesCompleted} onChange={(e) => setShiftForm({ ...shiftForm, activitiesCompleted: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs" />
            <textarea rows={2} placeholder="Important observations & handover notes for next shift" value={shiftForm.observations} onChange={(e) => setShiftForm({ ...shiftForm, observations: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs" />
            <button type="submit" className="w-full py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 inline-flex items-center justify-center gap-2">
              <Send className="w-3.5 h-3.5" />
              Submit Report to Maintenance Head
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Maintenance Head Review Queue</h3>
              <span className="text-xs text-slate-500 font-mono tabular-nums">{shiftEndReports.length} report(s)</span>
            </div>
            <div className="divide-y divide-slate-100">
              {shiftEndReports.map((rep) => (
                <div key={rep.id} className="py-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">
                      {rep.reportDate} · {rep.shift} Shift · {rep.supervisorName}
                    </span>
                    <StatusLabel status={rep.status} />
                  </div>
                  <p className="text-slate-700">{rep.activitiesCompleted}</p>
                  <div className="text-slate-500 font-mono tabular-nums">
                    Downtime: {rep.totalDowntimeMinutes || 0} min · Unresolved: {rep.unresolvedIncidentsCount || 0} · Parts: {rep.sparePartsUsed || 'None'}
                  </div>
                  {isMaintenanceHead && rep.status === 'submitted' && (
                    <button
                      onClick={() => handleReviewShiftReport(rep.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline pt-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Mark Reviewed by Maintenance Head
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
