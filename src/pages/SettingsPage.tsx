import React, { useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Save } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { appendAuditLog } from '../services/factoryService';
import { PageHeader } from '../components/CommonUI';

export const SettingsPage: React.FC = () => {
  const { factory, dataset, member, user, roleDef } = useAuth();
  const [name, setName] = useState(factory?.name || '');
  const [companyName, setCompanyName] = useState(factory?.companyName || '');
  const [location, setLocation] = useState(factory?.location || '');
  const [departmentsText, setDepartmentsText] = useState((factory?.departments || []).join('\n'));
  const [faultsText, setFaultsText] = useState((factory?.faultCategories || []).join('\n'));
  const [unitsText, setUnitsText] = useState((factory?.materialUnits || []).join(', '));
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factory || !user) return;
    try {
      await updateDoc(doc(db, 'factories', factory.id), {
        name: name.trim(),
        companyName: companyName.trim(),
        location: location.trim(),
        departments: departmentsText.split('\n').map((s) => s.trim()).filter(Boolean),
        faultCategories: faultsText.split('\n').map((s) => s.trim()).filter(Boolean),
        materialUnits: unitsText.split(',').map((s) => s.trim()).filter(Boolean),
        updatedAt: serverTimestamp(),
      });
      await appendAuditLog(factory, {
        actorUid: user.uid,
        actorName: member?.displayName || user.displayName || 'Admin',
        actorRole: roleDef.id,
        action: 'update',
        entityType: 'factory_settings',
        entityId: factory.id,
        newValue: `Updated plant settings (${name})`,
      });
      setFeedback('Plant settings and configurable lists saved.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `factories/${factory.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plant Settings & Immutable Audit Trail"
        subtitle="Configure factory metadata, departments, electrical fault categories, material units, and review system audit logs."
      />

      {feedback && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
          {feedback}
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Factory Configuration</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Company Name</label>
            <input required value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Factory / Plant Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Departments (one per line)</label>
            <textarea rows={5} value={departmentsText} onChange={(e) => setDepartmentsText(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Configurable Fault Categories (one per line)</label>
            <textarea rows={5} value={faultsText} onChange={(e) => setFaultsText(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Material Units (comma separated)</label>
            <textarea rows={5} value={unitsText} onChange={(e) => setUnitsText(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono" />
          </div>
        </div>
        {roleDef.canManageSettings && (
          <div className="flex justify-end">
            <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              <Save className="w-3.5 h-3.5" />
              Save Configuration
            </button>
          </div>
        )}
      </form>

      {/* Immutable Audit Trail */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Operational Audit Logs</h2>
            <p className="text-xs text-slate-500">Append-only tamper-resistant record of creations, updates, and approvals.</p>
          </div>
          <span className="text-xs font-mono text-slate-500 tabular-nums">{dataset.auditLogs.length} entries</span>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <th className="py-3 px-4">Actor & Role</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Record Affected</th>
              <th className="py-3 px-4">Previous / New Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {dataset.auditLogs.map((log) => (
              <tr key={log.id}>
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-900">{log.actorName}</div>
                  <div className="font-mono text-slate-500">{log.actorRole}</div>
                </td>
                <td className="py-3 px-4 font-mono uppercase">{log.action}</td>
                <td className="py-3 px-4 font-mono text-slate-700">{log.entityType} / {log.entityId}</td>
                <td className="py-3 px-4 text-slate-600 max-w-md truncate">
                  {log.previousValue ? `${log.previousValue} → ` : ''}{log.newValue}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
