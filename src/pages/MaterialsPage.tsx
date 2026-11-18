import React, { useState } from 'react';
import { ClipboardCheck, Download, Plus, Repeat } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { exportRecordsToCsv, generateSafeId, todayIsoDate } from '../services/factoryService';
import { EmptyState, PageHeader, RecordOriginText, StatusLabel } from '../components/CommonUI';

export const MaterialsPage: React.FC = () => {
  const { dataset, factory, member, user, roleDef, submitRecord, patchRecord } = useAuth();
  const [tab, setTab] = useState<'inventory' | 'inspections' | 'movements'>('inventory');
  const [activeForm, setActiveForm] = useState<'none' | 'register' | 'inspect' | 'movement'>('none');
  const [feedback, setFeedback] = useState<string | null>(null);

  const [matForm, setMatForm] = useState({
    materialCode: '',
    name: '',
    category: 'Nonwoven Fabric',
    supplier: '',
    batchNumber: '',
    expectedWidthMm: 320,
    expectedThicknessMm: 0.18,
    expectedWeightKg: 400,
    quantity: 1000,
    minThreshold: 250,
    unit: factory?.materialUnits?.[0] || 'kg',
    dateReceived: todayIsoDate(0),
    storageLocation: 'Bay A-01',
    notes: '',
  });

  const [inspForm, setInspForm] = useState({
    materialId: dataset.materials[0]?.id || '',
    actualWidthMm: 320,
    actualThicknessMm: 0.18,
    actualWeightKg: 400,
    inspectionDate: todayIsoDate(0),
    result: 'approved' as 'approved' | 'rejected' | 'conditional',
    comments: '',
  });

  const [movForm, setMovForm] = useState({
    materialId: dataset.materials[0]?.id || '',
    movementType: 'issued' as 'received' | 'issued' | 'consumed' | 'wasted' | 'returned',
    quantity: 50,
    productionLine: 'Line 1',
    movementDate: todayIsoDate(0),
    notes: '',
  });

  const actorName = member?.displayName || user?.displayName || 'Material Staff';

  const handleRegisterMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    const docId = generateSafeId('mat');
    const { queued } = await submitRecord(
      'materials',
      docId,
      {
        materialCode: matForm.materialCode.trim(),
        name: matForm.name.trim(),
        category: matForm.category.trim(),
        supplier: matForm.supplier.trim(),
        batchNumber: matForm.batchNumber.trim(),
        expectedWidthMm: Number(matForm.expectedWidthMm),
        expectedThicknessMm: Number(matForm.expectedThicknessMm),
        expectedWeightKg: Number(matForm.expectedWeightKg),
        quantity: Number(matForm.quantity),
        remainingQty: Number(matForm.quantity),
        consumedQty: 0,
        wastedQty: 0,
        minThreshold: Number(matForm.minThreshold),
        unit: matForm.unit,
        dateReceived: matForm.dateReceived,
        storageLocation: matForm.storageLocation.trim(),
        status: 'pending_inspection',
        notes: matForm.notes.trim(),
        recordOrigin: 'operational',
      },
      `Registered material ${matForm.materialCode} batch ${matForm.batchNumber}`
    );
    setFeedback(queued ? 'Material queued offline.' : 'Material registered for inspection.');
    setActiveForm('none');
  };

  const handleInspectMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    const mat = dataset.materials.find((m) => m.id === inspForm.materialId);
    if (!mat) return;
    const docId = generateSafeId('insp');
    await submitRecord(
      'materialInspections',
      docId,
      {
        materialId: mat.id,
        materialCode: mat.materialCode,
        materialName: mat.name,
        batchNumber: mat.batchNumber,
        expectedWidthMm: mat.expectedWidthMm,
        actualWidthMm: Number(inspForm.actualWidthMm),
        expectedThicknessMm: mat.expectedThicknessMm,
        actualThicknessMm: Number(inspForm.actualThicknessMm),
        expectedWeightKg: mat.expectedWeightKg,
        actualWeightKg: Number(inspForm.actualWeightKg),
        inspectionDate: inspForm.inspectionDate,
        inspectorName: actorName,
        result: inspForm.result,
        comments: inspForm.comments.trim(),
        recordOrigin: 'operational',
      },
      `Inspected batch ${mat.batchNumber}: ${inspForm.result}`
    );
    await patchRecord(
      'materials',
      mat.id,
      { status: inspForm.result === 'rejected' ? 'rejected' : 'approved' },
      mat.status,
      inspForm.result === 'rejected' ? 'rejected' : 'approved'
    );
    setFeedback(`Inspection logged for ${mat.materialCode} (Batch ${mat.batchNumber}).`);
    setActiveForm('none');
  };

  const handleLogMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    const mat = dataset.materials.find((m) => m.id === movForm.materialId);
    if (!mat) return;
    const qty = Number(movForm.quantity);
    let nextRemaining = mat.remainingQty;
    let nextConsumed = mat.consumedQty || 0;
    let nextWasted = mat.wastedQty || 0;

    if (movForm.movementType === 'received' || movForm.movementType === 'returned') {
      nextRemaining += qty;
    } else if (movForm.movementType === 'consumed' || movForm.movementType === 'issued') {
      nextRemaining = Math.max(0, nextRemaining - qty);
      if (movForm.movementType === 'consumed') nextConsumed += qty;
    } else if (movForm.movementType === 'wasted') {
      nextRemaining = Math.max(0, nextRemaining - qty);
      nextWasted += qty;
    }

    await submitRecord(
      'materialMovements',
      generateSafeId('mov'),
      {
        materialId: mat.id,
        materialCode: mat.materialCode,
        materialName: mat.name,
        batchNumber: mat.batchNumber,
        movementType: movForm.movementType,
        quantity: qty,
        unit: mat.unit,
        productionLine: movForm.productionLine.trim(),
        recordedByName: actorName,
        movementDate: movForm.movementDate,
        notes: movForm.notes.trim(),
        recordOrigin: 'operational',
      },
      `Material movement (${movForm.movementType}): ${qty} ${mat.unit} of ${mat.materialCode}`
    );

    await patchRecord(
      'materials',
      mat.id,
      {
        remainingQty: nextRemaining,
        consumedQty: nextConsumed,
        wastedQty: nextWasted,
        status: nextRemaining === 0 ? 'depleted' : 'in_production',
      },
      `remaining=${mat.remainingQty}`,
      `remaining=${nextRemaining}`
    );
    setFeedback(`Movement recorded and remaining stock updated to ${nextRemaining} ${mat.unit}.`);
    setActiveForm('none');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Material Management"
        subtitle="Track incoming batches, physical width/thickness/weight inspections, stock movements, and material wastage."
        actions={
          <>
            <button
              onClick={() => exportRecordsToCsv('materials_inventory.csv', dataset.materials as unknown as Record<string, unknown>[])}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            {roleDef.canManageMaterials && (
              <>
                <button
                  onClick={() => setActiveForm(activeForm === 'register' ? 'none' : 'register')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Register Batch
                </button>
                <button
                  onClick={() => setActiveForm(activeForm === 'movement' ? 'none' : 'movement')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
                >
                  <Repeat className="w-3.5 h-3.5" />
                  Log Movement
                </button>
              </>
            )}
            {roleDef.canInspectMaterials && (
              <button
                onClick={() => setActiveForm(activeForm === 'inspect' ? 'none' : 'inspect')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                Inspect Material
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

      {activeForm === 'register' && (
        <form onSubmit={handleRegisterMaterial} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Register Incoming Material Batch</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <input required placeholder="Material ID (e.g. MAT-NW-210)" value={matForm.materialCode} onChange={(e) => setMatForm({ ...matForm, materialCode: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input required placeholder="Material Name" value={matForm.name} onChange={(e) => setMatForm({ ...matForm, name: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input required placeholder="Category" value={matForm.category} onChange={(e) => setMatForm({ ...matForm, category: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input required placeholder="Supplier" value={matForm.supplier} onChange={(e) => setMatForm({ ...matForm, supplier: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input required placeholder="Batch Number" value={matForm.batchNumber} onChange={(e) => setMatForm({ ...matForm, batchNumber: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input type="number" step="0.01" placeholder="Expected Width (mm)" value={matForm.expectedWidthMm} onChange={(e) => setMatForm({ ...matForm, expectedWidthMm: Number(e.target.value) })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input type="number" step="0.001" placeholder="Expected Thickness (mm)" value={matForm.expectedThicknessMm} onChange={(e) => setMatForm({ ...matForm, expectedThicknessMm: Number(e.target.value) })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input type="number" step="0.1" placeholder="Expected Roll/Unit Weight (kg)" value={matForm.expectedWeightKg} onChange={(e) => setMatForm({ ...matForm, expectedWeightKg: Number(e.target.value) })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input type="number" required placeholder="Total Quantity" value={matForm.quantity} onChange={(e) => setMatForm({ ...matForm, quantity: Number(e.target.value) })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <select value={matForm.unit} onChange={(e) => setMatForm({ ...matForm, unit: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              {(factory?.materialUnits || ['kg', 'rolls', 'pcs']).map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <input required placeholder="Storage Location" value={matForm.storageLocation} onChange={(e) => setMatForm({ ...matForm, storageLocation: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input type="date" value={matForm.dateReceived} onChange={(e) => setMatForm({ ...matForm, dateReceived: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setActiveForm('none')} className="px-4 py-2 text-xs bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg">Save Material Batch</button>
          </div>
        </form>
      )}

      {activeForm === 'inspect' && (
        <form onSubmit={handleInspectMaterial} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Material Checker — Physical Specification Inspection</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Material Batch</label>
              <select value={inspForm.materialId} onChange={(e) => setInspForm({ ...inspForm, materialId: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                {dataset.materials.map((m) => (
                  <option key={m.id} value={m.id}>{m.materialCode} (Batch {m.batchNumber})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Actual Width (mm)</label>
              <input type="number" step="0.01" required value={inspForm.actualWidthMm} onChange={(e) => setInspForm({ ...inspForm, actualWidthMm: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Actual Thickness (mm)</label>
              <input type="number" step="0.001" required value={inspForm.actualThicknessMm} onChange={(e) => setInspForm({ ...inspForm, actualThicknessMm: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Actual Weight (kg)</label>
              <input type="number" step="0.1" required value={inspForm.actualWeightKg} onChange={(e) => setInspForm({ ...inspForm, actualWeightKg: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Inspection Result</label>
              <select value={inspForm.result} onChange={(e) => setInspForm({ ...inspForm, result: e.target.value as 'approved' | 'rejected' | 'conditional' })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                <option value="approved">Approved</option>
                <option value="conditional">Conditional Hold</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Comments</label>
              <input type="text" value={inspForm.comments} onChange={(e) => setInspForm({ ...inspForm, comments: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setActiveForm('none')} className="px-4 py-2 text-xs bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg">Record Inspection</button>
          </div>
        </form>
      )}

      {activeForm === 'movement' && (
        <form onSubmit={handleLogMovement} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Record Material Movement (Issue / Consume / Waste)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <select value={movForm.materialId} onChange={(e) => setMovForm({ ...movForm, materialId: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              {dataset.materials.map((m) => (
                <option key={m.id} value={m.id}>{m.materialCode} ({m.remainingQty} {m.unit})</option>
              ))}
            </select>
            <select value={movForm.movementType} onChange={(e) => setMovForm({ ...movForm, movementType: e.target.value as typeof movForm.movementType })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              <option value="issued">Issued to Production</option>
              <option value="consumed">Consumed</option>
              <option value="wasted">Wastage / Scrap</option>
              <option value="returned">Returned to Store</option>
              <option value="received">Additional Receipt</option>
            </select>
            <input type="number" min={1} required value={movForm.quantity} onChange={(e) => setMovForm({ ...movForm, quantity: Number(e.target.value) })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input placeholder="Line / Notes" value={movForm.productionLine} onChange={(e) => setMovForm({ ...movForm, productionLine: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setActiveForm('none')} className="px-4 py-2 text-xs bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg">Post Movement</button>
          </div>
        </form>
      )}

      {/* Segmented View Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg w-fit">
        {([
          ['inventory', `Inventory (${dataset.materials.length})`],
          ['inspections', `Inspections (${dataset.materialInspections.length})`],
          ['movements', `Movements (${dataset.materialMovements.length})`],
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

      {tab === 'inventory' && (
        dataset.materials.length === 0 ? (
          <EmptyState title="No materials registered" description="Register raw material batches to begin inventory and inspection tracking." />
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Code & Material</th>
                  <th className="py-3 px-4">Batch & Supplier</th>
                  <th className="py-3 px-4">Specs (W / T / Wt)</th>
                  <th className="py-3 px-4 text-right">Received</th>
                  <th className="py-3 px-4 text-right">Consumed / Waste</th>
                  <th className="py-3 px-4 text-right">Remaining</th>
                  <th className="py-3 px-4">Location & Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {dataset.materials.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold text-slate-900">{m.materialCode}</div>
                      <div className="text-slate-600">{m.name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-slate-900">Batch {m.batchNumber}</div>
                      <div className="text-slate-500">{m.supplier} · {m.dateReceived}</div>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                      {m.expectedWidthMm}mm / {m.expectedThicknessMm}mm / {m.expectedWeightKg}kg
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">{m.quantity} {m.unit}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">{m.consumedQty} / {m.wastedQty} {m.unit}</td>
                    <td className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${m.remainingQty <= m.minThreshold ? 'text-red-700' : 'text-slate-900'}`}>
                      {m.remainingQty} {m.unit}
                    </td>
                    <td className="py-3 px-4 space-y-0.5">
                      <div><StatusLabel status={m.status} /></div>
                      <div className="text-slate-500">{m.storageLocation} · <RecordOriginText origin={m.recordOrigin} /></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'inspections' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Date & Material</th>
                <th className="py-3 px-4">Width (Exp vs Act)</th>
                <th className="py-3 px-4">Thickness (Exp vs Act)</th>
                <th className="py-3 px-4">Weight (Exp vs Act)</th>
                <th className="py-3 px-4">Inspector & Notes</th>
                <th className="py-3 px-4">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {dataset.materialInspections.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="font-mono font-semibold text-slate-900">{i.materialCode} · Batch {i.batchNumber}</div>
                    <div className="text-slate-500">{i.inspectionDate} · {i.materialName}</div>
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums">{i.expectedWidthMm} / {i.actualWidthMm} mm</td>
                  <td className="py-3 px-4 font-mono tabular-nums">{i.expectedThicknessMm} / {i.actualThicknessMm} mm</td>
                  <td className="py-3 px-4 font-mono tabular-nums">{i.expectedWeightKg} / {i.actualWeightKg} kg</td>
                  <td className="py-3 px-4">
                    <div className="text-slate-800">{i.inspectorName}</div>
                    <div className="text-slate-500">{i.comments}</div>
                  </td>
                  <td className="py-3 px-4"><StatusLabel status={i.result} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'movements' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Material & Batch</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4">Line / Destination</th>
                <th className="py-3 px-4">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {dataset.materialMovements.map((mov) => (
                <tr key={mov.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono tabular-nums">{mov.movementDate}</td>
                  <td className="py-3 px-4 font-medium">{mov.materialCode} · Batch {mov.batchNumber}</td>
                  <td className="py-3 px-4 uppercase font-mono text-[11px]">{mov.movementType}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">{mov.quantity} {mov.unit}</td>
                  <td className="py-3 px-4">{mov.productionLine || '-'} · {mov.notes}</td>
                  <td className="py-3 px-4">{mov.recordedByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
