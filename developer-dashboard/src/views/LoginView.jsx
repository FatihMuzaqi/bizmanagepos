import React, { useState } from 'react';
import { Terminal, Key, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { developerApi } from '../api';

export default function LoginView({ onLoginSuccess }) {
  const [email, setEmail] = useState('developer@bizmanage.local');
  const [password, setPassword] = useState('Developer#2026!');
  const [masterKey, setMasterKey] = useState('');
  const [useKeyMode, setUseKeyMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = useKeyMode
        ? { developerKey: masterKey }
        : { email, password };

      const response = await developerApi.login(payload);
      if (response?.data?.token) {
        localStorage.setItem('dev_token', response.data.token);
        localStorage.setItem('dev_user', JSON.stringify(response.data.developer));
        onLoginSuccess(response.data.developer);
      }
    } catch (err) {
      setError(err.message || 'Login gagal. Silakan periksa kredensial developer Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Glow Circles */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 shadow-xl shadow-indigo-600/30 mb-4">
            <Terminal className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Developer Cockpit</h1>
          <p className="text-sm text-slate-400 mt-1">
            BizManage SaaS Superadmin & Pricing Engine
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-7 shadow-2xl backdrop-blur-md">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {!useKeyMode ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Email Developer
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="developer@bizmanage.local"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Developer Master Key
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={masterKey}
                    onChange={(e) => setMasterKey(e.target.value)}
                    placeholder="developer_super_secret_2026"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Gunakan DEVELOPER_SECRET_KEY dari file .env backend
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Login Mode */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <button
              type="button"
              onClick={() => {
                setUseKeyMode(!useKeyMode);
                setError('');
              }}
              className="text-indigo-400 hover:underline cursor-pointer"
            >
              {useKeyMode ? 'Masuk dengan Email & Password' : 'Gunakan Master Key'}
            </button>
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Secure Port 5000
            </span>
          </div>
        </div>

        {/* Demo Credentials Helper */}
        <div className="mt-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-center text-xs text-slate-400">
          <p>
            Default Login:{' '}
            <code className="text-indigo-400 font-mono bg-slate-950 px-1.5 py-0.5 rounded">
              developer@bizmanage.local
            </code>{' '}
            / <code className="text-indigo-400 font-mono bg-slate-950 px-1.5 py-0.5 rounded">Developer#2026!</code>
          </p>
        </div>
      </div>
    </div>
  );
}
