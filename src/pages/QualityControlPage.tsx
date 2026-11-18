import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { generateSafeId, todayIsoDate } from '../services/factoryService';
import type { QualityInspection } from '../types/factory';
import { PageHeader, RecordOriginText, StatusLabel } from '../components/CommonUI';

export const QualityControlPage: React.FC = () => {
  const { dataset, member, user, roleDef, submitRecord } = useAuth();
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    productName: 'UltraDry Baby Diaper Size M',
    productionLine: 'Line 1',
    inspectionDate: todayIsoDate(0),
    batchNumber: '',
    result: 'passed' as QualityInspection['result'],
    defectiveQty: 0,
    defectCategory: 'None',
    rejectionReason: '',
    correctiveAction: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const actorName = member?.displayName || user?.displayName || 'QC Inspector';
    await submitRecord(
      'qualityInspections',
      generateSafeId('qc'),
      {
        ...form,
        defectiveQty: Number(form.defectiveQty),
        inspectorName: actorName,
        recordOrigin: 'operational',
      },
      `QC inspection on ${form.productName} (${form.batchNumber}): ${form.result}`
    );
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quality Control"
        subtitle="Record finished-goods inspections, defective quantities, rejection reasons, and corrective actions."
        actions={
          roleDef.canLogQuality ? (
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              {showForm ? 'Close Form' : 'New QC Inspection'}
            </button>
          ) : undefined
        }
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Record Quality Inspection</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input required placeholder="Product Name" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input required placeholder="Production Line" value={form.productionLine} onChange={(e) => setForm({ ...form, productionLine: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input required placeholder="Batch / Lot Number" value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input type="date" value={form.inspectionDate} onChange={(e) => setForm({ ...form, inspectionDate: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value as QualityInspection['result'] })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              <option value="passed">Passed</option>
              <option value="hold">Quarantine / Hold</option>
              <option value="rejected">Rejected</option>
            </select>
            <input type="number" min={0} placeholder="Defective Quantity" value={form.defectiveQty} onChange={(e) => setForm({ ...form, defectiveQty: Number(e.target.value) })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input placeholder="Defect Category" value={form.defectCategory} onChange={(e) => setForm({ ...form, defectCategory: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input placeholder="Rejection Reason" value={form.rejectionReason} onChange={(e) => setForm({ ...form, rejectionReason: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input placeholder="Corrective Action" value={form.correctiveAction} onChange={(e) => setForm({ ...form, correctiveAction: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg">Save Inspection</button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <th className="py-3 px-4">Date & Lot</th>
              <th className="py-3 px-4">Product & Line</th>
              <th className="py-3 px-4 text-right">Defective Qty</th>
              <th className="py-3 px-4">Defect & Corrective Action</th>
              <th className="py-3 px-4">Inspector</th>
              <th className="py-3 px-4">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {dataset.qualityInspections.map((qc) => (
              <tr key={qc.id} className="hover:bg-slate-50">
                <td className="py-3 px-4 font-mono tabular-nums">
                  <div className="font-semibold text-slate-900">{qc.batchNumber}</div>
                  <div className="text-slate-500">{qc.inspectionDate}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-medium text-slate-900">{qc.productName}</div>
                  <div className="text-slate-500">{qc.productionLine} · <RecordOriginText origin={qc.recordOrigin} /></div>
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">{qc.defectiveQty}</td>
                <td className="py-3 px-4 max-w-md">
                  <div className="font-medium text-slate-800">{qc.defectCategory} {qc.rejectionReason ? `— ${qc.rejectionReason}` : ''}</div>
                  <div className="text-slate-500">{qc.correctiveAction}</div>
                </td>
                <td className="py-3 px-4">{qc.inspectorName}</td>
                <td className="py-3 px-4"><StatusLabel status={qc.result} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
