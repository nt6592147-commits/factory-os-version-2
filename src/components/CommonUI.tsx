import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  PauseCircle,
  PlayCircle,
  XCircle,
} from 'lucide-react';
import type { RecordOrigin } from '../types/factory';

export const PageHeader: React.FC<{
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
    <div className="min-w-0">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      <p className="text-sm text-slate-600 mt-1">{subtitle}</p>
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>}
  </div>
);

export const KpiCard: React.FC<{
  label: string;
  value: string | number;
  detail?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}> = ({ label, value, detail, tone = 'default' }) => {
  const toneText =
    tone === 'success'
      ? 'text-green-700'
      : tone === 'warning'
        ? 'text-amber-700'
        : tone === 'danger'
          ? 'text-red-700'
          : 'text-slate-900';

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`text-2xl font-bold tracking-tight mt-1 tabular-nums ${toneText}`}>
        {value}
      </div>
      {detail && <div className="text-xs text-slate-500 mt-1 tabular-nums">{detail}</div>}
    </div>
  );
};

export const StatusLabel: React.FC<{
  status: string;
}> = ({ status }) => {
  const s = status.toLowerCase();
  if (['running', 'approved', 'passed', 'resolved', 'completed', 'verified', 'reviewed', 'active'].includes(s)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>{formatStatusText(status)}</span>
      </span>
    );
  }
  if (['stopped', 'rejected', 'critical', 'overdue', 'high'].includes(s)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap">
        <XCircle className="w-3.5 h-3.5 shrink-0" />
        <span>{formatStatusText(status)}</span>
      </span>
    );
  }
  if (['maintenance', 'in_progress', 'due_soon', 'hold', 'conditional', 'awaiting_review', 'pending_human_review', 'pending_inspection', 'warning', 'medium', 'open'].includes(s)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span>{formatStatusText(status)}</span>
      </span>
    );
  }
  if (s === 'standby') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
        <PauseCircle className="w-3.5 h-3.5 shrink-0" />
        <span>Standby</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
      <Clock className="w-3.5 h-3.5 shrink-0" />
      <span>{formatStatusText(status)}</span>
    </span>
  );
};

export const MachineRunIcon: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'running') return <PlayCircle className="w-4 h-4 text-green-600 shrink-0" />;
  if (status === 'stopped') return <XCircle className="w-4 h-4 text-red-600 shrink-0" />;
  if (status === 'maintenance') return <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />;
  return <PauseCircle className="w-4 h-4 text-slate-500 shrink-0" />;
};

export const RecordOriginText: React.FC<{ origin?: RecordOrigin }> = ({ origin }) => (
  <span className="text-xs text-slate-500 font-mono">
    {origin === 'sample' ? 'Sample Data' : 'Verified Operational'}
  </span>
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => (
  <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-3">
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">{description}</p>
    {action && <div className="pt-2">{action}</div>}
  </div>
);

export function formatStatusText(raw: string): string {
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
