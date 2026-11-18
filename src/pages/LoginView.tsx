import React, { useState } from 'react';
import { Bot, Check, Copy, Database, ExternalLink, Factory, Lock, ShieldCheck } from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';
import { useAuth } from '../contexts/AuthContext';
import { PWAInstallButton } from '../components/PWAControls';

export const LoginView: React.FC = () => {
  const { signInWithGoogle, authError, authLoading } = useAuth();
  const [copiedHost, setCopiedHost] = useState(false);

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const isUnauthorizedDomain = Boolean(authError?.includes('auth/unauthorized-domain'));
  const authSettingsUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;

  const handleCopyHost = async () => {
    if (!currentHost) return;
    try {
      await navigator.clipboard.writeText(currentHost);
      setCopiedHost(true);
      setTimeout(() => setCopiedHost(false), 2000);
    } catch {
      // Clipboard fallback ignored
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <header className="bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between gap-8">
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#0F172A] flex items-center justify-center text-white">
            <Factory className="w-4 h-4" />
          </div>
          <span className="text-base font-bold text-slate-900">Factory Memory OS</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <PWAInstallButton />
          <button
            onClick={signInWithGoogle}
            disabled={authLoading}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            Sign In
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-7 bg-[#0F172A] text-white rounded-xl p-8 sm:p-10 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="text-xs font-medium text-blue-400 tracking-wide">
                Industrial Operations Management System
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight text-balance">
                Every Machine. Every Material. Every Production Record. Connected.
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
                Replace fragmented paper logbooks and verbal handovers with a unified, role-secured operational memory across production lines, raw material checks, electrical and mechanical maintenance, and AI-assisted historical retrieval.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 mt-8 border-t border-slate-800">
              <div className="space-y-1">
                <Database className="w-4 h-4 text-blue-400" />
                <div className="text-sm font-semibold">Centralized Logs</div>
                <div className="text-xs text-slate-400">
                  Production, materials, QC, and downtime persisted in real time.
                </div>
              </div>
              <div className="space-y-1">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <div className="text-sm font-semibold">11-Role RBAC</div>
                <div className="text-xs text-slate-400">
                  Enforced backend security rules and immutable audit trails.
                </div>
              </div>
              <div className="space-y-1">
                <Bot className="w-4 h-4 text-blue-400" />
                <div className="text-sm font-semibold">Factory Memory AI</div>
                <div className="text-xs text-slate-400">
                  Natural-language queries grounded strictly in plant records.
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-8 flex flex-col justify-center space-y-6">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Authorized Personnel Sign In</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Authenticate with your assigned Google workspace account to access your factory tenant and departmental workflows.
              </p>
            </div>

            {authError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 space-y-2">
                <div className="font-semibold">{authError}</div>
                {isUnauthorizedDomain && currentHost && (
                  <div className="space-y-2 pt-1 border-t border-red-200 text-red-800">
                    <div>
                      Add this exact domain in Firebase Console under{' '}
                      <span className="font-semibold">Authentication → Settings → Authorized domains</span>:
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-white border border-red-200 rounded px-2.5 py-1.5 font-mono text-[11px] text-slate-900">
                      <span className="truncate">{currentHost}</span>
                      <button
                        type="button"
                        onClick={handleCopyHost}
                        className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-sans font-medium shrink-0"
                      >
                        {copiedHost ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedHost ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <a
                      href={authSettingsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-700 hover:underline font-medium"
                    >
                      Open Firebase Auth Settings ({firebaseConfig.projectId})
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={signInWithGoogle}
              disabled={authLoading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {authLoading ? 'Initializing Session...' : 'Sign In with Google'}
            </button>

            <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1.5">
              <div className="font-medium text-slate-700">Supported Plant Roles</div>
              <div>
                Super Admin · Factory Manager · Production Supervisor · Electrical & Mechanical Maintenance · Material Checker · Storekeeper · Quality Control · Machine Operator
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="px-6 py-4 text-center text-xs text-slate-500 border-t border-slate-200 bg-white">
        Factory Memory OS · The Digital Memory of Manufacturing
      </footer>
    </div>
  );
};
