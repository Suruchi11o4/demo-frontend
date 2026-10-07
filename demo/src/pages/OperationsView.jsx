import React from 'react';
import CustomerChat from './CustomerChat';
import ApproverQueue from './ApproverQueue';
import { SplitSquareVertical, ArrowRightLeft } from 'lucide-react';

export default function OperationsView() {
  // Silent tokens for the dual roles
  const customerToken = 'tl_tok_aarav_ops';
  const approverToken = 'tl_tok_priya_ops';

  return (
    <div className="space-y-4">
      {/* Sub-header description */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
            <SplitSquareVertical className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Synchronized Multi-Role Operations Console
            </span>
            <p className="text-[11px] text-slate-500">
              Left: Customer chat session (Aarav Mehta). Right: Senior staff approval queue (Priya Nair). Actions synchronize within 3 seconds.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200">
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Cross-Role Live Bus Active</span>
        </div>
      </div>

      {/* Split Pane View */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Left Half: Customer Chat */}
        <div className="flex flex-col">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 px-1 flex items-center justify-between">
            <span>Customer Viewport (Aarav Mehta)</span>
            <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              Role: Customer
            </span>
          </div>
          <CustomerChat token={customerToken} />
        </div>

        {/* Right Half: Approver Queue */}
        <div className="flex flex-col">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 px-1 flex items-center justify-between">
            <span>Risk Officer Queue (Priya Nair)</span>
            <span className="text-[10px] font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Role: Approver
            </span>
          </div>
          <ApproverQueue token={approverToken} />
        </div>
      </div>
    </div>
  );
}
