import React, { useMemo, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { exportRecordsToCsv, generateSafeId, todayIsoDate } from '../services/factoryService';
import { EmptyState, KpiCard, PageHeader, RecordOriginText } from '../components/CommonUI';

export const ProductionPage: React.FC = () => {
  const { dataset, factory, member, user, roleDef, submitRecord } = useAuth();
  const [periodFilter, setPeriodFilter] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('all');
  const [lineFilter, setLineFilter] = useState('all');
  const [shiftFilter, setShiftFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [form, setForm] = useState({
    productionDate: todayIsoDate(0),
    productName: 'UltraDry Baby Diaper Size M',
    productionLine: 'Line 1',
    machineId: dataset.machines[0]?.id || '',
    shift: factory?.shifts?.[0] || 'Morning',
    targetQty: 48000,
    actualQty: 46500,
    rejectedQty: 320,
    materialsConsumed: '',
    startTime: '06:00',
    endTime: '14:00',
    supervisorName: member?.displayName || user?.displayName || '',
    operatorName: '',
    notes: '',
  });

  const filtered = useMemo(() => {
    const today = todayIsoDate(0);
    const weekAgo = todayIsoDate(-7);
    const monthAgo = todayIsoDate(-30);
    return dataset.productionRecords.filter((r) => {
      if (periodFilter === 'daily' && r.productionDate !== today) return false;
      if (periodFilter === 'weekly' && r.productionDate < weekAgo) return false;
      if (periodFilter === 'monthly' && r.productionDate < monthAgo) return false;
      if (lineFilter !== 'all' && r.productionLine !== lineFilter) return false;
      if (shiftFilter !== 'all' && r.shift !== shiftFilter) return false;
      return true;
    });
  }, [dataset.productionRecords, periodFilter, lineFilter, shiftFilter]);

  const totals = useMemo(() => {
    const target = filtered.reduce((s, r) => s + r.targetQty, 0);
    const actual = filtered.reduce((s, r) => s + r.actualQty, 0);
    const rejected = filtered.reduce((s, r) => s + r.rejectedQty, 0);
    const eff = target > 0 ? ((actual / target) * 100).toFixed(1) : '0.0';
    return { target, actual, rejected, eff };
  }, [filtered]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const selectedMachine = dataset.machines.find((m) => m.id === form.machineId);
      const docId = generateSafeId('prod');
      const { queued } = await submitRecord(
        'productionRecords',
        docId,
        {
          productionDate: form.productionDate,
          productName: form.productName.trim(),
          productionLine: form.productionLine.trim(),
          machineId: selectedMachine?.id || '',
          machineName: selectedMachine?.name || 'General Line Asset',
          shift: form.shift,
          targetQty: Number(form.targetQty),
          actualQty: Number(form.actualQty),
          rejectedQty: Number(form.rejectedQty),
          materialsConsumed: form.materialsConsumed.trim(),
          startTime: form.startTime,
          endTime: form.endTime,
          supervisorName: form.supervisorName.trim(),
          operatorName: form.operatorName.trim(),
          notes: form.notes.trim(),
          recordOrigin: 'operational',
        },
        `Logged production: ${form.productName} (${form.actualQty} / ${form.targetQty})`
      );
      setFeedback(
        queued
          ? 'Offline Mode: Production record saved to local sync queue.'
          : 'Production record saved to plant ledger.'
      );
      setShowForm(false);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Failed to log production.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Management"
        subtitle="Track shift production targets, output, rejected units, and material usage across lines and machines."
        actions={
          <>
            <button
              onClick={() => exportRecordsToCsv('production_records.csv', filtered as unknown as Record<string, unknown>[])}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            {roleDef.canLogProduction && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                {showForm ? 'Close Form' : 'Log Production Run'}
              </button>
            )}
          </>
        }
      />

      {feedback && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
          {feedback}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Record Production Activity</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Production Date</label>
              <input
                type="date"
                required
                value={form.productionDate}
                onChange={(e) => setForm({ ...form, productionDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Product Name</label>
              <input
                type="text"
                required
                value={form.productName}
                onChange={(e) => setForm({ ...form, productName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Production Line</label>
              <input
                type="text"
                required
                value={form.productionLine}
                onChange={(e) => setForm({ ...form, productionLine: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Machine</label>
              <select
                value={form.machineId}
                onChange={(e) => setForm({ ...form, machineId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                {dataset.machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.machineCode} — {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Shift</label>
              <select
                value={form.shift}
                onChange={(e) => setForm({ ...form, shift: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                {(factory?.shifts || ['Morning', 'Afternoon', 'Night']).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Target Output</label>
              <input
                type="number"
                min={0}
                required
                value={form.targetQty}
                onChange={(e) => setForm({ ...form, targetQty: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Actual Output</label>
              <input
                type="number"
                min={0}
                required
                value={form.actualQty}
                onChange={(e) => setForm({ ...form, actualQty: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Rejected Products</label>
              <input
                type="number"
                min={0}
                required
                value={form.rejectedQty}
                onChange={(e) => setForm({ ...form, rejectedQty: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Start Time</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">End Time</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Supervisor</label>
              <input
                type="text"
                required
                value={form.supervisorName}
                onChange={(e) => setForm({ ...form, supervisorName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Operator</label>
              <input
                type="text"
                required
                placeholder="Operator full name"
                value={form.operatorName}
                onChange={(e) => setForm({ ...form, operatorName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Materials Consumed</label>
              <input
                type="text"
                placeholder="e.g. MAT-NW-204 (210 kg), MAT-SAP-205 (295 kg)"
                value={form.materialsConsumed}
                onChange={(e) => setForm({ ...form, materialsConsumed: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Production Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Production Record'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Target" value={totals.target.toLocaleString()} />
        <KpiCard label="Actual Output" value={totals.actual.toLocaleString()} tone="success" />
        <KpiCard label="Rejected Units" value={totals.rejected.toLocaleString()} tone="warning" />
        <KpiCard label="Shift Efficiency" value={`${totals.eff}%`} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg p-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(['daily', 'weekly', 'monthly', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodFilter(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize ${
                periodFilter === p ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {p === 'all' ? 'All History' : `${p} Report`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={lineFilter}
            onChange={(e) => setLineFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Lines</option>
            {Array.from(new Set(dataset.productionRecords.map((r) => r.productionLine))).map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Shifts</option>
            {(factory?.shifts || ['Morning', 'Afternoon', 'Night']).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No production records match filters"
          description="Adjust your timeframe or line filter, or record a new shift production entry."
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Date & Shift</th>
                <th className="py-3 px-4">Product & Line</th>
                <th className="py-3 px-4">Machine</th>
                <th className="py-3 px-4 text-right">Target</th>
                <th className="py-3 px-4 text-right">Actual</th>
                <th className="py-3 px-4 text-right">Rejected</th>
                <th className="py-3 px-4 text-right">Efficiency</th>
                <th className="py-3 px-4">Personnel & Origin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map((r) => {
                const eff = r.targetQty > 0 ? ((r.actualQty / r.targetQty) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap">
                      <div className="font-medium text-slate-900">{r.productionDate}</div>
                      <div className="text-slate-500">{r.shift} ({r.startTime}-{r.endTime})</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{r.productName}</div>
                      <div className="text-slate-500">{r.productionLine} · {r.materialsConsumed || 'Standard BOM'}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{r.machineName}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">{r.targetQty.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">{r.actualQty.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-amber-700">{r.rejectedQty.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">{eff}%</td>
                    <td className="py-3 px-4">
                      <div className="text-slate-700">{r.supervisorName} / {r.operatorName}</div>
                      <RecordOriginText origin={r.recordOrigin} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
