import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import { login } from '../api';
import { Spinner } from '../ui';

export default function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('aarav');
  const [password, setPassword] = useState('trustlayer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const roleProfiles = [
    {
      role: 'Customer',
      username: 'aarav',
      name: 'Aarav Mehta',
      badge: 'Savings & Credit',
      target: '/chat',
    },
    {
      role: 'Approver',
      username: 'priya',
      name: 'Priya Nair',
      badge: 'Senior Staff / Risk',
      target: '/approvals',
    },
    {
      role: 'Admin',
      username: 'rohan',
      name: 'Rohan Kulkarni',
      badge: 'Security Analytics',
      target: '/dashboard',
    },
  ];

  const handleSelectProfile = (profile) => {
    setUsername(profile.username);
    setPassword('trustlayer');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login({ username, password });
      onLoginSuccess(res.user, res.token);

      if (res.user.role === 'customer') {
        navigate('/chat');
      } else if (res.user.role === 'approver') {
        navigate('/approvals');
      } else if (res.user.role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/chat');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col justify-center items-center bg-[#F5F7FB] px-4 py-12">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        {/* Navy Header */}
        <div className="bg-[#1E3A8A] text-white p-8 text-center relative">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-600/40 border border-blue-400/30 flex items-center justify-center text-white shadow-inner mb-4">
            <Shield className="w-8 h-8 text-blue-200" />
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-white mb-1">
            TrustLayer
          </h1>
          <p className="text-xs text-blue-200 font-sans tracking-wide uppercase">
            AI Hallucination & Security Firewall
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-6">
          {error && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                  placeholder="Enter username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                  placeholder="Enter password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 bg-[#2563EB] hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-all shadow-sm disabled:opacity-70 cursor-pointer"
            >
              {loading ? (
                <>
                  <Spinner size="sm" className="text-white" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in to TrustLayer</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Role Shortcuts */}
          <div className="pt-4 border-t border-slate-100">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-center mb-3">
              Direct Role Access
            </div>
            <div className="grid grid-cols-3 gap-2">
              {roleProfiles.map((p) => {
                const isSelected = username === p.username;
                return (
                  <button
                    key={p.role}
                    type="button"
                    onClick={() => handleSelectProfile(p)}
                    className={`p-2.5 text-center rounded-xl border transition-all text-xs flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-semibold ring-1 ring-blue-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="font-medium">{p.role}</span>
                    <span className="text-[10px] text-slate-500">{p.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-slate-400">
        TrustLayer v1.0 • Grounding & Security Verification Architecture
      </div>
    </div>
  );
}
