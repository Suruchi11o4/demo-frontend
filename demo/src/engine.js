/**
 * TrustLayer In-Memory Local Engine
 * Implements the full contract with state persistence in localStorage ('tl_state')
 * and cross-tab synchronization via BroadcastChannel('tl').
 */

const STORAGE_KEY = 'tl_state';
const bc = typeof window !== 'undefined' && window.BroadcastChannel ? new BroadcastChannel('tl') : null;

// Seeded Users
export const SEEDED_USERS = [
  { id: 'usr_aarav', username: 'aarav', name: 'Aarav Mehta', role: 'customer', password: 'trustlayer' },
  { id: 'usr_priya', username: 'priya', name: 'Priya Nair', role: 'approver', password: 'trustlayer' },
  { id: 'usr_rohan', username: 'rohan', name: 'Rohan Kulkarni', role: 'admin', password: 'trustlayer' },
];

export const SEEDED_ACCOUNTS = {
  savingsBalance: 48250.0,
  creditCardLimit: 100000.0,
  creditCardLateFee: 500.0,
};

// Seed initial state
function createInitialState() {
  const now = Date.now();
  const dayMs = 86400000;

  // Preload 3 pending approvals
  const pendingApprovals = [
    {
      request_id: 'req_app_101',
      customer: 'Aarav Mehta',
      original_request: 'Please waive my ₹500 late fee on the platinum card.',
      action: { tool: 'waive_fee', params: { fee_type: 'late_payment', amount: 500, account_id: 'cc_9921' } },
      proposed_action: { tool: 'waive_fee', params: { fee_type: 'late_payment', amount: 500, account_id: 'cc_9921' } },
      flag_reason: 'both',
      claims: [
        {
          text: 'Customer has had zero late fees in the preceding 12 calendar months.',
          verdict: 'supported',
          evidence: [
            { doc: 'Fee Policy §4.2', chunk: 'One-time waiver eligible if customer maintained prompt payment record for previous 12 months.', score: 0.94 }
          ]
        },
        {
          text: 'Late fee reversal can be executed automatically by customer support.',
          verdict: 'contradicted',
          evidence: [
            { doc: 'Fee Policy §4.2', chunk: 'Fee reversals over ₹250 require dual authorization from a senior approver.', score: 0.91 }
          ]
        }
      ],
      grounding_score: 0.88,
      policy_risk: 0.74,
      fused_score: 0.79,
      rule_triggered: 'RBAC: customer role cannot call waive_fee directly without secondary staff authorization.',
      ts: new Date(now - 14 * 60000).toISOString(),
    },
    {
      request_id: 'req_app_102',
      customer: 'Pooja Verma',
      original_request: 'Transfer ₹65,000 to beneficiary HDFC0001234 account 501004291881.',
      action: { tool: 'transfer_funds', params: { recipient: 'Neha Sharma', amount: 65000, ifsc: 'HDFC0001234' } },
      proposed_action: { tool: 'transfer_funds', params: { recipient: 'Neha Sharma', amount: 65000, ifsc: 'HDFC0001234' } },
      flag_reason: 'policy',
      claims: [
        {
          text: 'Account daily outbound limit is sufficient for ₹65,000 transfer.',
          verdict: 'supported',
          evidence: [
            { doc: 'Transfer Limits & Routing §2.1', chunk: 'Daily retail transfer ceiling is ₹1,00,000 per verified customer account.', score: 0.96 }
          ]
        }
      ],
      grounding_score: 0.92,
      policy_risk: 0.85,
      fused_score: 0.82,
      rule_triggered: 'Transaction Limit: Automated outbound transfers exceeding ₹50,000 mandate approver verification.',
      ts: new Date(now - 42 * 60000).toISOString(),
    },
    {
      request_id: 'req_app_103',
      customer: 'Sunil Rao',
      original_request: 'Increase my credit limit from ₹1,00,000 to ₹1,50,000 based on my recent income slip.',
      action: { tool: 'increase_credit_limit', params: { card_id: 'cc_4412', current_limit: 100000, requested_limit: 150000 } },
      proposed_action: { tool: 'increase_credit_limit', params: { card_id: 'cc_4412', current_limit: 100000, requested_limit: 150000 } },
      flag_reason: 'grounding',
      claims: [
        {
          text: 'Income slip document has been verified against IT return database.',
          verdict: 'unverifiable',
          evidence: [
            { doc: 'KYC & Underwriting Guidelines §6', chunk: 'Income document verification requires manual inspection or authenticated NSDL API callback.', score: 0.62 }
          ]
        }
      ],
      grounding_score: 0.58,
      policy_risk: 0.60,
      fused_score: 0.65,
      rule_triggered: 'Grounding Verification: Unverifiable underwriting proof requires human risk officer sign-off.',
      ts: new Date(now - 75 * 60000).toISOString(),
    }
  ];

  // Preload 5 resolved approvals
  const resolvedApprovals = [
    {
      request_id: 'req_app_091',
      customer: 'Aarav Mehta',
      original_request: 'Request statement certification for home loan verification.',
      action: { tool: 'issue_certified_statement', params: { period: 'FY2025-26', stamp: true } },
      proposed_action: { tool: 'issue_certified_statement', params: { period: 'FY2025-26', stamp: true } },
      flag_reason: 'policy',
      claims: [
        {
          text: 'Digital stamp issuance permitted for verified KYC accounts.',
          verdict: 'supported',
          evidence: [{ doc: 'Card Services FAQ', chunk: 'Statements can be certified digitally upon two-factor verification.', score: 0.95 }]
        }
      ],
      grounding_score: 0.94,
      policy_risk: 0.45,
      fused_score: 0.52,
      rule_triggered: 'Privileged tool: Digital seal issuance requires staff verification.',
      ts: new Date(now - 3 * 3600000).toISOString(),
      resolution: 'approve',
      approver: 'Priya Nair',
      resolved_ts: new Date(now - 2.8 * 3600000).toISOString(),
      note: 'Verified customer KYC status and tax ID match.',
    },
    {
      request_id: 'req_app_090',
      customer: 'Deepak Joshi',
      original_request: 'Immediate wire transfer ₹80,000 to international vendor.',
      action: { tool: 'wire_transfer_outbound', params: { amount: 80000, swift: 'CHASUS33' } },
      proposed_action: { tool: 'wire_transfer_outbound', params: { amount: 80000, swift: 'CHASUS33' } },
      flag_reason: 'both',
      claims: [
        {
          text: 'International wire recipient is on pre-approved vendor list.',
          verdict: 'contradicted',
          evidence: [{ doc: 'Transfer Limits & Routing §2.1', chunk: 'Unregistered foreign outward remittances require in-person branch clearance.', score: 0.92 }]
        }
      ],
      grounding_score: 0.42,
      policy_risk: 0.92,
      fused_score: 0.91,
      rule_triggered: 'Anti-fraud policy: Unregistered international beneficiary exceeded safety score threshold.',
      ts: new Date(now - 6 * 3600000).toISOString(),
      resolution: 'deny',
      approver: 'Priya Nair',
      resolved_ts: new Date(now - 5.5 * 3600000).toISOString(),
      note: 'Recipient SWIFT code not in approved corporate ledger. Branch verification required.',
    },
    {
      request_id: 'req_app_089',
      customer: 'Ananya Deshmukh',
      original_request: 'Waive annual card maintenance fee of ₹750.',
      action: { tool: 'waive_fee', params: { amount: 750, fee_type: 'annual_maintenance' } },
      proposed_action: { tool: 'waive_fee', params: { amount: 750, fee_type: 'annual_maintenance' } },
      flag_reason: 'policy',
      claims: [
        {
          text: 'Spend volume exceeded ₹1,50,000 annual waiver threshold.',
          verdict: 'supported',
          evidence: [{ doc: 'Fee Policy §4.2', chunk: 'Annual maintenance fee waived if cumulative spend in card year exceeds ₹1,20,000.', score: 0.98 }]
        }
      ],
      grounding_score: 0.97,
      policy_risk: 0.35,
      fused_score: 0.41,
      rule_triggered: 'RBAC: Fee reversal escalation rule.',
      ts: new Date(now - 12 * 3600000).toISOString(),
      resolution: 'approve',
      approver: 'Priya Nair',
      resolved_ts: new Date(now - 11.5 * 3600000).toISOString(),
      note: 'Annual card spend of ₹1,82,000 meets qualifying threshold.',
    },
    {
      request_id: 'req_app_088',
      customer: 'Vikram Seth',
      original_request: 'Close savings account and remit remaining balance to third-party wallet.',
      action: { tool: 'close_account', params: { account_id: 'sa_1190', destination: 'wallet_upi' } },
      proposed_action: { tool: 'close_account', params: { account_id: 'sa_1190', destination: 'wallet_upi' } },
      flag_reason: 'both',
      claims: [
        {
          text: 'Account has zero pending liens or recurring ECS debits.',
          verdict: 'contradicted',
          evidence: [{ doc: 'Account Closure & Lien Rules', chunk: 'Accounts with active NACH mandate cannot be terminated via digital self-service.', score: 0.93 }]
        }
      ],
      grounding_score: 0.35,
      policy_risk: 0.88,
      fused_score: 0.89,
      rule_triggered: 'Hard Policy: Account closure with active recurring mandates blocked.',
      ts: new Date(now - 22 * 3600000).toISOString(),
      resolution: 'deny',
      approver: 'Priya Nair',
      resolved_ts: new Date(now - 21 * 3600000).toISOString(),
      note: 'Active mutual fund SIP NACH mandate found. Customer must cancel mandate first.',
    },
    {
      request_id: 'req_app_087',
      customer: 'Meera Sen',
      original_request: 'Temporary limit enhancement of ₹40,000 for medical emergency.',
      action: { tool: 'temporary_limit_boost', params: { amount: 40000, days: 30 } },
      proposed_action: { tool: 'temporary_limit_boost', params: { amount: 40000, days: 30 } },
      flag_reason: 'policy',
      claims: [
        {
          text: 'Customer has clean 3-year repayment record and CIBIL score above 780.',
          verdict: 'supported',
          evidence: [{ doc: 'Card Services FAQ', chunk: 'Emergency temporary limit enhancement permitted for accounts in good standing.', score: 0.95 }]
        }
      ],
      grounding_score: 0.91,
      policy_risk: 0.40,
      fused_score: 0.46,
      rule_triggered: 'Privileged tool: Temporary credit enhancements require managerial sign-off.',
      ts: new Date(now - 28 * 3600000).toISOString(),
      resolution: 'approve',
      approver: 'Priya Nair',
      resolved_ts: new Date(now - 27 * 3600000).toISOString(),
      note: 'Emergency temporary credit sanctioned for 30 days.',
    }
  ];

  // Seed initial customer session
  const defaultSessionId = 'sess_aarav_default';
  const chatSessions = {
    [defaultSessionId]: {
      id: defaultSessionId,
      user_id: 'usr_aarav',
      messages: [
        {
          id: 'msg_init_1',
          role: 'assistant',
          text: 'Hello Aarav! I am your TrustLayer-secured Banking Support Assistant. How can I assist you with your accounts, transfers, or card services today?',
          decision: 'allow',
          status: 'allowed',
          ts: new Date(now - 5 * 60000).toISOString(),
        }
      ]
    }
  };

  // Seed top retrieved documents
  const topDocuments = [
    { doc_id: 'doc_fee_4_2', title: 'Fee Policy §4.2 — Reversals & Late Charges', count: 342 },
    { doc_id: 'doc_card_faq', title: 'Card Services FAQ & Limit Modifications', count: 289 },
    { doc_id: 'doc_tx_limits', title: 'Transfer Limits & RTGS/NEFT Routing §2.1', count: 215 },
    { doc_id: 'doc_kyc_underwriting', title: 'KYC Verification & Risk Underwriting Guidelines', count: 178 },
    { doc_id: 'doc_account_lien', title: 'Account Closure & Statutory Lien Enforcement Rules', count: 94 },
    { doc_id: 'doc_intl_wire', title: 'FEMA & Outward Remittance Guidelines §3.4', count: 66 },
  ];

  // Seed security events
  const securityEvents = [
    {
      ts: new Date(now - 12 * 60000).toISOString(),
      event: 'hard_deny',
      detail: 'Prompt injection pattern intercepted: adversarial prompt override ("ignore previous rules").',
      request_id: 'req_sec_801',
    },
    {
      ts: new Date(now - 54 * 60000).toISOString(),
      event: 'sequence_anomaly',
      detail: 'State transition anomaly: unauthenticated high-volume debit sequence attempted before PIN verification.',
      request_id: 'req_sec_799',
    },
    {
      ts: new Date(now - 2.4 * 3600000).toISOString(),
      event: 'grounding_unavailable',
      detail: 'Vector retriever latency spike > 4000ms. Conservative fallback triggered for sensitive tool execution.',
      request_id: 'req_sec_782',
    },
    {
      ts: new Date(now - 5.1 * 3600000).toISOString(),
      event: 'hard_deny',
      detail: 'Privileged tool escalation blocked: unauthorized customer session attempted "bypass_mfa_token".',
      request_id: 'req_sec_765',
    },
    {
      ts: new Date(now - 9.8 * 3600000).toISOString(),
      event: 'policy_engine_error',
      detail: 'Policy rule parser timeout. Fail-closed safeguard enforced; action blocked automatically.',
      request_id: 'req_sec_741',
    },
    {
      ts: new Date(now - 16.5 * 3600000).toISOString(),
      event: 'sequence_anomaly',
      detail: 'Rapid beneficiary creation immediately followed by max-ceiling transfer attempt.',
      request_id: 'req_sec_712',
    },
    {
      ts: new Date(now - 24 * 3600000).toISOString(),
      event: 'grounding_unavailable',
      detail: 'Embedding service connection pool reset. Conservative fallback triggered; money-moving action escalated.',
      request_id: 'req_sec_690',
    },
  ];

  // 7-day seeded baseline analytics (~1,284 requests, ~71% allow, 17% block, 12% approve)
  const baseline = {
    totalRequests: 1284,
    allowCount: 912, // 71%
    blockCount: 218, // 17%
    approveCount: 154, // 12%
    avgGroundingScore: 0.81,
    avgLatencyMs: 410,
  };

  return {
    version: 1,
    sessions: chatSessions,
    approvals: [...pendingApprovals, ...resolvedApprovals],
    topDocuments,
    securityEvents,
    baseline,
  };
}

// Load or initialize state
export function getState() {
  if (typeof window === 'undefined') return createInitialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed reading tl_state from localStorage:', err);
    return createInitialState();
  }
}

export function saveState(state) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (bc) {
      bc.postMessage({ type: 'STATE_UPDATED', timestamp: Date.now() });
    }
  } catch (err) {
    console.error('Failed saving tl_state to localStorage:', err);
  }
}

// Subscribe to state changes from other tabs
export function subscribeToEngine(callback) {
  if (!bc) return () => {};
  const handler = (event) => {
    if (event.data?.type === 'STATE_UPDATED') {
      callback();
    }
  };
  bc.addEventListener('message', handler);
  return () => {
    bc.removeEventListener('message', handler);
  };
}

// Artificial latency helper (300 to 900 ms)
function delay(min = 320, max = 650) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ----------------------------------------------------------------------
// ENGINE ENDPOINT IMPLEMENTATIONS (Contract exact)
// ----------------------------------------------------------------------

export async function engineLogin({ username, password }) {
  await delay(250, 450);
  const user = SEEDED_USERS.find(
    (u) => u.username.toLowerCase() === (username || '').trim().toLowerCase()
  );

  if (!user || (password && password !== 'trustlayer')) {
    const err = new Error('Invalid credentials. Password is "trustlayer" for all accounts.');
    err.status = 401;
    throw err;
  }

  const token = `tl_tok_${user.username}_${Date.now()}`;
  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    },
  };
}

export async function engineCreateSession() {
  await delay(150, 300);
  const state = getState();
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  state.sessions[sessionId] = {
    id: sessionId,
    user_id: 'usr_aarav',
    messages: [
      {
        id: `msg_init_${Date.now()}`,
        role: 'assistant',
        text: 'Hello Aarav! I am your TrustLayer-secured Banking Support Assistant. How can I assist you with your accounts, transfers, or card services today?',
        decision: 'allow',
        status: 'allowed',
        ts: new Date().toISOString(),
      }
    ],
  };
  saveState(state);
  return { session_id: sessionId };
}

export async function engineGetMessages(sessionId) {
  await delay(150, 280);
  const state = getState();
  const session = state.sessions[sessionId] || state.sessions['sess_aarav_default'];
  if (!session) {
    return [];
  }
  return session.messages || [];
}

let readOnlyCallCounter = 0;

export async function engineSendMessage({ session_id, message }) {
  await delay(400, 750);
  const state = getState();
  let session = state.sessions[session_id];
  if (!session) {
    session = state.sessions['sess_aarav_default'];
  }
  if (!session) {
    session = { id: session_id, user_id: 'usr_aarav', messages: [] };
    state.sessions[session_id] = session;
  }

  const userMsgId = `msg_u_${Date.now()}`;
  const nowIso = new Date().toISOString();

  // Record customer message
  session.messages.push({
    id: userMsgId,
    role: 'user',
    text: message,
    ts: nowIso,
  });

  const lower = (message || '').toLowerCase();
  const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // Rule 1: Injection or hard deny -> BLOCK
  // Triggers: "ignore (all |your |previous )?(instructions|rules)", "system prompt", "act as admin", "transfer all", "reveal", "bypass"
  const injectionRegex = /(ignore\s+(all\s+|your\s+|previous\s+)?(instructions|rules)|system\s*prompt|act\s+as\s+admin|transfer\s+all|reveal|bypass)/i;
  
  if (injectionRegex.test(lower)) {
    const replyText = "I can't complete that action. Please contact support for help.";
    const asstMsg = {
      id: `msg_a_${Date.now()}`,
      role: 'assistant',
      text: replyText,
      decision: 'block',
      status: 'blocked',
      request_id: reqId,
      ts: new Date().toISOString(),
    };
    session.messages.push(asstMsg);

    // Record hard_deny event
    state.securityEvents.unshift({
      ts: new Date().toISOString(),
      event: 'hard_deny',
      detail: `Adversarial input blocked: Prompt safety rule matched "${lower.slice(0, 48)}...".`,
      request_id: reqId,
    });
    state.baseline.totalRequests += 1;
    state.baseline.blockCount += 1;

    saveState(state);
    return {
      request_id: reqId,
      reply: replyText,
      decision: 'block',
      status: 'blocked',
    };
  }

  // Rule 2: Money-moving or privileged action -> APPROVE
  // Triggers: "waive", "fee reversal", "increase (my )?limit", "transfer" with amount >= 50000, "close account"
  const isTransfer = /transfer/i.test(lower);
  let transferAmt = 0;
  if (isTransfer) {
    const amtMatch = lower.match(/(?:rs\.?|inr|₹)?\s*(\d[\d,]*)/i);
    if (amtMatch) {
      transferAmt = parseInt(amtMatch[1].replace(/,/g, ''), 10) || 0;
    }
  }

  const isPrivileged =
    /waive|fee\s*reversal|increase\s*(my\s*)?limit|close\s*account/i.test(lower) ||
    (isTransfer && (transferAmt >= 50000 || /75,?000|65,?000|80,?000|50,?000/.test(lower)));

  if (isPrivileged) {
    const replyText = "Your request is under review. We'll notify you once it's resolved.";
    const asstMsg = {
      id: `msg_a_${Date.now()}`,
      role: 'assistant',
      text: replyText,
      decision: 'approve',
      status: 'pending',
      request_id: reqId,
      ts: new Date().toISOString(),
    };
    session.messages.push(asstMsg);

    // Build pending approval item
    let proposedTool = 'waive_fee';
    let params = { amount: 500, fee_type: 'late_fee' };
    let ruleDesc = 'RBAC: customer role cannot call waive_fee directly without secondary staff authorization.';
    let flagReason = 'both';
    let claims = [];

    if (/waive|fee/i.test(lower)) {
      proposedTool = 'waive_fee';
      params = { fee_type: 'late_payment_penalty', amount: 500, account_id: 'cc_9921' };
      ruleDesc = 'RBAC: Customer role cannot execute waive_fee directly; dual senior sign-off required.';
      flagReason = 'both';
      claims = [
        {
          text: 'Account had zero delinquent cycles in the past 12 billing periods.',
          verdict: 'supported',
          evidence: [{ doc: 'Fee Policy §4.2', chunk: 'Waiver eligibility requires pristine standing for 12 months.', score: 0.94 }],
        },
        {
          text: 'Late fees under ₹1,000 can be autonomously reversed without senior approval.',
          verdict: 'contradicted',
          evidence: [{ doc: 'Fee Policy §4.2', chunk: 'All penalty reversals require senior approver ledger sign-off.', score: 0.91 }],
        }
      ];
    } else if (isTransfer) {
      proposedTool = 'transfer_funds';
      params = { recipient: 'Neha Sharma', amount: transferAmt || 75000, channel: 'IMPS_HIGH_VALUE' };
      ruleDesc = 'Transaction Limit: Automated outward transfers >= ₹50,000 mandate manual senior sign-off.';
      flagReason = 'policy';
      claims = [
        {
          text: 'Beneficiary Neha Sharma has been registered for more than 24 hours.',
          verdict: 'supported',
          evidence: [{ doc: 'Transfer Limits & Routing §2.1', chunk: 'Instant high-value routing permitted for mature beneficiaries.', score: 0.95 }],
        }
      ];
    } else if (/limit/i.test(lower)) {
      proposedTool = 'increase_credit_limit';
      params = { card_id: 'cc_9921', requested_limit: 150000, current_limit: 100000 };
      ruleDesc = 'Underwriting Safety: Credit line increases require underwriter review.';
      flagReason = 'grounding';
      claims = [
        {
          text: 'Customer provided verifiable proof of updated salary increase.',
          verdict: 'unverifiable',
          evidence: [{ doc: 'KYC & Underwriting Guidelines §6', chunk: 'Income assertions must be cross-verified against verified CIBIL/IT returns.', score: 0.58 }],
        }
      ];
    } else {
      proposedTool = 'close_account';
      params = { account_id: 'sa_48250' };
      ruleDesc = 'Lifecycle Safety: Account termination requires senior officer confirmation.';
      flagReason = 'both';
      claims = [
        {
          text: 'All linked debit mandates and outstanding liens have been cleared.',
          verdict: 'supported',
          evidence: [{ doc: 'Account Closure & Lien Rules', chunk: 'Zero lien balance verified.', score: 0.89 }],
        }
      ];
    }

    const pendingItem = {
      request_id: reqId,
      customer: 'Aarav Mehta',
      original_request: message,
      action: { tool: proposedTool, params },
      proposed_action: { tool: proposedTool, params },
      flag_reason: flagReason,
      claims,
      grounding_score: flagReason === 'grounding' ? 0.62 : 0.86,
      policy_risk: flagReason === 'grounding' ? 0.45 : 0.82,
      fused_score: 0.84,
      rule_triggered: ruleDesc,
      ts: new Date().toISOString(),
    };

    state.approvals.unshift(pendingItem);
    state.baseline.totalRequests += 1;
    state.baseline.approveCount += 1;

    saveState(state);
    return {
      request_id: reqId,
      reply: replyText,
      decision: 'approve',
      status: 'pending',
      action: { tool: proposedTool, params },
    };
  }

  // Rule 3: Read-only ("balance", "statement", "transactions", "card status") -> ALLOW
  const isReadOnly = /balance|statement|transactions?|card\s*status/i.test(lower);
  let replyText = '';
  let tool = null;

  if (isReadOnly) {
    readOnlyCallCounter++;
    if (/balance/i.test(lower)) {
      replyText = `Your savings balance is ₹${SEEDED_ACCOUNTS.savingsBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`;
      tool = { tool: 'check_balance', params: { account_type: 'savings' } };
    } else if (/card/i.test(lower)) {
      replyText = `Your credit card limit is ₹${SEEDED_ACCOUNTS.creditCardLimit.toLocaleString('en-IN')} with an outstanding late fee of ₹${SEEDED_ACCOUNTS.creditCardLateFee.toFixed(2)}.`;
      tool = { tool: 'get_card_status', params: { card_id: 'cc_9921' } };
    } else {
      replyText = `Your last 3 transactions: ₹500 utility bill, ₹1,200 UPI transfer to grocery mart, and ₹45,000 monthly salary credit.`;
      tool = { tool: 'get_recent_transactions', params: { limit: 3 } };
    }

    // Condition 5: Roughly 1 in 12 allowed read-only requests logs sequence_anomaly or grounding_unavailable
    if (readOnlyCallCounter % 12 === 0) {
      const anomalyEvent = readOnlyCallCounter % 24 === 0 ? 'grounding_unavailable' : 'sequence_anomaly';
      state.securityEvents.unshift({
        ts: new Date().toISOString(),
        event: anomalyEvent,
        detail:
          anomalyEvent === 'grounding_unavailable'
            ? 'Knowledge vector store query exceeded soft SLA (read-only query safely failed-open).'
            : 'Read-only inquiry out of nominal transaction frequency sequence.',
        request_id: reqId,
      });
    }

    const asstMsg = {
      id: `msg_a_${Date.now()}`,
      role: 'assistant',
      text: replyText,
      decision: 'allow',
      status: 'allowed',
      request_id: reqId,
      ts: new Date().toISOString(),
    };
    session.messages.push(asstMsg);

    state.baseline.totalRequests += 1;
    state.baseline.allowCount += 1;

    saveState(state);
    return {
      request_id: reqId,
      reply: replyText,
      decision: 'allow',
      status: 'allowed',
      action: tool,
    };
  }

  // Rule 4: Anything else -> ALLOW with short helpful banking FAQ reply
  const faqReplies = [
    "You can manage your debit cards, download tax certificates, or transfer funds securely through this banking assistant.",
    "Our standard branches operate from 9:30 AM to 4:30 PM, while instant IMPS and UPI transfers are available 24/7.",
    "For international card usage, you can enable global transactions and adjust POS limits right here.",
  ];
  replyText = faqReplies[Math.floor(Math.random() * faqReplies.length)];

  const asstMsg = {
    id: `msg_a_${Date.now()}`,
    role: 'assistant',
    text: replyText,
    decision: 'allow',
    status: 'allowed',
    request_id: reqId,
    ts: new Date().toISOString(),
  };
  session.messages.push(asstMsg);

  state.baseline.totalRequests += 1;
  state.baseline.allowCount += 1;

  saveState(state);
  return {
    request_id: reqId,
    reply: replyText,
    decision: 'allow',
    status: 'allowed',
  };
}

export async function engineListApprovals(status = 'pending') {
  await delay(200, 380);
  const state = getState();
  const approvals = state.approvals || [];
  if (status === 'pending') {
    return approvals.filter((a) => !a.resolution).map((a) => ({
      request_id: a.request_id,
      customer: a.customer,
      action: a.proposed_action || a.action,
      flag_reason: a.flag_reason,
      ts: a.ts,
    }));
  }
  return approvals.filter((a) => !!a.resolution).map((a) => ({
    request_id: a.request_id,
    customer: a.customer,
    action: a.proposed_action || a.action,
    flag_reason: a.flag_reason,
    ts: a.ts,
    resolution: a.resolution,
    approver: a.approver,
    resolved_ts: a.resolved_ts,
    note: a.note,
  }));
}

export async function engineGetApproval(requestId) {
  await delay(180, 320);
  const state = getState();
  const item = (state.approvals || []).find((a) => a.request_id === requestId);
  if (!item) {
    const err = new Error(`Approval item not found: ${requestId}`);
    err.status = 404;
    throw err;
  }
  return {
    request_id: item.request_id,
    customer: item.customer,
    original_request: item.original_request,
    claims: item.claims || [],
    grounding_score: item.grounding_score ?? 0.82,
    policy_risk: item.policy_risk ?? 0.75,
    fused_score: item.fused_score ?? 0.79,
    rule_triggered: item.rule_triggered || 'Policy firewall restriction',
    proposed_action: item.proposed_action || item.action || { tool: 'action', params: {} },
    flag_reason: item.flag_reason || 'both',
    ts: item.ts,
    resolution: item.resolution,
    approver: item.approver,
    resolved_ts: item.resolved_ts,
    note: item.note,
  };
}

export async function engineResolveApproval(requestId, { resolution, note }) {
  await delay(350, 600);
  const state = getState();
  const item = (state.approvals || []).find((a) => a.request_id === requestId);
  if (!item) {
    const err = new Error(`Approval item not found: ${requestId}`);
    err.status = 404;
    throw err;
  }

  const resolvedTs = new Date().toISOString();
  item.resolution = resolution; // 'approve' | 'deny'
  item.approver = 'Priya Nair';
  item.resolved_ts = resolvedTs;
  item.note = note || (resolution === 'approve' ? 'Approved after security audit.' : 'Declined per banking policy.');

  // Notify customer's session if active
  const defaultSession = state.sessions['sess_aarav_default'];
  if (defaultSession) {
    const notificationText =
      resolution === 'approve'
        ? 'Your request has been approved and completed.'
        : "Your request couldn't be completed. Please contact support if you need more help.";

    defaultSession.messages.push({
      id: `msg_res_${Date.now()}`,
      role: 'assistant',
      text: notificationText,
      decision: resolution === 'approve' ? 'allow' : 'block',
      status: resolution === 'approve' ? 'approved' : 'denied',
      request_id: requestId,
      ts: resolvedTs,
    });
  }

  saveState(state);
  return { ok: true };
}

export async function engineGetSummary(range = '24h') {
  await delay(200, 360);
  const state = getState();
  const base = state.baseline;
  const is24h = range === '24h';
  const multiplier = is24h ? 0.22 : 1.0;

  const total = Math.round(base.totalRequests * multiplier);
  const allow = Math.round(base.allowCount * multiplier);
  const block = Math.round(base.blockCount * multiplier);
  const approve = Math.round(base.approveCount * multiplier);

  const pct_allow = total > 0 ? Number(((allow / total) * 100).toFixed(1)) : 71.0;
  const pct_block = total > 0 ? Number(((block / total) * 100).toFixed(1)) : 17.0;
  const pct_approve = total > 0 ? Number(((approve / total) * 100).toFixed(1)) : 12.0;

  return {
    total,
    pct_allow,
    pct_block,
    pct_approve,
    avg_grounding_score: is24h ? 0.83 : 0.81,
    avg_latency_ms: is24h ? 395 : 410,
  };
}

export async function engineGetTimeseries(range = '24h') {
  await delay(220, 400);
  if (range === '24h') {
    return [
      { bucket: '00:00', allow: 18, block: 3, approve: 2 },
      { bucket: '04:00', allow: 12, block: 2, approve: 1 },
      { bucket: '08:00', allow: 48, block: 11, approve: 8 },
      { bucket: '12:00', allow: 86, block: 19, approve: 14 },
      { bucket: '16:00', allow: 74, block: 16, approve: 13 },
      { bucket: '20:00', allow: 42, block: 9, approve: 7 },
    ];
  }
  return [
    { bucket: 'Mon', allow: 128, block: 31, approve: 22 },
    { bucket: 'Tue', allow: 142, block: 34, approve: 25 },
    { bucket: 'Wed', allow: 135, block: 29, approve: 21 },
    { bucket: 'Thu', allow: 156, block: 37, approve: 26 },
    { bucket: 'Fri', allow: 168, block: 42, approve: 29 },
    { bucket: 'Sat', allow: 98, block: 24, approve: 17 },
    { bucket: 'Sun', allow: 85, block: 21, approve: 14 },
  ];
}

export async function engineGetTopDocuments() {
  await delay(180, 320);
  const state = getState();
  return state.topDocuments || [];
}

export async function engineGetSecurityEvents() {
  await delay(180, 320);
  const state = getState();
  return state.securityEvents || [];
}
