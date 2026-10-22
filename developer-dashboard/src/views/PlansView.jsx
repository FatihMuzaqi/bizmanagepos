import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Edit3,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  Store,
  Users,
  Coffee,
  Receipt,
  X,
  AlertCircle,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { developerApi } from '../api';

export default function PlansView() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    price: 30000,
    duration_days: 30,
    max_outlets: -1,
    max_users: -1,
    max_products: -1,
    max_transactions: -1,
    description: '',
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await developerApi.getPlans();
      setPlans(res.data || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat paket langganan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openEditModal = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name || '',
      code: plan.code || '',
      price: plan.price || 0,
      duration_days: plan.duration_days || 30,
      max_outlets: plan.max_outlets ?? -1,
      max_users: plan.max_users ?? -1,
      max_products: plan.max_products ?? -1,
      max_transactions: plan.max_transactions ?? -1,
      description: plan.description || '',
      is_active: plan.is_active ?? true,
    });
    setIsModalOpen(true);
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      if (editingPlan) {
        await developerApi.updatePlan(editingPlan.id, formData);
        setSuccessMsg(`Konfigurasi "${formData.name}" berhasil diperbarui! Harga: Rp ${Number(formData.price).toLocaleString('id-ID')}`);
      }
      setIsModalOpen(false);
      await fetchPlans();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan perubahan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Sistem Langganan Tunggal SaaS</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Akses Semua Fitur Penuh</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Sistem SaaS BizManage disederhanakan tanpa tingkatan paket bertingkat. Pelaku UMKM mendapatkan <strong className="text-white">Uji Coba Gratis 1 Bulan</strong> dan selanjutnya <strong className="text-white">Langganan Rp 30.000 / Bulan</strong> dengan akses tak terbatas ke semua fitur (cabang, staf, menu, & transaksi).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchPlans}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-2 text-xs font-semibold cursor-pointer"
            title="Refresh Data Paket"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Success Alert */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Single Subscription Model Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400">Memuat konfigurasi paket...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => {
            const isFree = Number(plan.price) === 0;
            return (
              <div
                key={plan.id}
                className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden relative shadow-xl ${
                  !isFree
                    ? 'bg-slate-900 border-indigo-500/50 ring-2 ring-indigo-500/20'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Top Badge */}
                <div
                  className={`py-1.5 px-4 text-xs font-bold text-center uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                    isFree
                      ? 'bg-blue-600 text-white'
                      : 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isFree ? 'Pendaftaran Pertama (Bulan ke-1)' : 'Langganan Penuh (Bulan ke-2 dst)'}</span>
                </div>

                <div className="p-6 flex-1">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-white tracking-tight">{plan.name}</h3>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">{plan.code}</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Aktif
                    </span>
                  </div>

                  {/* Price Tag */}
                  <div className="mt-5 pb-5 border-b border-slate-800">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-white tracking-tight">
                        {isFree ? 'Gratis' : `Rp ${Number(plan.price).toLocaleString('id-ID')}`}
                      </span>
                      <span className="text-xs text-slate-400">/{plan.duration_days} hari (1 bulan)</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                      {plan.description || 'Akses seluruh fitur aplikasi.'}
                    </p>
                  </div>

                  {/* Quotas & Limits - Full Access */}
                  <div className="mt-5 space-y-3 text-xs">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Fasilitas Fitur Yang Diberikan:
                    </p>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/30">
                      <div className="flex items-center gap-2.5 text-slate-300">
                        <Store className="w-4 h-4 text-cyan-400" />
                        <span>Kapasitas Cabang Outlet</span>
                      </div>
                      <span className="font-bold text-emerald-400">
                        {plan.max_outlets === -1 ? 'Bisa Semua Cabang' : `${plan.max_outlets} Cabang`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/30">
                      <div className="flex items-center gap-2.5 text-slate-300">
                        <Users className="w-4 h-4 text-indigo-400" />
                        <span>Batas Staf & Kasir</span>
                      </div>
                      <span className="font-bold text-emerald-400">
                        {plan.max_users === -1 ? 'Tanpa Batas Staf' : `${plan.max_users} Staf`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/30">
                      <div className="flex items-center gap-2.5 text-slate-300">
                        <Coffee className="w-4 h-4 text-amber-400" />
                        <span>Katalog Menu Produk</span>
                      </div>
                      <span className="font-bold text-emerald-400">
                        {plan.max_products === -1 ? 'Tanpa Batas Menu' : `${plan.max_products} Produk`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/30">
                      <div className="flex items-center gap-2.5 text-slate-300">
                        <Receipt className="w-4 h-4 text-emerald-400" />
                        <span>Batas Transaksi Kasir POS</span>
                      </div>
                      <span className="font-bold text-emerald-400">
                        {plan.max_transactions === -1 ? 'Tanpa Batas Transaksi' : `${plan.max_transactions}/bln`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Edit Button */}
                <div className="p-4 bg-slate-950/70 border-t border-slate-800">
                  <button
                    onClick={() => openEditModal(plan)}
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer border border-slate-700 hover:border-indigo-500 shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isFree ? 'Ubah Informasi Uji Coba' : 'Ubah Harga Langganan Bulanan'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Ubah Konfigurasi: {editingPlan?.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Perubahan harga akan langsung tersimpan di database MySQL & dibaca aplikasi kasir
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nama Tampilan
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tarif Bulanan (Rupiah)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-bold">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Masukkan <span className="font-mono text-emerald-400">30000</span> untuk Rp 30.000, atau sesuaikan jika ingin menaikkan tarif di kemudian hari.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Deskripsi / Keterangan
                </label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs">
                <p className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Kapasitas Semua Fitur Penuh Terbuka</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Batas cabang, staf, menu, dan transaksi diatur ke nilai <span className="font-mono text-indigo-300">-1 (Tak Terbatas)</span> sehingga UMKM dapat menikmati seluruh fitur secara maksimal.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
