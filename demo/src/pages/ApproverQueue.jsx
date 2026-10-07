import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  User,
  ArrowRight,
  Send,
  Check,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';
import { listApprovals, getApproval, resolveApproval } from '../api';
import { DecisionBadge, ScoreBar, Modal, Spinner } from '../ui';

// Helper for relative timestamps
function formatRelativeTime(isoString) {
  if (!isoString) return '';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export default function ApproverQueue({ token }) {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'resolved'
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null });
  const [resolving, setResolving] = useState(false);

  // Fetch queue list
  const fetchQueue = async (quiet = false) => {
    if (!quiet) setLoadingList(true);
    try {
      const data = await listApprovals(activeTab, token);
      setItems(data || []);
      // If nothing selected or selection not in items, select first item
      if (data && data.length > 0) {
        if (!selectedId || !data.some((i) => i.request_id === selectedId)) {
          setSelectedId(data[0].request_id);
        }
      } else {
        setSelectedId(null);
        setSelectedDetail(null);
      }
    } catch (err) {
      console.error('Failed to list approvals:', err);
    } finally {
      if (!quiet) setLoadingList(false);
    }
  };

  // Initial and tab change fetch
  useEffect(() => {
    fetchQueue(false);
  }, [activeTab, token]);

  // Live polling every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchQueue(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [activeTab, selectedId, token]);

  // Fetch detail whenever selectedId changes
  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null);
      return;
    }

    let active = true;
    async function fetchDetail() {
      setLoadingDetail(true);
      try {
        const detail = await getApproval(selectedId, token);
        if (active) {
          setSelectedDetail(detail);
          setReviewNote(detail.note || '');
        }
      } catch (err) {
        console.error('Failed fetching approval detail:', err);
      } finally {
        if (active) setLoadingDetail(false);
      }
    }

    fetchDetail();
    return () => {
      active = false;
    };
  }, [selectedId, token]);

  // Trigger resolution
  const handleConfirmResolve = async () => {
    if (!selectedId || !confirmModal.action || resolving) return;
    setResolving(true);

    try {
      await resolveApproval(
        selectedId,
        {
          resolution: confirmModal.action,
          note: reviewNote,
        },
        token
      );

      setConfirmModal({ isOpen: false, action: null });
      setReviewNote('');
      // Refresh list
      await fetchQueue(false);
    } catch (err) {
      console.error('Error resolving request:', err);
    } finally {
      setResolving(false);
    }
  };

  const getReasonBadge = (reason) => {
    const r = (reason || '').toLowerCase();
    if (r === 'grounding') {
      return (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          Grounding
        </span>
      );
    }
    if (r === 'policy') {
      return (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
          Policy
        </span>
      );
    }
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
        Grounding & Policy
      </span>
    );
  };

  return (
    <div className="flex h-[calc(100vh-8.5rem)] bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Left Pane: Queue List */}
      <div className="w-80 lg:w-96 border-r border-slate-200 flex flex-col shrink-0 bg-slate-50/50">
        {/* Tabs Bar */}
        <div className="p-3 border-b border-slate-200 flex gap-2 bg-white">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending</span>
            {activeTab === 'pending' && (
              <span className="bg-amber-600/40 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                {items.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('resolved')}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'resolved'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Resolved</span>
            {activeTab === 'resolved' && (
              <span className="bg-blue-700/40 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                {items.length}
              </span>
            )}
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loadingList && items.length === 0 ? (
            <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
              <Spinner size="md" />
              <span className="text-xs">Loading queue items...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-slate-400 space-y-2">
              <CheckCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-medium text-slate-600">No {activeTab} actions</p>
              <p className="text-xs text-slate-400">
                {activeTab === 'pending'
                  ? 'All flagged requests have been reviewed.'
                  : 'Resolved request records will appear here.'}
              </p>
            </div>
          ) : (
            items.map((item) => {
              const isSelected = item.request_id === selectedId;
              const toolName = item.action?.tool || 'action_request';

              return (
                <div
                  key={item.request_id}
                  onClick={() => setSelectedId(item.request_id)}
                  className={`p-4 transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-white shadow-xs border-l-4 border-l-blue-600'
                      : 'hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {item.customer}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {formatRelativeTime(item.ts)}
                    </span>
                  </div>

                  <div className="text-xs font-mono text-blue-700 mb-2 truncate">
                    {toolName}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {getReasonBadge(item.flag_reason)}
                    {item.resolution && (
                      <DecisionBadge decision={item.resolution} status={item.resolution} size="sm" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Selected Detail View */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {loadingDetail ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
            <Spinner size="lg" />
            <span className="text-xs">Loading inspection telemetry...</span>
          </div>
        ) : !selectedDetail ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center space-y-2">
            <Layers className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-base font-serif text-slate-700">Select a request to inspect</p>
            <p className="text-xs text-slate-400 max-w-sm">
              Review natural language claims, grounded evidence chunks, RBAC policy checks, and risk metrics.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            {/* Header / Meta Card */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-serif text-xl font-bold text-slate-900">
                    {selectedDetail.customer}
                  </h2>
                  <span className="text-xs font-mono text-slate-400">
                    ID: {selectedDetail.request_id}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Received {new Date(selectedDetail.ts).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {selectedDetail.resolution ? (
                  <div className="text-right">
                    <DecisionBadge
                      decision={selectedDetail.resolution}
                      status={selectedDetail.resolution}
                      size="lg"
                    />
                    <div className="text-[11px] text-slate-400 mt-1">
                      By {selectedDetail.approver} • {formatRelativeTime(selectedDetail.resolved_ts)}
                    </div>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock className="w-3.5 h-3.5" />
                    Pending Risk Review
                  </span>
                )}
              </div>
            </div>

            {/* Original Customer Request */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Original Customer Request
              </div>
              <p className="text-sm text-slate-800 font-medium italic">
                "{selectedDetail.original_request}"
              </p>
            </div>

            {/* Scores & Metrics Grid */}
            <div className="grid grid-cols-3 gap-4">
              {/* Grounding Score */}
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 flex flex-col justify-between">
                <ScoreBar
                  label="Grounding Score"
                  value={selectedDetail.grounding_score}
                  type="grounding"
                />
                <span className="text-[11px] text-emerald-800 mt-2 font-medium">
                  {selectedDetail.grounding_score >= 0.75
                    ? 'Strong evidence support'
                    : 'Weak or contradictory evidence'}
                </span>
              </div>

              {/* Policy Risk */}
              <div className="bg-red-50/50 border border-red-200 rounded-xl p-4 flex flex-col justify-between">
                <ScoreBar
                  label="Policy Risk"
                  value={selectedDetail.policy_risk}
                  type="policy"
                />
                <span className="text-[11px] text-red-800 mt-2 font-medium">
                  {selectedDetail.policy_risk >= 0.7
                    ? 'High privilege threshold'
                    : 'Acceptable risk level'}
                </span>
              </div>

              {/* Fused Risk Engine */}
              <div className="bg-purple-50/50 border border-purple-200 rounded-xl p-4 flex flex-col justify-between">
                <ScoreBar
                  label="Fused Decision Score"
                  value={selectedDetail.fused_score}
                  type="fused"
                />
                <span className="text-[11px] text-purple-800 mt-2 font-medium">
                  Dual-branch consensus score
                </span>
              </div>
            </div>

            {/* Policy Rule That Triggered */}
            <div className="bg-red-50/30 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-800 mb-1">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                Security Rule Triggered
              </div>
              <p className="text-sm font-medium text-red-950 font-mono">
                {selectedDetail.rule_triggered}
              </p>
            </div>

            {/* Claims & Retrieved Evidence */}
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Extracted Claims & Knowledge Evidence
              </div>

              {selectedDetail.claims.length === 0 ? (
                <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500">
                  No discrete factual claims extracted for this action.
                </div>
              ) : (
                selectedDetail.claims.map((claim, idx) => {
                  const verdictStyles = {
                    supported: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    contradicted: 'bg-red-50 text-red-700 border-red-200',
                    unverifiable: 'bg-amber-50 text-amber-700 border-amber-200',
                  }[claim.verdict] || 'bg-slate-100 text-slate-700 border-slate-200';

                  return (
                    <div
                      key={idx}
                      className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm text-slate-800 font-medium">
                          {claim.text}
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${verdictStyles}`}
                        >
                          {claim.verdict}
                        </span>
                      </div>

                      {/* Evidence Chunks */}
                      {claim.evidence && claim.evidence.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <span className="text-[11px] font-semibold text-slate-400">
                            Knowledge Base Citations:
                          </span>
                          {claim.evidence.map((ev, eIdx) => (
                            <div
                              key={eIdx}
                              className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between text-slate-600 font-medium">
                                <span className="text-blue-700 font-semibold">{ev.doc}</span>
                                <span className="font-mono text-[10px] text-slate-400">
                                  Confidence: {(ev.score * 100).toFixed(0)}%
                                </span>
                              </div>
                              <p className="text-slate-600 italic">"{ev.chunk}"</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Proposed Action & Parameters */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Proposed Tool Execution
              </div>
              <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-xs overflow-x-auto">
                <div className="text-emerald-400 font-bold mb-1">
                  Tool: {selectedDetail.proposed_action?.tool}
                </div>
                <pre>{JSON.stringify(selectedDetail.proposed_action?.params || {}, null, 2)}</pre>
              </div>
            </div>

            {/* Note & Action Buttons for Pending Items */}
            {!selectedDetail.resolution ? (
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Approver Note (Optional for audit ledger)
                  </label>
                  <textarea
                    rows={2}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Enter reason or compliance verification note..."
                    className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-800"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setConfirmModal({ isOpen: true, action: 'approve' })}
                    className="flex-1 py-3 px-4 bg-[#059669] hover:bg-emerald-700 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Approve & Execute Tool</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmModal({ isOpen: true, action: 'deny' })}
                    className="flex-1 py-3 px-4 bg-[#DC2626] hover:bg-red-700 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Deny Action</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Resolved Audit Box */
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <span className="font-semibold text-slate-700">Audit Trail:</span>
                <p className="text-slate-600">
                  Resolved as <span className="font-bold uppercase">{selectedDetail.resolution}</span> by{' '}
                  <span className="font-semibold">{selectedDetail.approver}</span> on{' '}
                  {new Date(selectedDetail.resolved_ts).toLocaleString()}.
                </p>
                {selectedDetail.note && (
                  <p className="text-slate-500 italic mt-1">Note: "{selectedDetail.note}"</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, action: null })}
        title={`Confirm ${confirmModal.action === 'approve' ? 'Approval' : 'Denial'}`}
        footer={
          <>
            <button
              onClick={() => setConfirmModal({ isOpen: false, action: null })}
              disabled={resolving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmResolve}
              disabled={resolving}
              className={`px-4 py-2 text-xs font-semibold text-white rounded-lg flex items-center gap-2 cursor-pointer ${
                confirmModal.action === 'approve'
                  ? 'bg-[#059669] hover:bg-emerald-700'
                  : 'bg-[#DC2626] hover:bg-red-700'
              }`}
            >
              {resolving && <Spinner size="sm" className="text-white" />}
              <span>
                Confirm {confirmModal.action === 'approve' ? 'Approval' : 'Denial'}
              </span>
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          Are you sure you want to{' '}
          <strong className="text-slate-900">{confirmModal.action}</strong> this request for{' '}
          <strong>{selectedDetail?.customer}</strong>?
        </p>
        <p className="text-xs text-slate-500">
          {confirmModal.action === 'approve'
            ? 'This will immediately execute the proposed tool against the banking ledger and notify the customer.'
            : 'This will reject the tool execution and send a safe decline notification to the customer.'}
        </p>
      </Modal>
    </div>
  );
}
