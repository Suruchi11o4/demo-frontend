import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  CheckCircle,
  ShieldX,
  Clock,
  Zap,
  Shield,
  MessageSquare,
  ClipboardList,
  BarChart3,
  SplitSquareVertical,
  LogOut,
  AlertTriangle,
  X,
  Loader2,
  ChevronRight,
  Info,
} from 'lucide-react';
import { subscribeDebugMode } from './api';

/**
 * DecisionBadge component
 * Fixed color mappings:
 *   ALLOW = green (#059669), CheckCircle
 *   BLOCK = red (#DC2626), ShieldX
 *   APPROVE / pending = amber (#D97706), Clock
 *   FUSION / engine = purple (#7C3AED), Zap
 */
export function DecisionBadge({ decision, status, size = 'md', label }) {
  const dec = (decision || status || '').toLowerCase();

  let config = {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle,
    text: 'Allowed',
  };

  if (dec.includes('block') || dec === 'denied') {
    config = {
      bg: 'bg-red-50 text-red-700 border-red-200',
      icon: ShieldX,
      text: dec === 'denied' ? 'Declined' : 'Blocked',
    };
  } else if (dec.includes('approve') || dec === 'pending') {
    if (dec === 'approved') {
      config = {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: CheckCircle,
        text: 'Approved',
      };
    } else {
      config = {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: Clock,
        text: 'Pending review',
      };
    }
  } else if (dec.includes('fused') || dec.includes('engine') || dec.includes('purple')) {
    config = {
      bg: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: Zap,
      text: 'Decision engine',
    };
  }

  const Icon = config.icon;
  const displayText = label || config.text;

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-xs select-none transition-colors ${config.bg} ${
        sizeStyles[size] || sizeStyles.md
      }`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0'} />
      <span>{displayText}</span>
    </span>
  );
}

/**
 * ScoreBar component
 * Horizontal progress indicator with fixed palette tokens:
 * green (grounding), red (policy risk), purple (fused score), amber (pending threshold)
 */
export function ScoreBar({ label, value, type = 'grounding', showValue = true }) {
  const score = Math.max(0, Math.min(1, typeof value === 'number' ? value : 0));
  const percent = Math.round(score * 100);

  const theme = {
    grounding: {
      bar: 'bg-[#059669]',
      text: 'text-[#059669]',
      bg: 'bg-emerald-100',
    },
    policy: {
      bar: 'bg-[#DC2626]',
      text: 'text-[#DC2626]',
      bg: 'bg-red-100',
    },
    fused: {
      bar: 'bg-[#7C3AED]',
      text: 'text-[#7C3AED]',
      bg: 'bg-purple-100',
    },
    amber: {
      bar: 'bg-[#D97706]',
      text: 'text-[#D97706]',
      bg: 'bg-amber-100',
    },
  }[type] || {
    bar: 'bg-blue-600',
    text: 'text-blue-600',
    bg: 'bg-blue-100',
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center text-xs mb-1">
        <span className="font-medium text-slate-700">{label}</span>
        {showValue && (
          <span className={`font-semibold font-mono ${theme.text}`}>
            {(score).toFixed(2)} ({percent}%)
          </span>
        )}
      </div>
      <div className={`w-full h-2 rounded-full overflow-hidden ${theme.bg}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${theme.bar}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/**
 * KpiCard component
 * Metric card with Lora numeral, border-slate-200, rounded-xl
 */
export function KpiCard({ title, value, subtext, accentColor = 'blue', icon: Icon }) {
  const accentBorder = {
    blue: 'border-l-4 border-l-[#2563EB]',
    green: 'border-l-4 border-l-[#059669]',
    red: 'border-l-4 border-l-[#DC2626]',
    purple: 'border-l-4 border-l-[#7C3AED]',
    amber: 'border-l-4 border-l-[#D97706]',
  }[accentColor] || 'border-l-4 border-l-slate-300';

  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-5 shadow-xs ${accentBorder} flex flex-col justify-between`}>
      <div className="flex items-center justify-between text-slate-500 mb-2">
        <span className="text-xs font-medium uppercase tracking-wider">{title}</span>
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
      </div>
      <div className="my-1">
        <div className="font-serif text-3xl font-semibold text-slate-900 tracking-tight">
          {value}
        </div>
      </div>
      {subtext && <div className="text-xs text-slate-500 mt-1">{subtext}</div>}
    </div>
  );
}

/**
 * Modal component
 */
export function Modal({ isOpen, onClose, title, children, footer }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-serif text-lg font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors rounded-lg p-1 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-700">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Spinner component
 */
export function Spinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };
  return <Loader2 className={`animate-spin text-blue-600 ${sizes[size] || sizes.md} ${className}`} />;
}

/**
 * Toast notification component
 */
export function Toast({ message, type = 'info', onClose }) {
  if (!message) return null;

  const styles = {
    info: 'bg-slate-900 text-white',
    success: 'bg-[#059669] text-white',
    error: 'bg-[#DC2626] text-white',
    warning: 'bg-[#D97706] text-white',
  }[type] || 'bg-slate-900 text-white';

  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm ${styles} animate-in slide-in-from-bottom-3 duration-200`}>
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="p-1 hover:opacity-80">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/**
 * AppShell Layout
 * Navy left sidebar (#1E3A8A) with brand wordmark in Lora,
 * role-specific navigation, user info chip, and sign out button.
 */
export function AppShell({ user, onLogout, pageTitle, children }) {
  const location = useLocation();
  const [debugMode, setDebugMode] = useState('local engine');
  const isDebug = new URLSearchParams(location.search).get('debug') === '1';

  useEffect(() => {
    return subscribeDebugMode((mode) => setDebugMode(mode));
  }, []);

  const role = user?.role || 'customer';

  const navItems = [
    {
      to: '/chat',
      label: 'Banking Assistant',
      icon: MessageSquare,
      roles: ['customer', 'admin'],
    },
    {
      to: '/approvals',
      label: 'Approval Queue',
      icon: ClipboardList,
      roles: ['approver', 'admin'],
    },
    {
      to: '/dashboard',
      label: 'Security & Analytics',
      icon: BarChart3,
      roles: ['admin'],
    },
    {
      to: '/operations',
      label: 'Live Operations View',
      icon: SplitSquareVertical,
      roles: ['admin'],
    },
  ];

  const allowedNav = navItems.filter((item) => item.roles.includes(role));

  const roleBadgeColors = {
    customer: 'bg-blue-100 text-blue-800 border-blue-200',
    approver: 'bg-amber-100 text-amber-800 border-amber-200',
    admin: 'bg-purple-100 text-purple-800 border-purple-200',
  }[role] || 'bg-slate-100 text-slate-800 border-slate-200';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F5F7FB]">
      {/* Navy Left Sidebar */}
      <aside className="w-64 bg-[#1E3A8A] text-white flex flex-col shrink-0 select-none shadow-md">
        {/* Brand Header */}
        <div className="p-6 border-b border-blue-900/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/40 border border-blue-400/30 flex items-center justify-center text-white shadow-inner">
            <Shield className="w-6 h-6 text-blue-200" />
          </div>
          <div>
            <div className="font-serif text-2xl font-bold tracking-tight text-white flex items-center gap-1.5">
              TrustLayer
            </div>
            <div className="text-[11px] font-sans tracking-wide text-blue-200 uppercase font-medium">
              Security Firewall
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-blue-300/80">
            Navigation
          </div>
          {allowedNav.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-blue-100/90 hover:bg-blue-800/70 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-blue-300'}`} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile & Sign Out Footer */}
        <div className="p-4 border-t border-blue-900/60 bg-[#172554]/50">
          <div className="flex items-center justify-between mb-3">
            <div className="overflow-hidden pr-2">
              <div className="text-sm font-semibold text-white truncate">{user?.name || 'Authorized User'}</div>
              <div className="text-xs text-blue-200/80 truncate">@{user?.username || 'user'}</div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border shrink-0 ${roleBadgeColors}`}>
              {role}
            </span>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-blue-200 hover:text-white hover:bg-blue-800/60 rounded-lg transition-colors border border-blue-900/80"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-xl font-bold text-slate-900 tracking-tight">
              {pageTitle}
            </h1>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-medium text-slate-700">Firewall Active</span>
            </div>
          </div>
        </header>

        {/* Page Body Viewport */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          {children}

          {/* Optional Debug Mode Badge if ?debug=1 is in URL */}
          {isDebug && (
            <div className="fixed bottom-3 right-3 z-50 bg-slate-900/90 text-white font-mono text-[11px] px-2.5 py-1 rounded shadow-lg border border-slate-700 pointer-events-none">
              API Mode: <span className={debugMode === 'live' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{debugMode}</span>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
