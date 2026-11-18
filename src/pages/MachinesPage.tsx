import React, { useState } from 'react';
import { History, Plus, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { generateSafeId, todayIsoDate } from '../services/factoryService';
import type { Machine } from '../types/factory';
import { MachineRunIcon, PageHeader, RecordOriginText, StatusLabel } from '../components/CommonUI';

const MACHINE_CATEGORIES = {
  diaper_production: [
    'Core forming unit',
    'SAP applicator',
    'Elastic applicator',
    'Frontal tape unit',
    'Side tape unit',
    'Cutting unit',
    'Folding unit',
  ],
  supporting_equipment: [
    'Packaging machines',
    'Air compressors',
    'Air dryers',
    'Power generators',
  ],
};

export const MachinesPage: React.FC = () => {
  const { dataset, roleDef, submitRecord, patchRecord } = useAuth();
  const [groupFilter, setGroupFilter] = useState<'all' | 'diaper_production' | 'supporting_equipment'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [form, setForm] = useState({
    machineCode: '',
    name: '',
    equipmentGroup: 'diaper_production' as 'diaper_production' | 'supporting_equipment',
    category: 'Core forming unit',
    manufacturer: '',
    model: '',
    serialNumber: '',
    department: 'Production',
    productionLine: 'Line 1',
    installationDate: todayIsoDate(0),
    runningHours: 0,
    nextMaintenanceDate: todayIsoDate(30),
  });

  const filtered = dataset.machines.filter(
    (m) => groupFilter === 'all' || m.equipmentGroup === groupFilter
  );

  const handleAddMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    const docId = generateSafeId('mach');
    await submitRecord(
      'machines',
      docId,
      {
        ...form,
        runningHours: Number(form.runningHours),
        status: 'running',
        lastMaintenanceDate: todayIsoDate(0),
        recordOrigin: 'operational',
      },
      `Registered machine ${form.machineCode}: ${form.name}`
    );
    setFeedback(`Registered ${form.machineCode} — ${form.name}.`);
    setShowAdd(false);
  };

  const handleStatusChange = async (machine: Machine, nextStatus: Machine['status']) => {
    await patchRecord('machines', machine.id, { status: nextStatus }, machine.status, nextStatus);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Centralized Machine Register"
        subtitle="Equipment registry covering diaper converting units, supporting utilities, and per-asset maintenance histories."
        actions={
          roleDef.canManageMachines ? (
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              {showAdd ? 'Close Form' : 'Register Machine'}
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
        <form onSubmit={handleAddMachine} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Register New Plant Equipment</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <input required placeholder="Machine ID (e.g. DP-CORE-02)" value={form.machineCode} onChange={(e) => setForm({ ...form, machineCode: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input required placeholder="Machine Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <select
              value={form.equipmentGroup}
              onChange={(e) => {
                const grp = e.target.value as 'diaper_production' | 'supporting_equipment';
                setForm({ ...form, equipmentGroup: grp, category: MACHINE_CATEGORIES[grp][0] });
              }}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="diaper_production">Diaper Production Equipment</option>
              <option value="supporting_equipment">Supporting Equipment</option>
            </select>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              {MACHINE_CATEGORIES[form.equipmentGroup].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input placeholder="Manufacturer" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input placeholder="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input placeholder="Serial Number" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input placeholder="Production Line / Dept" value={form.productionLine} onChange={(e) => setForm({ ...form, productionLine: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-xs bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg">Register Asset</button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg w-fit">
        {([
          ['all', `All Assets (${dataset.machines.length})`],
          ['diaper_production', 'Diaper Production Equipment'],
          ['supporting_equipment', 'Supporting Equipment'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setGroupFilter(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
              groupFilter === key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <th className="py-3 px-4">Machine</th>
              <th className="py-3 px-4">Category & Line</th>
              <th className="py-3 px-4">OEM / Serial</th>
              <th className="py-3 px-4 text-right">Running Hrs</th>
              <th className="py-3 px-4">Next PM</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">History</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filtered.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <MachineRunIcon status={m.status} />
                    <div>
                      <div className="font-semibold text-slate-900">{m.name}</div>
                      <div className="font-mono text-slate-500">{m.machineCode} · <RecordOriginText origin={m.recordOrigin} /></div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-slate-900">{m.category}</div>
                  <div className="text-slate-500">{m.department} · {m.productionLine}</div>
                </td>
                <td className="py-3 px-4">
                  <div>{m.manufacturer} {m.model}</div>
                  <div className="font-mono text-slate-500">S/N: {m.serialNumber}</div>
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums">{m.runningHours.toLocaleString()}</td>
                <td className="py-3 px-4 font-mono tabular-nums">{m.nextMaintenanceDate || '-'}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <StatusLabel status={m.status} />
                    {roleDef.canManageMachines && (
                      <select
                        value={m.status}
                        onChange={(e) => handleStatusChange(m, e.target.value as Machine['status'])}
                        className="px-2 py-1 text-[11px] border border-slate-200 rounded bg-white"
                      >
                        <option value="running">Running</option>
                        <option value="stopped">Stopped</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="standby">Standby</option>
                      </select>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => setSelectedMachine(m)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md whitespace-nowrap"
                  >
                    <History className="w-3.5 h-3.5" />
                    Record History
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Machine Historical Record Drawer */}
      {selectedMachine && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50">
          <div className="w-full max-w-2xl bg-white h-full overflow-y-auto p-6 space-y-6 border-l border-slate-200">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="font-mono text-xs text-slate-500">{selectedMachine.machineCode}</div>
                <h2 className="text-lg font-bold text-slate-900">{selectedMachine.name}</h2>
                <div className="text-xs text-slate-600 mt-0.5">
                  {selectedMachine.manufacturer} {selectedMachine.model} · S/N {selectedMachine.serialNumber} · Installed {selectedMachine.installationDate}
                </div>
              </div>
              <button
                onClick={() => setSelectedMachine(null)}
                className="p-2 text-slate-500 hover:text-slate-900 rounded-lg"
                aria-label="Close machine history"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Reported Incidents
              </h3>
              {dataset.machineIncidents.filter((i) => i.machineId === selectedMachine.id).length === 0 ? (
                <p className="text-xs text-slate-500">No incidents recorded for this asset.</p>
              ) : (
                <div className="space-y-2">
                  {dataset.machineIncidents
                    .filter((i) => i.machineId === selectedMachine.id)
                    .map((inc) => (
                      <div key={inc.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span>{inc.faultCategory} ({inc.department})</span>
                          <StatusLabel status={inc.status} />
                        </div>
                        <p className="text-slate-600">{inc.description}</p>
                        <div className="text-slate-400 font-mono">{inc.reportedDate} {inc.reportedTime} · {inc.reportedByName}</div>
                      </div>
                    ))}
                </div>
              )}

              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider pt-2">
                Electrical & Mechanical Maintenance Logs
              </h3>
              {[...dataset.electricalMaintenance, ...dataset.mechanicalMaintenance]
                .filter((m) => m.machineId === selectedMachine.id)
                .map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between font-semibold">
                      <span className="capitalize">{log.discipline}: {log.faultCategory}</span>
                      <span className="font-mono">{log.downtimeMinutes} min downtime</span>
                    </div>
                    <p className="text-slate-700">Action: {log.actionTaken}</p>
                    <p className="text-slate-500">Parts: {log.sparePartsUsed || 'None'} · Tech: {log.technicianName} ({log.recordDate})</p>
                  </div>
                ))}

              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider pt-2">
                Downtime History
              </h3>
              {dataset.downtimeRecords
                .filter((d) => d.machineId === selectedMachine.id)
                .map((dt) => (
                  <div key={dt.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between font-semibold">
                      <span>{dt.date} ({dt.timeStopped} - {dt.timeProductionResumed})</span>
                      <span className="font-mono">{dt.totalStoppageMinutes} min total / {dt.activeRepairMinutes} min repair</span>
                    </div>
                    <p className="text-slate-600">{dt.reason} — {dt.resolution}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
