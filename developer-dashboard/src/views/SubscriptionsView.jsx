import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Edit,
  PlusCircle,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Receipt,
  CreditCard,
  ExternalLink,
} from 'lucide-react';
import { developerApi } from '../api';

export default function SubscriptionsView() {
  const [activeTab, setActiveTab] = useState('subscriptions'); // 'subscriptions' | 'invoices'

  // Subscriptions State
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Invoices State
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('ALL');
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [invoicesTotalPages, setInvoicesTotalPages] = useState(1);
  const [invoicesTotalCount, setInvoicesTotalCount] = useState(0);

  // Quick Action Modal (Extend / Change Status)
  const [selectedSub, setSelectedSub] = useState(null);
  const [extendDays, setExtendDays] = useState(30);
  const [targetStatus, setTargetStatus] = useState('ACTIVE');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSubscriptions = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await developerApi.getSubscriptions({
        page,
        limit: 15,
        status: statusFilter,
      });
      setSubscriptions(res.data.subscriptions || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalCount(res.data.total || 0);
    } catch (err) {
      setError(err.message || 'Gagal memuat data langganan');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    setInvoicesLoading(true);
    try {
      const res = await developerApi.getInvoices({
        page: invoicesPage,
        limit: 15,
        status: invoiceStatusFilter,
      });
      setInvoices(res.data.invoices || []);
      setInvoicesTotalPages(res.data.totalPages || 1);
      setInvoicesTotalCount(res.data.total || 0);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setInvoicesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'subscriptions') {
      fetchSubscriptions();
    } else {
      fetchInvoices();
    }
  }, [activeTab, page, statusFilter, invoicesPage, invoiceStatusFilter]);

  const handleOpenAction = (sub) => {
    setSelectedSub(sub);
    setTargetStatus(sub.status);
    setExtendDays(30);
  };

  const handleApplyUpdate = async (e) => {
    e.preventDefault();
    if (!selectedSub) return;
    setActionLoading(true);

    try {
      await developerApi.updateSubscription(selectedSub.id, {
        status: targetStatus,
        extend_days: extendDays > 0 ? extendDays : null,
      });
      setSelectedSub(null);
      await fetchSubscriptions();
    } catch (err) {
      alert(err.message || 'Gagal memperbarui langganan.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Selection */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Monitoring SaaS & Pembayaran Midtrans</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Kontrol langganan aktif, perpanjangan manual, dan verifikasi tagihan gateway
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'subscriptions'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            Langganan Aktif ({totalCount})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'invoices'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Tagihan Midtrans ({invoicesTotalCount})
          </button>
        </div>
      </div>

      {activeTab === 'subscriptions' ? (
        <>
          {/* Subscriptions Filter and Count */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {['ALL', 'TRIAL', 'ACTIVE', 'EXPIRED'].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setStatusFilter(st);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    statusFilter === st
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {st === 'ALL'
                    ? 'Semua'
                    : st === 'TRIAL'
                    ? 'Trial 1 Bln'
                    : st === 'ACTIVE'
                    ? 'Aktif Berbayar'
                    : 'Kedaluwarsa'}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setPage(1);
                fetchSubscriptions();
              }}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>

          {/* Subscriptions Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    <th className="py-3.5 px-4">Bisnis & Pemilik</th>
                    <th className="py-3.5 px-4">Paket SaaS</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Mulai Aktif</th>
                    <th className="py-3.5 px-4">Berakhir Pada</th>
                    <th className="py-3.5 px-4 text-right">Aksi Developer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-500">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        Memuat data langganan...
                      </td>
                    </tr>
                  ) : subscriptions.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-500">
                        Tidak ada data langganan dalam kategori ini.
                      </td>
                    </tr>
                  ) : (
                    subscriptions.map((sub) => {
                      const now = new Date();
                      const end = new Date(sub.ends_at);
                      const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

                      return (
                        <tr key={sub.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-white">{sub.business?.name || `Bisnis #${sub.business_id}`}</p>
                            <p className="text-[11px] text-slate-400">
                              {sub.business?.owner?.name} ({sub.business?.owner?.email || '-'})
                            </p>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-indigo-400">{sub.plan?.name || 'Paket Standar'}</span>
                            <p className="text-[11px] text-slate-500">
                              Rp {Number(sub.plan?.price || 0).toLocaleString('id-ID')} / {sub.plan?.duration_days || 30} hr
                            </p>
                          </td>
                          <td className="py-3.5 px-4">
                            {sub.status === 'ACTIVE' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Aktif ({daysLeft} hari lagi)
                              </span>
                            ) : sub.status === 'TRIAL' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                <Clock className="w-3.5 h-3.5" />
                                Trial ({daysLeft} hari lagi)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Kedaluwarsa
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                            {new Date(sub.starts_at).toLocaleDateString('id-ID')}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                            {new Date(sub.ends_at).toLocaleDateString('id-ID')}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleOpenAction(sub)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 font-semibold transition inline-flex items-center gap-1.5 cursor-pointer border border-slate-700/60"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              Kontrol
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <p>
                  Halaman {page} dari {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Invoices Filter and Refresh */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {['ALL', 'PAID', 'PENDING', 'EXPIRED', 'FAILED'].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setInvoiceStatusFilter(st);
                    setInvoicesPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    invoiceStatusFilter === st
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {st === 'ALL'
                    ? 'Semua Status'
                    : st === 'PAID'
                    ? 'Lunas (Settlement)'
                    : st === 'PENDING'
                    ? 'Menunggu Bayar'
                    : st === 'EXPIRED'
                    ? 'Kedaluwarsa'
                    : 'Batal / Gagal'}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setInvoicesPage(1);
                fetchInvoices();
              }}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition cursor-pointer"
              title="Refresh Invoices"
            >
              <RefreshCw className={`w-4 h-4 ${invoicesLoading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>

          {/* Invoices Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    <th className="py-3.5 px-4">Order ID Midtrans</th>
                    <th className="py-3.5 px-4">Bisnis & Pelanggan</th>
                    <th className="py-3.5 px-4">Paket</th>
                    <th className="py-3.5 px-4">Nominal</th>
                    <th className="py-3.5 px-4">Metode Bayar</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                  {invoicesLoading ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-500">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        Memuat data tagihan Midtrans...
                      </td>
                    </tr>
                  ) : invoices.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-500">
                        Belum ada riwayat tagihan Midtrans dalam sistem.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4">
                          <p className="font-mono font-bold text-white text-[11px]">{inv.order_id}</p>
                          {inv.snap_redirect_url && (
                            <a
                              href={inv.snap_redirect_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 mt-0.5"
                            >
                              Link Snap <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-white">{inv.business?.name || `Bisnis #${inv.business_id}`}</p>
                          <p className="text-[11px] text-slate-400">
                            {inv.business?.owner?.name} ({inv.business?.owner?.phone || inv.business?.owner?.email || '-'})
                          </p>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-300">
                          {inv.plan?.name || 'Langganan 1 Bulan'}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                          Rp {Number(inv.amount || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="py-3.5 px-4 uppercase font-mono text-[11px] text-slate-400">
                          {inv.payment_type || 'Belum dipilih'}
                        </td>
                        <td className="py-3.5 px-4">
                          {inv.status === 'PAID' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" /> LUNAS
                            </span>
                          ) : inv.status === 'PENDING' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Clock className="w-3 h-3" /> MENUNGGU
                            </span>
                          ) : inv.status === 'EXPIRED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <AlertTriangle className="w-3 h-3" /> EXPIRED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                              {inv.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-400">
                          {new Date(inv.paid_at || inv.createdAt).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for Invoices */}
            {invoicesTotalPages > 1 && (
              <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <p>
                  Halaman {invoicesPage} dari {invoicesTotalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={invoicesPage <= 1}
                    onClick={() => setInvoicesPage(p => p - 1)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={invoicesPage >= invoicesTotalPages}
                    onClick={() => setInvoicesPage(p => p + 1)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Developer Control Modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedSub(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              Kontrol Langganan Developer
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Perbarui status langganan atau berikan perpanjangan gratis untuk {selectedSub.business?.name}
            </p>

            <form onSubmit={handleApplyUpdate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Tambah Masa Aktif (Hari)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={extendDays}
                    onChange={(e) => setExtendDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-mono"
                    placeholder="Contoh: 30"
                  />
                  <span className="text-slate-400 whitespace-nowrap">Hari</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Ubah Status Langganan
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="ACTIVE">ACTIVE (Aktif Berbayar)</option>
                  <option value="TRIAL">TRIAL (Uji Coba Gratis)</option>
                  <option value="EXPIRED">EXPIRED (Kedaluwarsa)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSub(null)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Menyimpan...' : 'Terapkan Pembaruan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
