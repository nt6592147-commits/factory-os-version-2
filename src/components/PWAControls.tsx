import React, { useState } from 'react';
import { Download, RefreshCw, Share, WifiOff } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
      >
        <Download className="w-3.5 h-3.5" />
        Install App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
        >
          <Share className="w-3.5 h-3.5" />
          Install on iOS
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 border border-slate-200 space-y-4">
              <h3 className="text-base font-semibold text-slate-900">Install Factory Memory OS</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                1. Tap the <strong>Share</strong> icon in the Safari toolbar.<br />
                2. Scroll down and select <strong>Add to Home Screen</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 text-sm font-medium text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineSyncBanner: React.FC<{
  pendingCount: number;
  conflictCount: number;
  isSyncing: boolean;
  onSyncNow: () => void;
}> = ({ pendingCount, conflictCount, isSyncing, onSyncNow }) => {
  const isOnline = useOnlineStatus();

  if (isOnline && pendingCount === 0 && conflictCount === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {!isOnline && <WifiOff className="w-4 h-4 text-amber-700 shrink-0" />}
        <span>
          {!isOnline
            ? 'Offline Mode — Approved floor forms are queued locally with duplicate-submission protection.'
            : `${pendingCount} queued record(s) ready to synchronize.${conflictCount > 0 ? ` ${conflictCount} conflict(s) require review.` : ''}`}
        </span>
      </div>
      {isOnline && pendingCount > 0 && (
        <button
          onClick={onSyncNow}
          disabled={isSyncing}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-700 text-white rounded-md font-medium hover:bg-amber-800 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Synchronizing...' : 'Sync Queue Now'}
        </button>
      )}
    </div>
  );
};
