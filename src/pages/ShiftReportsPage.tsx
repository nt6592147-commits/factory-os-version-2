import React, { useState } from 'react';
import { CheckCircle, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { generateSafeId, todayIsoDate } from '../services/factoryService';
import { PageHeader, RecordOriginText, StatusLabel } from '../components/CommonUI';

export const ShiftReportsPage: React.FC = () => {
  const { dataset, factory, member, user, roleDef, submitRecord, patchRecord } = useAuth();
  const [showForm, setShowForm] = useState(false);

  const unresolvedCount = dataset.machineIncidents.filter((i) => i.status !== 'resolved').length;
  const actorName = member?.displayName || user?.displayName || 'Supervisor';

  const [form, setForm] = useState({
    department: member?.department || factory?.departments?.[0] || 'Production',
    shift: factory?.shifts?.[0] || 'Morning',
    reportDate: todayIsoDate(0),
    activitiesCompleted: '',
    productionSummary: '',
    machineIssues: '',
    outstandingProblems: '',
    materialsUsed: '',
    observations: '',
    handoverNotes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitRecord(
      'shiftReports',
      generateSafeId('sr'),
      {
        ...form,
        reportType: 'departmental',
        supervisorName: actorName,
        unresolvedIncidentsCount: unresolvedCount,
        status: 'submitted',
        recordOrigin: 'operational',
      },
      `Submitted ${form.department} (${form.shift}) shift handover report`
    );
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shift Handover & Departmental Reports"
        subtitle="Digital shift handovers with unresolved incident visibility for incoming supervisors and management."
        actions={
          roleDef.canSubmitShiftReport ? (
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              {showForm ? 'Close Form' : 'Submit Shift Handover'}
            </button>
          ) : undefined
        }
      />

      {unresolvedCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-900">
          <strong>Active Handover Alert:</strong> {unresolvedCount} unresolved machine incident(s) remain open across the floor and should be included in incoming shift briefings.
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Departmental Shift Handover Report</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              {(factory?.departments || ['Production']).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              {(factory?.shifts || ['Morning', 'Afternoon', 'Night']).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="date" value={form.reportDate} onChange={(e) => setForm({ ...form, reportDate: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <textarea required rows={2} placeholder="Activities Completed" value={form.activitiesCompleted} onChange={(e) => setForm({ ...form, activitiesCompleted: e.target.value })} className="sm:col-span-3 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input placeholder="Production Information Summary" value={form.productionSummary} onChange={(e) => setForm({ ...form, productionSummary: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input placeholder="Machine Issues Observed" value={form.machineIssues} onChange={(e) => setForm({ ...form, machineIssues: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input placeholder="Materials Used" value={form.materialsUsed} onChange={(e) => setForm({ ...form, materialsUsed: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input placeholder="Outstanding Problems" value={form.outstandingProblems} onChange={(e) => setForm({ ...form, outstandingProblems: e.target.value })} className="sm:col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input placeholder="Handover Notes for Next Shift" value={form.handoverNotes} onChange={(e) => setForm({ ...form, handoverNotes: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg">Submit Handover Report</button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {dataset.shiftReports.map((rep) => (
          <div key={rep.id} className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {rep.department} · {rep.shift} Shift · {rep.reportDate}
                </div>
                <div className="text-xs text-slate-500">
                  Supervisor: {rep.supervisorName} · Type: {rep.reportType.replace(/_/g, ' ')} · <RecordOriginText origin={rep.recordOrigin} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusLabel status={rep.status} />
                {roleDef.canReviewShiftReport && rep.status === 'submitted' && (
                  <button
                    onClick={() => patchRecord('shiftReports', rep.id, { status: 'reviewed', reviewedByName: actorName }, 'submitted', 'reviewed')}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Approve Handover
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
              <div>
                <span className="font-semibold text-slate-900">Activities Completed:</span> {rep.activitiesCompleted}
              </div>
              {rep.productionSummary && (
                <div>
                  <span className="font-semibold text-slate-900">Production:</span> {rep.productionSummary}
                </div>
              )}
              {rep.machineIssues && (
                <div>
                  <span className="font-semibold text-slate-900">Machine Issues:</span> {rep.machineIssues}
                </div>
              )}
              {rep.outstandingProblems && (
                <div className="text-amber-800">
                  <span className="font-semibold">Outstanding Problems ({rep.unresolvedIncidentsCount || 0} open):</span> {rep.outstandingProblems}
                </div>
              )}
              {rep.handoverNotes && (
                <div className="md:col-span-2 bg-slate-50 p-3 rounded border border-slate-200">
                  <span className="font-semibold text-slate-900">Next Shift Handover Notes:</span> {rep.handoverNotes}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
