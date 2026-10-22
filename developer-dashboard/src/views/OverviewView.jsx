import React, { useEffect, useState } from 'react';
import {
  Users,
  Store,
  Layers,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  DollarSign,
  ArrowUpRight,
  ShieldAlert,
  Database,
  Activity,
  Receipt,
  Building,
  RefreshCw,
  Server,
} from 'lucide-react';
import { developerApi } from '../api';

export default function OverviewView({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const res = await developerApi.getStats();
      setStats(res.data);
    } catch (err) {
      setError(err.message || 'Gagal memuat statistik sistem dari backend');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400">Menghubungkan ke database MySQL & backend server...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Koneksi Backend / Database Gagal</p>
            <p className="text-xs mt-0.5 text-rose-300">{error}</p>
          </div>
        </div>
        <button
          onClick={() => fetchStats(false)}
          className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold rounded-xl transition cursor-pointer"
        >
          Coba Hubungkan Ulang
        </button>
      </div>
    );
  }

  const {
    overview,
    databaseInfo,
    planDistribution,
    recentUsers,
    recentSubscriptions,
    recentTransactions,
    recentBusinesses,
  } = stats || {};

  return (
    <div className="space-y-6">
      {/* 1. Live Database Connection & Status Header */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Database: <span className="text-emerald-400 font-mono">{databaseInfo?.name || 'bizmanage_db'}</span>
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {databaseInfo?.status || 'Live MySQL Database'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Host: <span className="font-mono text-slate-300">{databaseInfo?.host || '127.0.0.1:3306'}</span> • Dialect: <span className="font-mono text-slate-300">{databaseInfo?.dialect || 'MySQL'}</span> • Data sinkron live dari server backend
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="text-left md:text-right">
            <p className="text-[11px] text-slate-500">Sinkronisasi Terakhir:</p>
            <p className="text-xs font-mono text-slate-300">
              {databaseInfo?.lastSync ? new Date(databaseInfo.lastSync).toLocaleTimeString('id-ID') : '-'} WIB
            </p>
          </div>
          <button
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-2 border border-slate-700 transition cursor-pointer disabled:opacity-50"
            title="Muat ulang data live dari MySQL"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
            <span>{refreshing ? 'Memperbarui...' : 'Segarkan Data'}</span>
          </button>
        </div>
      </div>

      {/* 2. SaaS Pricing Hero Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900/60 via-indigo-950 to-slate-900 border border-indigo-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-2">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Kontrol Harga Langganan Terpusat</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Atur dan Naikkan Harga SaaS Kapan Saja
          </h2>
          <p className="text-xs text-slate-300 max-w-xl mt-1">
            Sebagai developer, Anda dapat langsung mengubah harga paket langganan bulanan (misal Rp 30.000 menjadi Rp 50.000), mengubah batas kuota cabang, staf, dan menu tanpa perlu redeploy aplikasi.
          </p>
        </div>
        <button
          onClick={() => onNavigate('plans')}
          className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/30 transition shrink-0 cursor-pointer"
        >
          <CreditCard className="w-4 h-4" />
          <span>Kelola Harga Paket SaaS</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* 3. Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Pengguna</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-white">{overview?.totalUsers || 0}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Akun terdaftar di database</p>
          </div>
        </div>

        {/* Total Businesses & Outlets */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Bisnis & Cabang</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-white">{overview?.totalBusinesses || 0} Bisnis</h3>
            <p className="text-xs text-cyan-400/80 mt-0.5">
              {overview?.totalOutlets || 0} cabang outlet aktif
            </p>
          </div>
        </div>

        {/* Total Kasir Transactions & Volume */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Transaksi Kasir</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-emerald-400">{overview?.totalTransactions || 0}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Omset: Rp {(overview?.totalRevenue || 0).toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        {/* Monthly Recurring Revenue */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Estimasi MRR SaaS</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-amber-400">
              Rp {(overview?.mrr || 0).toLocaleString('id-ID')}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Dari langganan aktif berbayar</p>
          </div>
        </div>
      </div>

      {/* 4. Live SaaS Plan Distribution Grid (Dari MySQL) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Model Langganan Tunggal SaaS BizManage</span>
            </h3>
            <p className="text-xs text-slate-400">
              Sistem disederhanakan: Uji Coba Gratis (Bulan ke-1) dan Langganan Rp 30.000/bln (Bulan ke-2 dst) — Akses Semua Fitur
            </p>
          </div>
          <button
            onClick={() => onNavigate('plans')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
          >
            Atur Tarif Langganan →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {planDistribution && planDistribution.length > 0 ? (
            planDistribution.map((plan) => {
              const isTrial = plan.code === 'FREE_TRIAL' || plan.price === 0;
              return (
                <div
                  key={plan.id}
                  className={`p-4 rounded-xl border transition ${
                    !isTrial
                      ? 'bg-slate-800/60 border-indigo-500/40 ring-1 ring-indigo-500/20'
                      : 'bg-slate-800/40 border-slate-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-slate-200">{plan.name}</span>
                      <p className="text-[11px] text-emerald-400 mt-0.5 font-medium">
                        ✓ Akses Penuh Semua Fitur (Cabang, Staf, Menu, Transaksi)
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
                        isTrial
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {isTrial ? 'GRATIS (1 Bln)' : `Rp ${plan.price.toLocaleString('id-ID')}/bln`}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-black text-white">{plan.count}</span>
                      <span className="text-xs text-slate-400 ml-1.5 font-medium">Bisnis Terdaftar</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono uppercase bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {isTrial ? 'BULAN KE-1' : 'BULAN KE-2 DST'}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-slate-500 col-span-2 text-center py-4">
              Tidak ada data paket aktif.
            </p>
          )}
        </div>
      </div>

      {/* 5. Two Column Section: Live Real Transactions & Recent Businesses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Real Transactions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span>Transaksi Kasir Terbaru</span>
              </h3>
              <p className="text-xs text-slate-400">Data live dari tabel transaksi POS</p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live POS
            </span>
          </div>

          <div className="space-y-3">
            {recentTransactions && recentTransactions.length > 0 ? (
              recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-400">{tx.invoice_number}</span>
                      <span className="text-slate-400">•</span>
                      <span className="font-semibold text-slate-200 truncate">{tx.business?.name || 'Toko'}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5 truncate">
                      Cabang: {tx.outlet?.name || 'Pusat'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-emerald-400 text-xs">
                      Rp {Number(tx.total || 0).toLocaleString('id-ID')}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">Belum ada transaksi di database.</p>
            )}
          </div>
        </div>

        {/* Recent Registered Businesses */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-cyan-400" />
                <span>Bisnis UMKM Terdaftar Terbaru</span>
              </h3>
              <p className="text-xs text-slate-400">Pendaftaran toko / merchant baru</p>
            </div>
            <button
              onClick={() => onNavigate('businesses')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
            >
              Lihat Semua →
            </button>
          </div>

          <div className="space-y-3">
            {recentBusinesses && recentBusinesses.length > 0 ? (
              recentBusinesses.map((b) => (
                <div
                  key={b.id}
                  className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-200 truncate">{b.name}</p>
                    <p className="text-slate-400 text-[11px] truncate">
                      Pemilik: {b.owner} ({b.ownerEmail})
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {b.outletsCount} Cabang
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {new Date(b.createdAt).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">Belum ada data bisnis.</p>
            )}
          </div>
        </div>
      </div>

      {/* 6. Two Column Section: Recent Users & Subscriptions Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Registered Users */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>Pengguna Terbaru</span>
              </h3>
              <p className="text-xs text-slate-400">5 pendaftaran akun terakhir di database</p>
            </div>
            <button
              onClick={() => onNavigate('users')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
            >
              Lihat Semua →
            </button>
          </div>

          <div className="space-y-3">
            {recentUsers && recentUsers.length > 0 ? (
              recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-200 truncate">{user.name}</p>
                    <p className="text-slate-400 text-[11px] truncate">{user.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        user.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {user.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {new Date(user.createdAt).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">Belum ada pengguna terdaftar.</p>
            )}
          </div>
        </div>

        {/* Recent Subscriptions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Aktivitas Masa Aktif Langganan</span>
              </h3>
              <p className="text-xs text-slate-400">Status langganan bisnis terbaru</p>
            </div>
            <button
              onClick={() => onNavigate('subscriptions')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
            >
              Lihat Semua →
            </button>
          </div>

          <div className="space-y-3">
            {recentSubscriptions && recentSubscriptions.length > 0 ? (
              recentSubscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-200 truncate">
                      {sub.business?.name || `Bisnis #${sub.business_id}`}
                    </p>
                    <p className="text-slate-400 text-[11px] truncate">
                      Paket: {sub.plan?.name || 'Paket'} (Rp {Number(sub.plan?.price || 0).toLocaleString('id-ID')})
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        sub.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : sub.status === 'TRIAL'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {sub.status === 'ACTIVE' ? 'Aktif' : sub.status === 'TRIAL' ? 'Trial 1 Bln' : 'Expired'}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">
                      s/d {new Date(sub.ends_at).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">Belum ada data langganan.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
