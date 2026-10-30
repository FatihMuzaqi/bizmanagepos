import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Building,
  Store,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Shield,
  Phone,
  Mail,
  AlertCircle,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Check,
  Sparkles,
  X,
} from 'lucide-react';
import { developerApi } from '../api';

export default function UsersView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Password Reset Modal State
  const [passwordModal, setPasswordModal] = useState({
    isOpen: false,
    user: null,
    newPassword: '',
    confirmPassword: '',
    showPassword: false,
    loading: false,
    error: '',
    success: '',
  });

  const openPasswordModal = (user) => {
    setPasswordModal({
      isOpen: true,
      user,
      newPassword: '',
      confirmPassword: '',
      showPassword: false,
      loading: false,
      error: '',
      success: '',
    });
  };

  const closePasswordModal = () => {
    setPasswordModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleGeneratePassword = () => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const pass = `UsahaKu#${randomDigits}`;
    setPasswordModal((prev) => ({
      ...prev,
      newPassword: pass,
      confirmPassword: pass,
      showPassword: true,
      error: '',
    }));
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!passwordModal.newPassword) {
      setPasswordModal((prev) => ({ ...prev, error: 'Password baru tidak boleh kosong.' }));
      return;
    }
    if (passwordModal.newPassword.length < 6) {
      setPasswordModal((prev) => ({ ...prev, error: 'Password baru minimal harus 6 karakter.' }));
      return;
    }
    if (passwordModal.newPassword !== passwordModal.confirmPassword) {
      setPasswordModal((prev) => ({ ...prev, error: 'Konfirmasi password tidak cocok.' }));
      return;
    }

    setPasswordModal((prev) => ({ ...prev, loading: true, error: '', success: '' }));
    try {
      await developerApi.resetUserPassword(passwordModal.user.id, passwordModal.newPassword);
      setPasswordModal((prev) => ({
        ...prev,
        loading: false,
        success: `Password akun ${passwordModal.user.name} berhasil diperbarui!`,
      }));
      setTimeout(() => {
        closePasswordModal();
      }, 1600);
    } catch (err) {
      setPasswordModal((prev) => ({
        ...prev,
        loading: false,
        error: err.message || 'Gagal mengubah password.',
      }));
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await developerApi.getUsers({ page, limit: 15, search });
      setUsers(res.data.users || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalCount(res.data.total || 0);
    } catch (err) {
      setError(err.message || 'Gagal memuat daftar pengguna');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleToggleStatus = async (user) => {
    const nextStatus = !user.is_active;
    const confirm = window.confirm(
      `Apakah Anda yakin ingin ${nextStatus ? 'mengaktifkan' : 'menonaktifkan/memblokir'} akun "${user.name}"?`
    );
    if (!confirm) return;

    try {
      await developerApi.toggleUserStatus(user.id, nextStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: nextStatus } : u))
      );
    } catch (err) {
      alert(err.message || 'Gagal mengubah status pengguna.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Search Bar */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Monitoring Pengguna Terdaftar</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Total {totalCount} akun terdaftar di sistem UsahaKu
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <form onSubmit={handleSearch} className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, email, hp..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </form>

          <button
            onClick={() => {
              setPage(1);
              fetchUsers();
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
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                <th className="py-3.5 px-4">Pengguna</th>
                <th className="py-3.5 px-4">Kontak</th>
                <th className="py-3.5 px-4">Bisnis / Usaha</th>
                <th className="py-3.5 px-4">Status Akun</th>
                <th className="py-3.5 px-4">Tgl Terdaftar</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Memuat data pengguna...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    Tidak ada pengguna yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const ownedBiz = user.ownedBusinesses || [];
                  const activeSub = ownedBiz[0]?.subscriptions?.[0];

                  return (
                    <tr key={user.id} className="hover:bg-slate-800/40 transition">
                      {/* Name & ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center shrink-0">
                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{user.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">UID: #{user.id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                          <span>{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <Phone className="w-3 h-3" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </td>

                      {/* Owned Businesses */}
                      <td className="py-3.5 px-4">
                        {ownedBiz.length > 0 ? (
                          <div className="space-y-1">
                            {ownedBiz.map((b) => (
                              <div key={b.id} className="flex items-center gap-1.5">
                                <Building className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                <span className="font-medium text-slate-200">{b.name}</span>
                              </div>
                            ))}
                            {activeSub && (
                              <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                {activeSub.plan?.name}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Belum buat bisnis</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                            user.is_active
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                          {user.is_active ? 'Aktif' : 'Diblokir'}
                        </span>
                      </td>

                      {/* Registered Date */}
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {new Date(user.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openPasswordModal(user)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition cursor-pointer"
                            title="Ubah / Reset Password Pengguna"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Password</span>
                          </button>

                          <button
                            onClick={() => handleToggleStatus(user)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                              user.is_active
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                            }`}
                          >
                            {user.is_active ? 'Blokir' : 'Aktifkan'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-950/20">
          <span>
            Halaman {page} dari {totalPages} ({totalCount} pengguna)
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

      {/* Modal Reset / Ubah Password */}
      {passwordModal.isOpen && passwordModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Ubah Password Pengguna</h3>
                  <p className="text-xs text-slate-400">Atur ulang kata sandi akses akun pengguna</p>
                </div>
              </div>
              <button
                onClick={closePasswordModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSavePassword} className="p-5 space-y-4">
              {/* User Info Card */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Nama Pengguna:</span>
                  <span className="font-semibold text-white">{passwordModal.user.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Email:</span>
                  <span className="font-mono text-slate-300">{passwordModal.user.email}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">ID Pengguna:</span>
                  <span className="font-mono text-indigo-400">UID #{passwordModal.user.id}</span>
                </div>
              </div>

              {/* Status Alert */}
              {passwordModal.error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordModal.error}</span>
                </div>
              )}

              {passwordModal.success && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{passwordModal.success}</span>
                </div>
              )}

              {/* Password Baru */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Password Baru</label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition font-medium"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Acak Password</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={passwordModal.showPassword ? 'text' : 'password'}
                    value={passwordModal.newPassword}
                    onChange={(e) =>
                      setPasswordModal((prev) => ({ ...prev, newPassword: e.target.value, error: '' }))
                    }
                    placeholder="Minimal 6 karakter..."
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setPasswordModal((prev) => ({ ...prev, showPassword: !prev.showPassword }))
                    }
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {passwordModal.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Konfirmasi Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Konfirmasi Password Baru</label>
                <div className="relative">
                  <input
                    type={passwordModal.showPassword ? 'text' : 'password'}
                    value={passwordModal.confirmPassword}
                    onChange={(e) =>
                      setPasswordModal((prev) => ({ ...prev, confirmPassword: e.target.value, error: '' }))
                    }
                    placeholder="Ulangi password baru..."
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setPasswordModal((prev) => ({ ...prev, showPassword: !prev.showPassword }))
                    }
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {passwordModal.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Notice */}
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Catatan: Setelah password diubah, sesi aktif pengguna di aplikasi POS / web akan otomatis di-reset untuk keamanan.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  disabled={passwordModal.loading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={passwordModal.loading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm shadow-indigo-500/20"
                >
                  {passwordModal.loading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <KeyRound className="w-3.5 h-3.5" />
                  )}
                  <span>Simpan Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
