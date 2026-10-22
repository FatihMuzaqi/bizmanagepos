import React, { useState, useEffect } from 'react';
import {
  Building,
  Store,
  Users,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  CreditCard,
  Clock,
} from 'lucide-react';
import { developerApi } from '../api';

export default function BusinessesView() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchBusinesses = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await developerApi.getBusinesses({ page, limit: 15, search });
      setBusinesses(res.data.businesses || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalCount(res.data.total || 0);
    } catch (err) {
      setError(err.message || 'Gagal memuat daftar bisnis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchBusinesses();
  };

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Monitoring Bisnis & Cabang UMKM</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Total {totalCount} bisnis terdaftar di seluruh jaringan BizManage
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <form onSubmit={handleSearch} className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama bisnis/toko..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </form>

          <button
            onClick={() => {
              setPage(1);
              fetchBusinesses();
            }}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                <th className="py-3.5 px-4">Nama Bisnis</th>
                <th className="py-3.5 px-4">Pemilik (Owner)</th>
                <th className="py-3.5 px-4">Cabang Outlet</th>
                <th className="py-3.5 px-4">Paket Langganan</th>
                <th className="py-3.5 px-4">Status & Masa Berlaku</th>
                <th className="py-3.5 px-4">Tgl Dibuat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Memuat data bisnis...
                  </td>
                </tr>
              ) : businesses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    Tidak ada bisnis yang cocok.
                  </td>
                </tr>
              ) : (
                businesses.map((biz) => {
                  const outlets = biz.outlets || [];
                  const activeSub = biz.subscriptions?.[0];
                  const plan = activeSub?.plan;

                  return (
                    <tr key={biz.id} className="hover:bg-slate-800/40 transition">
                      {/* Business Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center shrink-0">
                            <Store className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-white">{biz.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">ID: #{biz.id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-slate-200">{biz.owner?.name || 'Tanpa Pemilik'}</p>
                        <p className="text-[11px] text-slate-500">{biz.owner?.email || '-'}</p>
                      </td>

                      {/* Outlets */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-semibold text-white">
                          <Store className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{outlets.length} Cabang</span>
                        </div>
                        {outlets.length > 0 && (
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xs">
                            {outlets.map((o) => o.name).join(', ')}
                          </p>
                        )}
                      </td>

                      {/* Subscription Plan */}
                      <td className="py-3.5 px-4">
                        {plan ? (
                          <div>
                            <p className="font-bold text-indigo-400">{plan.name}</p>
                            <p className="text-[11px] text-slate-500">
                              {Number(plan.price) === 0 ? 'Gratis' : `Rp ${Number(plan.price).toLocaleString('id-ID')}/bln`}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Belum ada paket</span>
                        )}
                      </td>

                      {/* Status & Expiry */}
                      <td className="py-3.5 px-4">
                        {activeSub ? (
                          <div>
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                                activeSub.status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : activeSub.status === 'TRIAL'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {activeSub.status === 'ACTIVE'
                                ? 'Aktif'
                                : activeSub.status === 'TRIAL'
                                ? 'Uji Coba 1 Bln'
                                : 'Kedaluwarsa'}
                            </span>
                            <p className="text-[10px] text-slate-500 mt-1">
                              s/d {new Date(activeSub.ends_at).toLocaleDateString('id-ID')}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {new Date(biz.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-950/20">
          <span>
            Halaman {page} dari {totalPages} ({totalCount} bisnis)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
