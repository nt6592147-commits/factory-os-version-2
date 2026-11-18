import React, { useState } from 'react';
import { AlertTriangle, Bot, Database, Send, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader } from '../components/CommonUI';

interface AIQueryResult {
  answer: string;
  recordedFacts: string[];
  analyticalObservations: string[];
  citedRecords: { module: string; recordId: string; date: string; summary: string }[];
  dataGaps: string[];
  safetyNotice?: string;
}

const EXAMPLE_QUESTIONS = [
  'Show me all electrical faults reported this week.',
  'What action was taken during the previous heater failure?',
  'Which machine had the highest downtime?',
  'What was the recorded thickness of material batch 204?',
  'Show me the previous shift electrical maintenance report.',
  'Which maintenance reports are still awaiting approval?',
  'Summarize the electrical department activities.',
];

export const FactoryMemoryAIPage: React.FC = () => {
  const { dataset, factory, member, user, roleDef } = useAuth();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ question: string; result: AIQueryResult }[]>([]);

  // Assemble permission-scoped context strictly from authorized modules for the user's role
  const buildAuthorizedContext = () => {
    const allowed = roleDef.navAccess;
    return {
      machines: allowed.includes('machines') ? dataset.machines : [],
      productionRecords: allowed.includes('production') ? dataset.productionRecords : [],
      materials: allowed.includes('materials') ? dataset.materials : [],
      materialInspections: allowed.includes('materials') ? dataset.materialInspections : [],
      materialMovements: allowed.includes('materials') ? dataset.materialMovements : [],
      machineIncidents: allowed.includes('incidents') ? dataset.machineIncidents : [],
      electricalMaintenance: allowed.includes('electrical-maintenance') ? dataset.electricalMaintenance : [],
      mechanicalMaintenance: allowed.includes('mechanical-maintenance') ? dataset.mechanicalMaintenance : [],
      preventiveSchedules: allowed.includes('preventive-maintenance') ? dataset.preventiveSchedules : [],
      downtimeRecords: allowed.includes('downtime') ? dataset.downtimeRecords : [],
      qualityInspections: allowed.includes('quality-control') ? dataset.qualityInspections : [],
      shiftReports: allowed.includes('shift-reports') ? dataset.shiftReports : [],
      documents: allowed.includes('document-archive') ? dataset.documents : [],
    };
  };

  const askQuestion = async (qText: string) => {
    const trimmed = qText.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          factoryName: factory?.name || 'Factory Memory OS',
          userRole: roleDef.label,
          userName: member?.displayName || user?.displayName || 'Authorized Personnel',
          contextRecords: buildAuthorizedContext(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Factory Memory AI request failed.');
      }
      setHistory((prev) => [{ question: trimmed, result: data as AIQueryResult }, ...prev]);
      setQuestion('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to query Factory Memory AI.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Factory Memory AI"
        subtitle="Natural-language retrieval grounded strictly in authorized plant database records with full citation traceability."
      />

      <div className="bg-slate-900 text-slate-200 border border-slate-800 rounded-lg p-4 text-xs flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white">Operational Retrieval & Safety Boundary:</strong> Factory Memory AI searches only your authorized plant records, cites supporting record IDs and dates, never fabricates unrecorded events, and never diagnoses live electrical faults or issues machine-control commands.
        </div>
      </div>

      {/* Query Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          askQuestion(question);
        }}
        className="bg-white border border-slate-200 rounded-lg p-4 space-y-3"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about electrical faults, material batch measurements, machine downtime, or shift handovers..."
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Searching Records...' : 'Query Factory Memory'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              disabled={loading}
              onClick={() => askQuestion(q)}
              className="px-2.5 py-1 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors text-left"
            >
              {q}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {history.length === 0 && !loading && (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-2">
          <Bot className="w-8 h-8 text-blue-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-900">Ready to Query Factory Records</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Ask a natural-language question above or select one of the common plant floor prompts to retrieve verified records.
          </p>
        </div>
      )}

      {/* Results Stream */}
      <div className="space-y-5">
        {history.map((item, idx) => (
          <div key={idx} className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <div className="text-xs text-slate-500 font-medium">Question</div>
              <div className="text-base font-semibold text-slate-900 mt-0.5">{item.question}</div>
            </div>

            <div className="text-sm text-slate-800 leading-relaxed">{item.result.answer}</div>

            {item.result.safetyNotice && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                <strong>Safety Boundary:</strong> {item.result.safetyNotice}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                <div className="text-xs font-semibold text-slate-900">Recorded Facts (Database Grounded)</div>
                {item.result.recordedFacts.length === 0 ? (
                  <p className="text-xs text-slate-500">No matching recorded facts found.</p>
                ) : (
                  <ul className="space-y-1.5 text-xs text-slate-700 list-disc pl-4">
                    {item.result.recordedFacts.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                <div className="text-xs font-semibold text-slate-900">AI Analytical Observations</div>
                {item.result.analyticalObservations.length === 0 ? (
                  <p className="text-xs text-slate-500">No additional analytical observations.</p>
                ) : (
                  <ul className="space-y-1.5 text-xs text-slate-700 list-disc pl-4">
                    {item.result.analyticalObservations.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {item.result.citedRecords.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-blue-600" />
                  Supporting Database Record References
                </div>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {item.result.citedRecords.map((c, i) => (
                    <div key={i} className="px-3 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-slate-900 font-medium">
                        {c.module} · {c.recordId}
                      </span>
                      <span className="text-slate-600 flex-1 min-w-[200px]">{c.summary}</span>
                      <span className="font-mono text-slate-400 tabular-nums">{c.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {item.result.dataGaps.length > 0 && (
              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-200">
                <strong className="text-slate-700">Missing / Unrecorded Context:</strong>{' '}
                {item.result.dataGaps.join(' · ')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
