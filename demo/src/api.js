/**
 * TrustLayer API Client Layer
 * Exposes unified async functions that seamlessly attempt the live backend first
 * (if VITE_API_BASE_URL is provided) with a 4s timeout and silent fallback to the local engine.
 */

import {
  engineLogin,
  engineCreateSession,
  engineGetMessages,
  engineSendMessage,
  engineListApprovals,
  engineGetApproval,
  engineResolveApproval,
  engineGetSummary,
  engineGetTimeseries,
  engineGetTopDocuments,
  engineGetSecurityEvents,
} from './engine';

const BASE = import.meta.env.VITE_API_BASE_URL || '';

export const ENDPOINTS = {
  login: '/api/auth/login',
  createSession: '/api/chat/sessions',
  getMessages: (id) => `/api/chat/sessions/${id}/messages`,
  sendMessage: '/api/chat/message',
  listApprovals: (status) => `/api/approvals?status=${status || 'pending'}`,
  getApproval: (id) => `/api/approvals/${id}`,
  resolveApproval: (id) => `/api/approvals/${id}/resolve`,
  summary: (range) => `/api/analytics/summary?range=${range || '24h'}`,
  timeseries: (range) => `/api/analytics/timeseries?range=${range || '24h'}`,
  topDocuments: '/api/analytics/top-documents',
  securityEvents: '/api/analytics/security-events',
};

// Global debug listener for the ?debug=1 badge
let lastCallMode = 'local engine';
const debugListeners = new Set();

export function setDebugMode(mode) {
  lastCallMode = mode;
  debugListeners.forEach((fn) => fn(mode));
}

export function subscribeDebugMode(fn) {
  debugListeners.add(fn);
  fn(lastCallMode);
  return () => debugListeners.delete(fn);
}

// Response Normalization Helpers
export function normalizeLogin(data) {
  return {
    token: data.token || `tl_tok_${data.user?.username || 'user'}_${Date.now()}`,
    user: {
      id: data.user?.id || 'usr_unknown',
      name: data.user?.name || 'User',
      username: data.user?.username || 'user',
      role: (data.user?.role || 'customer').toLowerCase(),
    },
  };
}

export function normalizeSession(data) {
  return { session_id: data.session_id || data.id || 'sess_default' };
}

export function normalizeMessages(data) {
  if (!Array.isArray(data)) return [];
  return data.map((m) => ({
    id: m.id || `msg_${Math.random().toString(36).substring(2)}`,
    role: m.role || 'assistant',
    text: m.text || m.content || '',
    decision: (m.decision || '').toLowerCase() || undefined,
    request_id: m.request_id,
    status: (m.status || '').toLowerCase() || undefined,
    ts: m.ts || m.created_at || new Date().toISOString(),
  }));
}

export function normalizeMessageReply(data) {
  return {
    request_id: data.request_id || `req_${Date.now()}`,
    reply: data.reply || data.content || '',
    decision: (data.decision || 'allow').toLowerCase(),
    status: (data.status || 'allowed').toLowerCase(),
    action: data.action,
  };
}

export function normalizeApprovalsList(data) {
  if (!Array.isArray(data)) return [];
  return data.map((item) => ({
    request_id: item.request_id || item.id,
    customer: item.customer || item.user_name || 'Customer',
    action: item.action || item.proposed_action || { tool: 'unknown', params: {} },
    flag_reason: (item.flag_reason || 'both').toLowerCase(),
    ts: item.ts || item.created_at || new Date().toISOString(),
    resolution: item.resolution,
    approver: item.approver,
    resolved_ts: item.resolved_ts,
    note: item.note,
  }));
}

export function normalizeApprovalDetail(item) {
  return {
    request_id: item.request_id || item.id,
    customer: item.customer || 'Customer',
    original_request: item.original_request || item.query || '',
    claims: Array.isArray(item.claims)
      ? item.claims.map((c) => ({
          text: c.text || c.claim_text || '',
          verdict: (c.verdict || c.nli_label || 'supported').toLowerCase(),
          evidence: Array.isArray(c.evidence)
            ? c.evidence.map((e) => ({
                doc: e.doc || e.title || 'Knowledge Base Document',
                chunk: e.chunk || e.chunk_text || '',
                score: typeof e.score === 'number' ? e.score : 0.9,
              }))
            : [],
        }))
      : [],
    grounding_score: typeof item.grounding_score === 'number' ? item.grounding_score : 0.8,
    policy_risk: typeof item.policy_risk === 'number' ? item.policy_risk : 0.7,
    fused_score: typeof item.fused_score === 'number' ? item.fused_score : 0.75,
    rule_triggered: item.rule_triggered || 'Policy firewall restriction',
    proposed_action: item.proposed_action || item.action || { tool: 'action', params: {} },
    flag_reason: (item.flag_reason || 'both').toLowerCase(),
    ts: item.ts || new Date().toISOString(),
    resolution: item.resolution,
    approver: item.approver,
    resolved_ts: item.resolved_ts,
    note: item.note,
  };
}

export function normalizeSummary(data) {
  return {
    total: data.total ?? 0,
    pct_allow: data.pct_allow ?? 70,
    pct_block: data.pct_block ?? 18,
    pct_approve: data.pct_approve ?? 12,
    avg_grounding_score: data.avg_grounding_score ?? 0.81,
    avg_latency_ms: data.avg_latency_ms ?? 410,
  };
}

export function normalizeTimeseries(data) {
  if (!Array.isArray(data)) return [];
  return data.map((d) => ({
    bucket: d.bucket || d.timestamp || '',
    allow: d.allow ?? 0,
    block: d.block ?? 0,
    approve: d.approve ?? 0,
  }));
}

export function normalizeTopDocuments(data) {
  if (!Array.isArray(data)) return [];
  return data.map((d) => ({
    doc_id: d.doc_id || d.id || '',
    title: d.title || 'Document',
    count: d.count ?? 0,
  }));
}

export function normalizeSecurityEvents(data) {
  if (!Array.isArray(data)) return [];
  return data.map((e) => ({
    ts: e.ts || e.timestamp || new Date().toISOString(),
    event: (e.event || 'hard_deny').toLowerCase(),
    detail: e.detail || e.message || '',
    request_id: e.request_id,
  }));
}

// Fetch wrapper with 4-second timeout and bearer authorization
async function callBackend(endpoint, options = {}, token) {
  const url = `${BASE}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('tl_token') : null);
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// Dispatcher with silent fallback
async function execute({ callName, path, options, token, fallbackFn, normalizer }) {
  if (BASE) {
    try {
      const data = await callBackend(path, options, token);
      console.info(`[trustlayer] ${callName} via live`);
      setDebugMode('live');
      return normalizer ? normalizer(data) : data;
    } catch (err) {
      console.info(`[trustlayer] ${callName} via local (live backend unreachable: ${err.message})`);
      setDebugMode('local engine');
    }
  } else {
    console.info(`[trustlayer] ${callName} via local`);
    setDebugMode('local engine');
  }

  const fallbackData = await fallbackFn();
  return normalizer ? normalizer(fallbackData) : fallbackData;
}

// ----------------------------------------------------------------------
// EXPORTED API FUNCTIONS
// ----------------------------------------------------------------------

export async function login({ username, password }, token) {
  return execute({
    callName: 'login',
    path: ENDPOINTS.login,
    options: {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    },
    token,
    fallbackFn: () => engineLogin({ username, password }),
    normalizer: normalizeLogin,
  });
}

export async function createSession(token) {
  return execute({
    callName: 'createSession',
    path: ENDPOINTS.createSession,
    options: { method: 'POST' },
    token,
    fallbackFn: () => engineCreateSession(),
    normalizer: normalizeSession,
  });
}

export async function getMessages(sessionId, token) {
  return execute({
    callName: 'getMessages',
    path: ENDPOINTS.getMessages(sessionId),
    options: { method: 'GET' },
    token,
    fallbackFn: () => engineGetMessages(sessionId),
    normalizer: normalizeMessages,
  });
}

export async function sendMessage({ session_id, message }, token) {
  return execute({
    callName: 'sendMessage',
    path: ENDPOINTS.sendMessage,
    options: {
      method: 'POST',
      body: JSON.stringify({ session_id, message }),
    },
    token,
    fallbackFn: () => engineSendMessage({ session_id, message }),
    normalizer: normalizeMessageReply,
  });
}

export async function listApprovals(status = 'pending', token) {
  return execute({
    callName: 'listApprovals',
    path: ENDPOINTS.listApprovals(status),
    options: { method: 'GET' },
    token,
    fallbackFn: () => engineListApprovals(status),
    normalizer: normalizeApprovalsList,
  });
}

export async function getApproval(requestId, token) {
  return execute({
    callName: 'getApproval',
    path: ENDPOINTS.getApproval(requestId),
    options: { method: 'GET' },
    token,
    fallbackFn: () => engineGetApproval(requestId),
    normalizer: normalizeApprovalDetail,
  });
}

export async function resolveApproval(requestId, { resolution, note }, token) {
  return execute({
    callName: 'resolveApproval',
    path: ENDPOINTS.resolveApproval(requestId),
    options: {
      method: 'POST',
      body: JSON.stringify({ resolution, note }),
    },
    token,
    fallbackFn: () => engineResolveApproval(requestId, { resolution, note }),
  });
}

export async function getSummary(range = '24h', token) {
  return execute({
    callName: 'getSummary',
    path: ENDPOINTS.summary(range),
    options: { method: 'GET' },
    token,
    fallbackFn: () => engineGetSummary(range),
    normalizer: normalizeSummary,
  });
}

export async function getTimeseries(range = '24h', token) {
  return execute({
    callName: 'getTimeseries',
    path: ENDPOINTS.timeseries(range),
    options: { method: 'GET' },
    token,
    fallbackFn: () => engineGetTimeseries(range),
    normalizer: normalizeTimeseries,
  });
}

export async function getTopDocuments(token) {
  return execute({
    callName: 'getTopDocuments',
    path: ENDPOINTS.topDocuments,
    options: { method: 'GET' },
    token,
    fallbackFn: () => engineGetTopDocuments(),
    normalizer: normalizeTopDocuments,
  });
}

export async function getSecurityEvents(token) {
  return execute({
    callName: 'getSecurityEvents',
    path: ENDPOINTS.securityEvents,
    options: { method: 'GET' },
    token,
    fallbackFn: () => engineGetSecurityEvents(),
    normalizer: normalizeSecurityEvents,
  });
}
