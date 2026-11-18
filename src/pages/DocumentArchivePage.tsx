import React, { useMemo, useState } from 'react';
import { CheckCircle, Download, FileUp, Printer, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  exportRecordsToCsv,
  generateSafeId,
  parseCsvText,
  todayIsoDate,
} from '../services/factoryService';
import { EmptyState, PageHeader, RecordOriginText, StatusLabel } from '../components/CommonUI';

export const DocumentArchivePage: React.FC = () => {
  const { dataset, factory, member, user, roleDef, submitRecord, patchRecord } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    reportType: 'Historical Logbook Scan',
    department: member?.department || 'Production',
    machineName: '',
    materialBatch: '',
    fileName: '',
    fileType: 'pdf' as 'pdf' | 'csv' | 'xlsx' | 'image' | 'manual',
    fileSizeBytes: 0,
    extractedSummary: '',
  });

  const actorName = member?.displayName || user?.displayName || 'Staff';

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const fileType =
      ext === 'csv'
        ? 'csv'
        : ext === 'xlsx' || ext === 'xls'
          ? 'xlsx'
          : ext === 'pdf'
            ? 'pdf'
            : ['png', 'jpg', 'jpeg', 'webp'].includes(ext)
              ? 'image'
              : 'manual';

    let previewSummary = `Uploaded ${file.name} (${Math.round(file.size / 1024)} KB).`;
    if (fileType === 'csv') {
      const text = await file.text();
      const parsed = parseCsvText(text);
      previewSummary = `CSV columns: ${parsed.headers.join(', ')} (${parsed.rows.length} rows staged for human verification).`;
    }

    setForm((prev) => ({
      ...prev,
      title: prev.title || file.name.replace(/\.[^.]+$/, ''),
      fileName: file.name,
      fileType,
      fileSizeBytes: file.size,
      extractedSummary: prev.extractedSummary || previewSummary,
    }));
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitRecord(
      'documents',
      generateSafeId('doc'),
      {
        title: form.title.trim(),
        reportType: form.reportType,
        department: form.department,
        machineName: form.machineName.trim(),
        materialBatch: form.materialBatch.trim(),
        fileName: form.fileName.trim() || 'manual_entry_log.txt',
        fileType: form.fileType,
        fileSizeBytes: form.fileSizeBytes,
        extractedSummary: form.extractedSummary.trim(),
        reviewStatus: 'pending_human_review',
        uploadedByName: actorName,
        uploadedDate: todayIsoDate(0),
        recordOrigin: 'operational',
      },
      `Uploaded archive document: ${form.title} (${form.fileName})`
    );
    setFeedback('Document archived and staged for human verification before official operational confirmation.');
    setShowUpload(false);
  };

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return dataset.documents.filter((d) => {
      if (deptFilter !== 'all' && d.department !== deptFilter) return false;
      if (typeFilter !== 'all' && d.fileType !== typeFilter) return false;
      if (
        q &&
        !d.title.toLowerCase().includes(q) &&
        !d.fileName.toLowerCase().includes(q) &&
        !(d.machineName || '').toLowerCase().includes(q) &&
        !(d.materialBatch || '').toLowerCase().includes(q) &&
        !d.extractedSummary.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [dataset.documents, searchQuery, deptFilter, typeFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Digital Document & Record Archive"
        subtitle="Search historical records, attach manuals/photos, import CSV/Excel logs, and verify digitized logbooks."
        actions={
          <>
            <button
              onClick={() => exportRecordsToCsv('factory_document_archive.csv', filtered as unknown as Record<string, unknown>[])}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / PDF
            </button>
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap"
            >
              <FileUp className="w-3.5 h-3.5" />
              {showUpload ? 'Close Upload' : 'Upload / Import Record'}
            </button>
          </>
        }
      />

      {feedback && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
          {feedback}
        </div>
      )}

      {showUpload && (
        <form onSubmit={handleUploadSubmit} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Digitization & Document Intake (Preserves Original + Requires Human Review)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Attach File (CSV, XLSX, PDF, Image)</label>
              <input type="file" accept=".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg" onChange={handleFilePick} className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50" />
            </div>
            <input required placeholder="Document Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <select value={form.reportType} onChange={(e) => setForm({ ...form, reportType: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              <option value="Historical Logbook Scan">Historical Logbook Scan</option>
              <option value="Equipment Manual">Equipment Manual</option>
              <option value="Inspection Document">Inspection Document</option>
              <option value="Maintenance Photograph">Maintenance Photograph</option>
              <option value="PDF Report">PDF Report</option>
            </select>
            <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              {(factory?.departments || ['Production']).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <input placeholder="Machine Name (optional)" value={form.machineName} onChange={(e) => setForm({ ...form, machineName: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <input placeholder="Material Batch (optional)" value={form.materialBatch} onChange={(e) => setForm({ ...form, materialBatch: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <textarea required rows={2} placeholder="Extracted summary or notes for human verification..." value={form.extractedSummary} onChange={(e) => setForm({ ...form, extractedSummary: e.target.value })} className="sm:col-span-3 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowUpload(false)} className="px-4 py-2 text-xs bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg">Stage in Archive</button>
          </div>
        </form>
      )}

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-lg p-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by title, machine, batch, filename, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg"
          />
        </div>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white">
          <option value="all">All Departments</option>
          {(factory?.departments || []).map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white">
          <option value="all">All File Types</option>
          <option value="pdf">PDF</option>
          <option value="csv">CSV</option>
          <option value="xlsx">Excel (XLSX)</option>
          <option value="image">Image</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No archived documents found" description="Try clearing search filters or upload a new plant manual, scan, or CSV log." />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
          {filtered.map((docItem) => (
            <div key={docItem.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-900">{docItem.title}</span>
                  <span className="text-xs font-mono text-slate-500 uppercase">{docItem.fileType}</span>
                </div>
                <p className="text-xs text-slate-600">{docItem.extractedSummary}</p>
                <div className="text-[11px] text-slate-500 font-mono">
                  {docItem.fileName} · {docItem.department} {docItem.machineName ? `· ${docItem.machineName}` : ''} {docItem.materialBatch ? `· Batch ${docItem.materialBatch}` : ''} · Uploaded {docItem.uploadedDate} by {docItem.uploadedByName} · <RecordOriginText origin={docItem.recordOrigin} />
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusLabel status={docItem.reviewStatus} />
                {docItem.reviewStatus === 'pending_human_review' && (roleDef.canReviewShiftReport || roleDef.canManageSettings) && (
                  <button
                    onClick={() => patchRecord('documents', docItem.id, { reviewStatus: 'verified' }, 'pending_human_review', 'verified')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-green-50 text-green-800 border border-green-200 rounded-lg hover:bg-green-100"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Confirm Verified
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
