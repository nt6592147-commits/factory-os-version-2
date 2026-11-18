import React, { useState } from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { EmptyState, PageHeader, StatusLabel } from '../components/CommonUI';

export const NotificationsPage: React.FC = () => {
  const { dataset, patchRecord } = useAuth();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const items = dataset.notifications.filter((n) => (filter === 'unread' ? !n.isRead : true));
  const unread = dataset.notifications.filter((n) => !n.isRead);

  const markAllRead = async () => {
    for (const n of unread) {
      await patchRecord('notifications', n.id, { isRead: true }, 'unread', 'read');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Center"
        subtitle="Operational alerts for machine faults, overdue preventive maintenance, low material stock, and shift submissions."
        actions={
          unread.length > 0 ? (
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark All Read ({unread.length})
            </button>
          ) : undefined
        }
      />

      <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg w-fit">
        <button onClick={() => setFilter('all')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${filter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}>
          All ({dataset.notifications.length})
        </button>
        <button onClick={() => setFilter('unread')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${filter === 'unread' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}>
          Unread ({unread.length})
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState title="No notifications" description="There are no unread alerts matching your current filter." />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
          {items.map((n) => (
            <div key={n.id} className={`p-4 flex items-start justify-between gap-4 ${!n.isRead ? 'bg-blue-50/40' : ''}`}>
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-900">{n.title}</span>
                  <StatusLabel status={n.severity} />
                </div>
                <p className="text-xs text-slate-600">{n.message}</p>
                <div className="text-[11px] text-slate-400 font-mono">
                  Type: {n.type.replace(/_/g, ' ')} {n.isRead ? '· Read' : '· Unread'}
                </div>
              </div>
              {!n.isRead && (
                <button
                  onClick={() => patchRecord('notifications', n.id, { isRead: true }, 'unread', 'read')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  Mark Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
