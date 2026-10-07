import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  BarChart3,
  ShieldAlert,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  ShieldX,
  Zap,
  Activity,
  Layers,
  Info,
} from 'lucide-react';
import {
  getSummary,
  getTimeseries,
  getTopDocuments,
  getSecurityEvents,
} from '../api';
import { KpiCard, Spinner } from '../ui';

const numFormatter = new Intl.NumberFormat('en-IN');

export default function AdminDashboard({ token }) {
  const [range, setRange] = useState('7d'); // '24h' | '7d'
  const [summary, setSummary] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [topDocs, setTopDocs] = useState([]);
  const [secEvents, setSecEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [sumRes, timeRes, docRes, secRes] = await Promise.all([
        getSummary(range, token),
        getTimeseries(range, token),
        getTopDocuments(token),
        getSecurityEvents(token),
      ]);
      setSummary(sumRes);
      setTimeseries(timeRes);
      setTopDocs(docRes);
      setSecEvents(secRes);
    } catch (err) {
      console.error('Failed fetching analytics dashboard data:', err);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(false);
  }, [range, token]);

  // Polling every 5s per spec
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [range, token]);

  // Degraded mode counts
  const degradedEvents = (secEvents || []).filter(
    (e) => e.event === 'grounding_unavailable' || e.event === 'policy_engine_error'
  );
  const groundingUnavailableCount = degradedEvents.filter(
    (e) => e.event === 'grounding_unavailable'
  ).length;
  const policyErrorCount = degradedEvents.filter(
    (e) => e.event === 'policy_engine_error'
  ).length;

  const maxDocCount = topDocs.length > 0 ? Math.max(...topDocs.map((d) => d.count)) : 1;

  return (
    <div className="space-y-8 pb-10">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-slate-900 tracking-tight">
            Security & Grounding Firewall Telemetry
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time multi-branch verification metrics, access-aware RAG, and policy interception
          </p>
        </div>

        {/* Range Selector Toggle */}
        <div className="flex items-center bg-slate-200/80 p-1 rounded-xl">
          <button
            onClick={() => setRange('24h')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              range === '24h'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Past 24 Hours
          </button>
          <button
            onClick={() => setRange('7d')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              range === '7d'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Past 7 Days
          </button>
        </div>
      </div>

      {/* Prominent Degraded-Mode Card */}
      <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-5 shadow-xs">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-base font-bold text-amber-950">
                  Degraded-Mode Fallback Monitor
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Active Safe-Fail Protocol
                </span>
              </div>
              <p className="text-xs text-amber-900/80 mt-1">
                Conservative fallback rule: Money-moving actions are forced to senior approval; policy engine errors fail-closed and are strictly blocked.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-white/80 border border-amber-200 rounded-xl px-4 py-2 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                Grounding Unavailable
              </div>
              <div className="font-serif text-xl font-bold text-amber-950">
                {groundingUnavailableCount}
              </div>
            </div>
            <div className="bg-white/80 border border-amber-200 rounded-xl px-4 py-2 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                Policy Engine Faults
              </div>
              <div className="font-serif text-xl font-bold text-amber-950">
                {policyErrorCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top-Level KPI Row */}
      {loading && !summary ? (
        <div className="py-12 flex justify-center items-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard
            title="Total Requests"
            value={numFormatter.format(summary?.total || 0)}
            subtext={`${range === '24h' ? 'Last 24 hours' : '7-day total'}`}
            accentColor="blue"
            icon={Activity}
          />
          <KpiCard
            title="Allowed"
            value={`${summary?.pct_allow || 0}%`}
            subtext="Grounded & compliant"
            accentColor="green"
            icon={CheckCircle}
          />
          <KpiCard
            title="Blocked"
            value={`${summary?.pct_block || 0}%`}
            subtext="Firewall intercepted"
            accentColor="red"
            icon={ShieldX}
          />
          <KpiCard
            title="Approved"
            value={`${summary?.pct_approve || 0}%`}
            subtext="Escalated to human review"
            accentColor="amber"
            icon={Clock}
          />
          <KpiCard
            title="Avg Grounding"
            value={(summary?.avg_grounding_score || 0).toFixed(2)}
            subtext="NLI evidence confidence"
            accentColor="purple"
            icon={Zap}
          />
          <KpiCard
            title="Avg Latency"
            value={`${summary?.avg_latency_ms || 0} ms`}
            subtext="End-to-end interception"
            accentColor="blue"
            icon={BarChart3}
          />
        </div>
      )}

      {/* Stacked Bar Chart: Decision Volume Over Time */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-serif text-lg font-bold text-slate-900">
              Interception Decisions Over Time
            </h3>
            <p className="text-xs text-slate-500">
              Stacked distribution of Allow (green), Block (red), and Approve (amber) determinations
            </p>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="bucket" tick={{ fontSize: 12, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                iconType="circle"
              />
              <Bar dataKey="allow" name="Allowed" stackId="a" fill="#059669" radius={[0, 0, 0, 0]} />
              <Bar dataKey="block" name="Blocked" stackId="a" fill="#DC2626" radius={[0, 0, 0, 0]} />
              <Bar dataKey="approve" name="Needs Approval" stackId="a" fill="#D97706" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Table 1: Most-Retrieved Knowledge Base Documents */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col">
          <div className="mb-4">
            <h3 className="font-serif text-base font-bold text-slate-900">
              Most-Retrieved Knowledge Documents
            </h3>
            <p className="text-xs text-slate-500">
              Retrieval frequency surfaces core policy demand and knowledge coverage gaps
            </p>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Document Title</th>
                  <th className="pb-3 text-right">Retrievals</th>
                  <th className="pb-3 pl-4 w-32">Relative Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topDocs.map((doc) => {
                  const pct = Math.round((doc.count / maxDocCount) * 100);
                  return (
                    <tr key={doc.doc_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 font-medium text-slate-800 pr-2">
                        {doc.title}
                      </td>
                      <td className="py-3 text-right font-mono font-semibold text-slate-700">
                        {numFormatter.format(doc.count)}
                      </td>
                      <td className="py-3 pl-4">
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Security Events & Anomaly Audit Log */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col">
          <div className="mb-4">
            <h3 className="font-serif text-base font-bold text-slate-900">
              Security Events & Anomaly Log
            </h3>
            <p className="text-xs text-slate-500">
              Sequence anomalies, adversarial prompt blocks, and fallback activations
            </p>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Event Type</th>
                  <th className="pb-3">Detail</th>
                  <th className="pb-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {secEvents.slice(0, 7).map((ev, i) => {
                  const eventChip = {
                    hard_deny: 'bg-red-50 text-red-700 border-red-200',
                    sequence_anomaly: 'bg-purple-50 text-purple-700 border-purple-200',
                    grounding_unavailable: 'bg-amber-50 text-amber-700 border-amber-200',
                    policy_engine_error: 'bg-red-50 text-red-800 border-red-300 font-bold',
                  }[ev.event] || 'bg-slate-100 text-slate-700 border-slate-200';

                  return (
                    <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 pr-2">
                        <span className={`inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${eventChip}`}>
                          {ev.event.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 text-slate-700 font-medium max-w-xs truncate pr-2">
                        <span title={ev.detail}>{ev.detail}</span>
                        {ev.request_id && (
                          <div className="text-[10px] font-mono text-slate-400">
                            {ev.request_id}
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-right font-mono text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(ev.ts).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
