import React, { useState } from 'react';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { UserPlus } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { appendAuditLog, generateSafeId } from '../services/factoryService';
import { FactoryMember, ROLE_DEFINITIONS, RoleId } from '../types/factory';
import { PageHeader, StatusLabel } from '../components/CommonUI';

const ROLE_LIST = Object.values(ROLE_DEFINITIONS);

export const UserManagementPage: React.FC = () => {
  const { dataset, factory, member, user, roleDef } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [form, setForm] = useState({
    uid: '',
    displayName: '',
    employeeCode: '',
    role: 'machine_operator' as RoleId,
    department: 'Production',
    isMaintenanceHead: false,
  });

  const actorName = member?.displayName || user?.displayName || 'Administrator';

  const handleProvisionMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factory || !user) return;
    const memberUid = form.uid.trim().replace(/[^a-zA-Z0-9_-]/g, '') || generateSafeId('usr');
    const nextAccessUids = Array.from(new Set([...(factory.accessUids || [factory.ownerId]), memberUid])).slice(0, 50);

    try {
      await setDoc(doc(db, 'factories', factory.id, 'members', memberUid), {
        uid: memberUid,
        factoryId: factory.id,
        factoryOwnerUid: factory.ownerId,
        accessUids: nextAccessUids,
        displayName: form.displayName.trim(),
        employeeCode: form.employeeCode.trim(),
        role: form.role,
        department: form.department.trim(),
        isMaintenanceHead: form.isMaintenanceHead,
        active: true,
        createdByUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'factories', factory.id), {
        accessUids: nextAccessUids,
        updatedAt: serverTimestamp(),
      });

      await appendAuditLog(factory, {
        actorUid: user.uid,
        actorName,
        actorRole: roleDef.id,
        action: 'create',
        entityType: 'members',
        entityId: memberUid,
        newValue: `Provisioned ${form.displayName} as ${form.role}`,
      });

      setFeedback(`Added ${form.displayName} (${ROLE_DEFINITIONS[form.role].label}) to plant roster.`);
      setShowAdd(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `factories/${factory.id}/members/${memberUid}`);
    }
  };

  const handleUpdateRole = async (m: FactoryMember, nextRole: RoleId) => {
    if (!factory || !user) return;
    try {
      await updateDoc(doc(db, 'factories', factory.id, 'members', m.id), {
        role: nextRole,
        updatedAt: serverTimestamp(),
      });
      await appendAuditLog(factory, {
        actorUid: user.uid,
        actorName,
        actorRole: roleDef.id,
        action: 'update',
        entityType: 'members',
        entityId: m.id,
        previousValue: m.role,
        newValue: nextRole,
      });
      setFeedback(`Updated role for ${m.displayName} to ${ROLE_DEFINITIONS[nextRole].label}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `factories/${factory.id}/members/${m.id}`);
    }
  };

  const handleToggleActive = async (m: FactoryMember) => {
    if (!factory || !user) return;
    try {
      await updateDoc(doc(db, 'factories', factory.id, 'members', m.id), {
        active: !m.active,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `factories/${factory.id}/members/${m.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management & RBAC Permissions"
        subtitle="Manage personnel accounts, assign factory roles, and audit departmental access boundaries."
        actions={
          roleDef.canManageUsers ? (
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {showAdd ? 'Close Form' : 'Provision Personnel'}
            </button>
          ) : undefined
        }
      />

      {feedback && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
          {feedback}
        </div>
      )}

      {showAdd && (
        <form onSubmit={handleProvisionMember} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Assign Account Role & Department</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input required placeholder="Full Name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input placeholder="Firebase User UID (leave blank for badge ID)" value={form.uid} onChange={(e) => setForm({ ...form, uid: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono" />
            <input placeholder="Employee Code (e.g. EMP-042)" value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono" />
            <select
              value={form.role}
              onChange={(e) => {
                const r = e.target.value as RoleId;
                setForm({ ...form, role: r, department: ROLE_DEFINITIONS[r].department });
              }}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              {ROLE_LIST.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
            <input required placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <input type="checkbox" checked={form.isMaintenanceHead} onChange={(e) => setForm({ ...form, isMaintenanceHead: e.target.checked })} />
              Designate as Maintenance Head
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-xs bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg">Save User Role</button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <th className="py-3 px-4">Personnel</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Assigned Role</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Account Control</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {dataset.members.map((m) => (
              <tr key={m.id}>
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-900">{m.displayName}</div>
                  <div className="font-mono text-slate-500">{m.employeeCode || 'EMP'} · {m.uid.slice(0, 12)}</div>
                </td>
                <td className="py-3 px-4">
                  <div>{m.department}</div>
                  {m.isMaintenanceHead && <div className="text-blue-700 font-medium">Maintenance Head</div>}
                </td>
                <td className="py-3 px-4">
                  {roleDef.canManageUsers ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleUpdateRole(m, e.target.value as RoleId)}
                      className="px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                    >
                      {ROLE_LIST.map((r) => (
                        <option key={r.id} value={r.id}>{r.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span>{ROLE_DEFINITIONS[m.role]?.label || m.role}</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <StatusLabel status={m.active ? 'active' : 'stopped'} />
                </td>
                <td className="py-3 px-4 text-right">
                  {roleDef.canManageUsers && m.uid !== user?.uid && (
                    <button
                      onClick={() => handleToggleActive(m)}
                      className="px-2.5 py-1 text-xs border border-slate-200 rounded hover:bg-slate-50"
                    >
                      {m.active ? 'Suspend' : 'Activate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role Permissions Reference */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">11-Role Enterprise Access Matrix</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {ROLE_LIST.map((r) => (
            <div key={r.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <div className="font-semibold text-slate-900">{r.label}</div>
              <div className="text-slate-600">{r.description}</div>
              <div className="text-[11px] font-mono text-slate-400">{r.navAccess.length} modules permitted</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
