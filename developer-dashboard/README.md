# BizManage Developer Cockpit (React Dashboard)

Dashboard web khusus Developer / Superadmin untuk memonitoring sistem SaaS BizManage secara *real-time* dan mengontrol harga paket langganan secara terpusat.

---

## 🚀 Fitur Utama Dashboard

1. **Kontrol Harga & Paket SaaS (Live Price Engine):**
   - Menaikkan atau menurunkan harga langganan bulanan kapan saja (misal: Rp 30.000 menjadi Rp 50.000).
   - Mengubah kuota cabang, staf, menu, dan batas transaksi (mendukung nilai `-1` untuk kapasitas tanpa batas).
   - Menambahkan tingkatan paket baru secara instan yang langsung terbaca di aplikasi mobile/POS Flutter.

2. **Monitoring & Kontrol Pengguna (Users):**
   - Daftar seluruh akun pengguna terdaftar dengan fitur pencarian (nama, email, no HP).
   - Melihat bisnis/toko yang dimiliki masing-masing user.
   - Tindakan langsung untuk mengaktifkan atau memblokir akses pengguna.

3. **Monitoring Bisnis & Cabang Outlet (Businesses):**
   - Melihat seluruh UMKM yang terdaftar beserta jumlah cabang outlet aktifnya.
   - Melihat paket langganan yang sedang digunakan oleh masing-masing bisnis.

4. **Monitoring & Manajemen Langganan (Subscriptions):**
   - Filter status: *Semua*, *Trial 1 Bulan*, *Aktif Berbayar*, dan *Kedaluwarsa*.
   - Aksi developer untuk perpanjang masa aktif (+14, +30, +60 hari) atau mengubah status langganan secara manual.

5. **Analitik Finansial & Metrik Sistem:**
   - Total Pengguna, Total Bisnis, dan Total Cabang Outlet.
   - Estimasi MRR (*Monthly Recurring Revenue*) dari langganan aktif.
   - Akumulasi total transaksi dan volume perputaran uang kasir.

---

## 🛠️ Cara Menjalankan Developer Dashboard

### 1. Pastikan Server Backend Express Berjalan
Buka terminal di folder `backend`:
```bash
cd backend
npm run dev
# Server berjalan di http://localhost:5000
```

### 2. Jalankan React Dashboard
Buka terminal baru di folder `developer-dashboard`:
```bash
cd developer-dashboard
npm run dev
# Dashboard berjalan di http://localhost:3000
```

Buka browser dan akses: [http://localhost:3000](http://localhost:3000)

---

## 🔐 Kredensial Login Developer

- **Email:** `developer@bizmanage.local`
- **Password:** `Developer#2026!`
- **Master Key (Opsional):** `developer_super_secret_2026`
*(Kredensial dapat disesuaikan pada file `.env` di backend).*
