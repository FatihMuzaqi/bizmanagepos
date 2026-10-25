import React from 'react';
import {
  LayoutDashboard,
  CreditCard,
  Users,
  Store,
  Layers,
  LogOut,
  Terminal,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

export default function Sidebar({ currentTab, setCurrentTab, developer, onLogout }) {
  const menuItems = [
    { id: 'overview', label: 'Dashboard Utama', icon: LayoutDashboard, badge: null },
    { id: 'plans', label: 'Harga & Paket SaaS', icon: CreditCard, highlight: true },
    { id: 'subscriptions', label: 'Monitoring Langganan', icon: Layers, badge: null },
    { id: 'users', label: 'Daftar Pengguna', icon: Users, badge: null },
    { id: 'businesses', label: 'Bisnis & Toko', icon: Store, badge: null },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Terminal className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white text-base tracking-tight">UsahaKu</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              DEV
            </span>
          </div>
          <p className="text-xs text-slate-400">Developer Cockpit</p>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Kontrol & Monitoring
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.highlight && !isActive && (
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Developer Profile Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/60">
        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{developer?.name || 'Developer'}</p>
              <p className="text-[11px] text-slate-400 truncate">{developer?.email || 'developer@bizmanage.local'}</p>
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Keluar Sesi Developer
        </button>
      </div>
    </aside>
  );
}
