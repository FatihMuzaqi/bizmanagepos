import 'dart:io';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

void main() async {
  print('Generating Manual Book UsahaKu PDF...');

  final pdf = pw.Document(
    title: 'Manual Book Panduan Penggunaan Aplikasi UsahaKu',
    author: 'Tim UsahaKu POS & ERP',
  );

  // Palette
  const primaryColor = PdfColor.fromInt(0xFF0284C7); // Sky Blue / Cyan
  const primaryDark = PdfColor.fromInt(0xFF0369A1);
  const primaryLight = PdfColor.fromInt(0xFFF0F9FF);
  const accentGreen = PdfColor.fromInt(0xFF10B981);
  const textDark = PdfColor.fromInt(0xFF0F172A);
  const textMuted = PdfColor.fromInt(0xFF475569);
  const borderColor = PdfColor.fromInt(0xFFE2E8F0);
  const cardBg = PdfColor.fromInt(0xFFF8FAFC);
  const warningColor = PdfColor.fromInt(0xFFD97706);

  // Typography
  final titleStyle = pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold, color: primaryDark);
  final h2Style = pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold, color: primaryDark);
  final h3Style = pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold, color: textDark);
  final bodyStyle = const pw.TextStyle(fontSize: 8.8, color: textDark, lineSpacing: 2.8);
  final boldBodyStyle = pw.TextStyle(fontSize: 8.8, fontWeight: pw.FontWeight.bold, color: textDark);
  final captionStyle = const pw.TextStyle(fontSize: 7.5, color: textMuted);

  pw.Widget buildChapterHeader(String chapterNum, String title) {
    return pw.Container(
      margin: const pw.EdgeInsets.only(top: 12, bottom: 8),
      padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: pw.BoxDecoration(
        color: primaryLight,
        borderRadius: pw.BorderRadius.circular(6),
        border: const pw.Border(left: pw.BorderSide(color: primaryDark, width: 4)),
      ),
      child: pw.Row(
        children: [
          pw.Text('$chapterNum: ', style: pw.TextStyle(color: primaryDark, fontWeight: pw.FontWeight.bold, fontSize: 12)),
          pw.Expanded(child: pw.Text(title, style: titleStyle)),
        ],
      ),
    );
  }

  pw.Widget buildStepBox(int stepNum, String title, String desc, {List<String>? subPoints}) {
    return pw.Container(
      margin: const pw.EdgeInsets.only(bottom: 6),
      padding: const pw.EdgeInsets.all(8),
      decoration: pw.BoxDecoration(
        color: cardBg,
        borderRadius: pw.BorderRadius.circular(6),
        border: pw.Border.all(color: borderColor, width: 0.8),
      ),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Container(
            width: 20,
            height: 20,
            decoration: const pw.BoxDecoration(color: primaryDark, shape: pw.BoxShape.circle),
            child: pw.Center(
              child: pw.Text('$stepNum', style: pw.TextStyle(color: PdfColors.white, fontWeight: pw.FontWeight.bold, fontSize: 9)),
            ),
          ),
          pw.SizedBox(width: 8),
          pw.Expanded(
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Text(title, style: h3Style),
                pw.SizedBox(height: 2),
                pw.Text(desc, style: bodyStyle),
                if (subPoints != null && subPoints.isNotEmpty) ...[
                  pw.SizedBox(height: 4),
                  ...subPoints.map((p) => pw.Padding(
                        padding: const pw.EdgeInsets.only(bottom: 2),
                        child: pw.Row(
                          crossAxisAlignment: pw.CrossAxisAlignment.start,
                          children: [
                            pw.Text('• ', style: pw.TextStyle(color: primaryDark, fontWeight: pw.FontWeight.bold, fontSize: 8)),
                            pw.Expanded(child: pw.Text(p, style: pw.TextStyle(fontSize: 8.2, color: textDark, lineSpacing: 2))),
                          ],
                        ),
                      )),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  pw.Widget buildTipBox(String title, String text, {PdfColor color = accentGreen}) {
    return pw.Container(
      margin: const pw.EdgeInsets.symmetric(vertical: 6),
      padding: const pw.EdgeInsets.all(8),
      decoration: pw.BoxDecoration(
        color: PdfColor.fromInt(0xFFF0FDF4),
        borderRadius: pw.BorderRadius.circular(6),
        border: pw.Border.all(color: color, width: 0.8),
      ),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text('💡 ', style: const pw.TextStyle(fontSize: 10)),
          pw.Expanded(
            child: pw.RichText(
              text: pw.TextSpan(
                children: [
                  pw.TextSpan(text: '$title: ', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8.5, color: color)),
                  pw.TextSpan(text: text, style: pw.TextStyle(fontSize: 8.5, color: textDark, lineSpacing: 2.2)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Cover Page
  pdf.addPage(
    pw.Page(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(36),
      build: (ctx) {
        return pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Container(
              padding: const pw.EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: pw.BoxDecoration(color: primaryDark, borderRadius: pw.BorderRadius.circular(6)),
              child: pw.Text('BUKU PANDUAN PENGGUNAAN (MANUAL BOOK)', style: pw.TextStyle(color: PdfColors.white, fontWeight: pw.FontWeight.bold, fontSize: 10)),
            ),
            pw.Spacer(flex: 1),
            pw.Container(
              padding: const pw.EdgeInsets.all(24),
              decoration: pw.BoxDecoration(
                color: primaryLight,
                borderRadius: pw.BorderRadius.circular(12),
                border: pw.Border.all(color: const PdfColor.fromInt(0xFFBAE6FD), width: 1.5),
              ),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text('USAHAKU POS & BUSINESS ERP', style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold, color: primaryDark, letterSpacing: 1.5)),
                  pw.SizedBox(height: 10),
                  pw.Text(
                    'Panduan Praktis Langkah demi Langkah Mengoperasikan Sistem Kasir, Inventaris Resep, & Laporan Keuangan',
                    style: pw.TextStyle(fontSize: 20, fontWeight: pw.FontWeight.bold, color: textDark, height: 1.3),
                  ),
                  pw.SizedBox(height: 10),
                  pw.Text(
                    'Ditujukan khusus untuk Pemilik Toko, Manajer Cabang, dan Staf Kasir agar langsung mahir menggunakan aplikasi tanpa kesulitan teknis.',
                    style: pw.TextStyle(fontSize: 10, color: textMuted, lineSpacing: 2.5),
                  ),
                ],
              ),
            ),
            pw.SizedBox(height: 25),
            pw.Container(
              padding: const pw.EdgeInsets.all(14),
              decoration: pw.BoxDecoration(
                color: cardBg,
                borderRadius: pw.BorderRadius.circular(8),
                border: pw.Border.all(color: borderColor),
              ),
              child: pw.Column(
                children: [
                  pw.Row(children: [
                    pw.Expanded(child: pw.Text('Target Pengguna', style: boldBodyStyle)),
                    pw.Expanded(flex: 2, child: pw.Text(': Kasir Pemula, Barista, Manajer Gerai, Owner UMKM', style: bodyStyle)),
                  ]),
                  pw.SizedBox(height: 6),
                  pw.Row(children: [
                    pw.Expanded(child: pw.Text('Cakupan Modul', style: boldBodyStyle)),
                    pw.Expanded(flex: 2, child: pw.Text(': Beranda, Kasir POS, Produk, Stok Resep, & Laporan', style: bodyStyle)),
                  ]),
                  pw.SizedBox(height: 6),
                  pw.Row(children: [
                    pw.Expanded(child: pw.Text('Perangkat yang Didukung', style: boldBodyStyle)),
                    pw.Expanded(flex: 2, child: pw.Text(': Smartphone Android, Tablet Kasir, Laptop/PC Web', style: bodyStyle)),
                  ]),
                  pw.SizedBox(height: 6),
                  pw.Row(children: [
                    pw.Expanded(child: pw.Text('Penerbit', style: boldBodyStyle)),
                    pw.Expanded(flex: 2, child: pw.Text(': Tim Pengembang UsahaKu Indonesia (Oktober 2026)', style: bodyStyle)),
                  ]),
                ],
              ),
            ),
            pw.Spacer(flex: 2),
            pw.Divider(color: borderColor),
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text('UsahaKu POS - Aplikasi Kasir & ERP Terpadu untuk UMKM Indonesia', style: captionStyle),
                pw.Text('Halaman 1', style: captionStyle),
              ],
            ),
          ],
        );
      },
    ),
  );

  // Content Pages
  pdf.addPage(
    pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(36),
      header: (ctx) => pw.Container(
        margin: const pw.EdgeInsets.only(bottom: 10),
        padding: const pw.EdgeInsets.only(bottom: 4),
        decoration: const pw.BoxDecoration(border: pw.Border(bottom: pw.BorderSide(color: borderColor, width: 0.8))),
        child: pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          children: [
            pw.Text('MANUAL BOOK: PANDUAN PENGGUNAAN USAHAKU', style: pw.TextStyle(fontSize: 7.5, color: textMuted, fontWeight: pw.FontWeight.bold)),
            pw.Text('Sistem Kasir & ERP Modern', style: pw.TextStyle(fontSize: 7.5, color: textMuted)),
          ],
        ),
      ),
      footer: (ctx) => pw.Container(
        margin: const pw.EdgeInsets.only(top: 10),
        padding: const pw.EdgeInsets.only(top: 4),
        decoration: const pw.BoxDecoration(border: pw.Border(top: pw.BorderSide(color: borderColor, width: 0.8))),
        child: pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          children: [
            pw.Text('UsahaKu Platform © 2026 - Hak Cipta Dilindungi', style: captionStyle),
            pw.Text('Halaman ${ctx.pageNumber} dari ${ctx.pagesCount}', style: captionStyle),
          ],
        ),
      ),
      build: (ctx) => [
        // =====================================================================
        // BAB 1: INSTALASI & PERSIAPAN
        // =====================================================================
        buildChapterHeader('BAB 1', 'INSTALASI & PERSIAPAN PERANGKAT'),
        pw.Text('Aplikasi UsahaKu dapat dijalankan di berbagai perangkat tanpa memerlukan spesifikasi komputer yang mahal.', style: bodyStyle),
        pw.SizedBox(height: 6),
        buildStepBox(
          1,
          'Akses Melalui Komputer / Laptop (Web POS)',
          'Buka browser Google Chrome atau Microsoft Edge di PC kasir Anda. Masukkan alamat URL UsahaKu yang diberikan admin. Klik tanda bintang (Bookmark) di browser agar halaman kasir mudah dibuka kembali setiap hari.',
        ),
        buildStepBox(
          2,
          'Instalasi di Smartphone / Tablet Android',
          'Unduh file aplikasi APK UsahaKu atau buka dari link PlayStore. Tekan pasang (Install). Jika muncul peringatan izin sumber tidak dikenal, pilih "Izinkan / Allow". Ikon UsahaKu akan otomatis muncul di layar utama.',
        ),
        buildStepBox(
          3,
          'Menghubungkan Printer Struk Bluetooth',
          'Nyalakan printer struk thermal (58mm/80mm). Buka menu Bluetooth di HP/Tablet kasir, cari nama printer (misal: MP-58 atau RPP02N), masukkan PIN pairing (biasanya 0000 atau 1234). Printer siap mencetak struk secara otomatis.',
        ),
        buildTipBox('Tips Printer', 'Gunakan kertas thermal standar 58mm untuk gerai kecil/booth es teh agar menghemat biaya kertas operasional harian.'),

        // =====================================================================
        // BAB 2: PENDAFTARAN & PEMBUATAN BISNIS
        // =====================================================================
        buildChapterHeader('BAB 2', 'PENDAFTARAN AKUN, LOGIN & BUAT TOKO'),
        buildStepBox(
          1,
          'Mendaftar Akun Pemilik Usaha (Register)',
          'Di halaman login awal, klik teks "Belum punya akun? Daftar Sekarang". Masukkan Nama Lengkap Anda, Nomor WhatsApp aktif, Email, dan buat Password minimal 6 karakter. Klik tombol "Daftar Akun".',
        ),
        buildStepBox(
          2,
          'Masuk ke Sistem (Login)',
          'Ketikkan Email dan Password yang telah didaftarkan, lalu klik tombol biru "Masuk ke Sistem". Sistem akan memverifikasi akun Anda dan mengarahkan ke dasbor toko.',
        ),
        buildStepBox(
          3,
          'Membuat Toko / Bisnis Baru Pertama Kali',
          'Saat pertama kali login, klik tombol "+ Buat Bisnis Baru". Masukkan Nama Bisnis (contoh: "Es Teh Nusantara Sukajadi"), pilih Jenis Usaha (F&B / Minuman), dan beri nama Cabang Utama Anda. Klik "Simpan & Mulai Kelola". Akun Anda otomatis mendapatkan Uji Coba Gratis 1 Bulan!',
        ),

        // =====================================================================
        // BAB 3: PANDUAN MENU BERANDA (DASHBOARD)
        // =====================================================================
        buildChapterHeader('BAB 3', 'PANDUAN MENU BERANDA (DASHBOARD)'),
        pw.Text('Beranda adalah pusat kendali untuk melihat rangkuman performa toko hari ini dalam satu layar ringkas.', style: bodyStyle),
        pw.SizedBox(height: 6),
        buildStepBox(
          1,
          'Bilah Navigasi Atas (Header & Switcher)',
          'Menampilkan nama toko dan nama cabang aktif. Tombol "Cabang" di kanan atas digunakan jika Anda memiliki beberapa cabang dan ingin berpindah memantau cabang lain. Ikon profil lingkaran di pojok kanan digunakan untuk ganti bisnis atau logout.',
        ),
        buildStepBox(
          2,
          'Kartu Sambutan & Indikator Cloud',
          'Menampilkan salam personal dan ikon awan hijau bertuliskan "Cloud Sinkron Aktif" yang memastikan internet Anda terhubung lancar ke server pusat.',
        ),
        buildStepBox(
          3,
          'Empat Kartu Angka Utama (Live KPI)',
          'Pantau 4 angka penting hari ini secara seketika (real-time):',
          subPoints: [
            'Penjualan Hari Ini: Total uang kotor (omset) yang masuk dari pembeli.',
            'Transaksi Hari Ini: Total struk/nota belanja yang selesai dilayani.',
            'Pengeluaran Kasir: Total uang kas kecil yang dikeluarkan (misal: beli es batu, gas).',
            'Laba Bersih Hari Ini: Total Omset dikurangi Pengeluaran hari ini secara otomatis.',
          ],
        ),
        buildStepBox(
          4,
          'Tombol Aksi Cepat (Quick Actions)',
          'Pintasan cepat untuk membuka Kasir POS, Menambah Menu Baru, Melihat Laporan, atau Mencatat Biaya Pengeluaran dalam 1 kali klik.',
        ),
        buildStepBox(
          5,
          'Daftar Menu Terlaris (Top Selling)',
          'Menampilkan peringkat menu makanan/minuman yang paling laku hari ini beserta jumlah cup yang terjual agar Anda tahu menu apa yang harus disiapkan lebih banyak.',
        ),

        // =====================================================================
        // BAB 4: PANDUAN MENU KASIR (POINT OF SALE)
        // =====================================================================
        buildChapterHeader('BAB 4', 'PANDUAN MENU KASIR (POS & PEMBAYARAN)'),
        pw.Text('Menu Kasir digunakan oleh staf kasir setiap hari untuk melayani pembeli dengan alur yang sangat cepat.', style: bodyStyle),
        pw.SizedBox(height: 6),
        buildStepBox(
          1,
          'Pilih Menu & Kategori',
          'Pilih tab kategori menu di atas (Tea Series, Milk Series, Camilan) atau cari menu di kotak pencarian. Klik foto menu yang dipesan pembeli.',
        ),
        buildStepBox(
          2,
          'Pilih Varian & Topping Tambahan (Jika Ada)',
          'Jika menu memiliki pilihan (contoh: Es Teh Melati), pilih Ukuran (Regular/Jumbo), Suhu (Dingin/Hangat), dan centang Topping tambahan (Boba +Rp2.000, Jelly +Rp1.500). Klik "Tambah ke Pesanan".',
        ),
        buildStepBox(
          3,
          'Cek Keranjang Pesanan Aktif',
          'Bilah pesanan aktif di bawah akan menampilkan jumlah item dan total harga. Klik bilah untuk melihat rincian, menambah/mengurangi jumlah (+/-), atau klik ikon tempat sampah merah untuk menghapus item.',
        ),
        buildStepBox(
          4,
          'Pilih Metode Pembayaran (Checkout)',
          'Klik tombol "Bayar Sekarang". Tersedia 3 metode pembayaran:',
          subPoints: [
            'Tunai (Cash): Klik tombol uang pas atau nominal Rp20.000, Rp50.000, Rp100.000. Sistem otomatis menghitung Uang Kembalian dengan tulisan hijau besar tanpa perlu kalkulator manual!',
            'QRIS: Menampilkan kode QRIS toko di layar. Arahkan pembeli untuk scan lewat GoPay, OVO, Dana, BCA, atau bank apa saja.',
            'Transfer Bank: Menampilkan nomor rekening toko untuk diverifikasi bukti transfernya.',
          ],
        ),
        buildStepBox(
          5,
          'Selesaikan Transaksi & Cetak Struk',
          'Klik "Konfirmasi & Selesaikan Transaksi". Layar menampilkan centang hijau sukses beserta rincian kembalian. Anda bisa klik "Cetak Struk", "Kirim WhatsApp", atau langsung klik "Transaksi Baru" untuk pembeli berikutnya.',
        ),

        // =====================================================================
        // BAB 5: PANDUAN MENU PRODUK (KATALOG MENU)
        // =====================================================================
        buildChapterHeader('BAB 5', 'PANDUAN MENU PRODUK (KATALOG MENU)'),
        buildStepBox(
          1,
          'Menambah Menu Jualan Baru',
          'Klik menu "Produk" di bawah, lalu klik tombol tambah (+). Masukkan Nama Menu, Kategori, Harga Jual Dasar, Modal HPP, dan foto produk. Klik Simpan. Menu langsung muncul di kasir.',
        ),
        buildStepBox(
          2,
          'Mengubah (Edit) Harga atau Nama Menu',
          'Klik tombol pensil pada kartu menu. Ubah harga atau data yang diinginkan, lalu klik Simpan. Kasir otomatis menggunakan harga yang baru diperbarui.',
        ),
        buildStepBox(
          3,
          'Menonaktifkan Menu Sementara (Out of Stock)',
          'Jika ada menu yang bahannya sedang habis, geser tombol sakelar menu menjadi "Non-Aktif". Menu otomatis disembunyikan dari layar kasir agar pembeli tidak kecewa.',
        ),

        // =====================================================================
        // BAB 6: PANDUAN MENU STOK & RESEP OTOMATIS
        // =====================================================================
        buildChapterHeader('BAB 6', 'PANDUAN STOK & RESEP BAHAN BAKU'),
        pw.Text('Fitur ini mengunci kebocoran bahan baku agar stok gudang selalu cocok dengan penjualan kasir.', style: bodyStyle),
        pw.SizedBox(height: 6),
        buildStepBox(
          1,
          'Konsep Resep Otomatis (Recipe-Based Auto Deduct)',
          'Kasir menjual menu "Es Teh Jumbo". Sistem otomatis memotong bahan baku mentah di gudang: 20 gram Daun Teh, 40 ml Gula Cair, 1 Cup Jumbo 22oz, dan 1 Sedotan saat transaksi berhasil. Tidak ada stok yang hilang tanpa jejak!',
        ),
        buildStepBox(
          2,
          'Melihat Sisa Stok & Peringatan Bahan Menipis',
          'Buka menu "Stok". Lihat sisa stok bahan baku. Warna hijau = stok aman, warna kuning = stok mendekati batas minimum (segera belanja), warna merah = stok habis.',
        ),
        buildStepBox(
          3,
          'Menambah Master Bahan Baku Baru',
          'Klik tab "Bahan Baku" -> klik (+). Isi nama bahan (misal: "Daun Teh Melati"), satuan unit (Gram, Ml, Pcs, Kg), dan batas minimum stok pengingat. Klik Simpan.',
        ),
        buildStepBox(
          4,
          'Menghubungkan Resep ke Menu Kasir',
          'Buka tab "Resep Menu", pilih menu yang ingin diatur (misal: Es Teh Original), lalu masukkan gramasi/takaran bahan bakunya. Klik Simpan Resep.',
        ),
        buildStepBox(
          5,
          'Tiga Jenis Mutasi Stok (Masuk, Keluar, Opname)',
          'Gunakan 3 tombol mutasi stok sesuai kebutuhan:',
          subPoints: [
            'Stok Masuk: Catat saat Anda belanja/kulakan bahan baku baru dari supplier. Stok sistem langsung bertambah.',
            'Stok Keluar: Catat jika ada bahan yang tumpah, kemasan bocor, atau expired.',
            'Stock Opname: Hitung fisik bahan di rak toko di akhir minggu, samakan angkanya di sistem agar nihil selisih.',
          ],
        ),

        // =====================================================================
        // BAB 7: PANDUAN MENU LAINNYA
        // =====================================================================
        buildChapterHeader('BAB 7', 'PANDUAN MENU LAINNYA (FITUR LENGKAP)'),
        buildStepBox(
          1,
          'Laporan Penjualan & Laba Rugi',
          'Buka "Laporan Penjualan & Laba". Pilih periode (Hari Ini, Kemarin, Minggu Ini, Bulan Ini). Klik tombol "Export Laporan" untuk mengunduh laporan dalam format Dokumen PDF resmi siap cetak, Spreadsheet Excel (.xls), atau CSV.',
        ),
        buildStepBox(
          2,
          'Riwayat Transaksi (History Kasir)',
          'Melihat semua arsip struk pesanan yang pernah dibuat, mencari nota lama pembeli, mencetak ulang struk jika kertas habis, atau membatalkan nota transaksi jika terjadi kesalahan.',
        ),
        buildStepBox(
          3,
          'Pencatatan Biaya (Expenses / Pengeluaran Operasional)',
          'Klik "Pencatatan Biaya", klik (+). Masukkan nominal pengeluaran kasir (misal: beli es batu kristal Rp15.000, bayar galon air Rp20.000). Pengeluaran ini otomatis memotong laba bersih harian di beranda!',
        ),
        buildStepBox(
          4,
          'Kategori & Topping Modifier',
          'Kelola kelompok menu dan atur varian topping tambahan (Boba, Jelly, Level Gula, Es Sedikit/Banyak) beserta harga tambahannya.',
        ),
        buildStepBox(
          5,
          'Manajemen Cabang / Outlet',
          'Bagi Anda yang membuka gerai cabang baru, klik "+ Tambah Cabang", masukkan alamat dan nomor telepon cabang. Anda bisa memantau seluruh cabang dari HP tanpa harus hadir langsung!',
        ),
        buildStepBox(
          6,
          'Ganti Bisnis & Keluar Akun (Logout)',
          'Jika Anda memiliki beberapa merek usaha yang berbeda, gunakan menu "Ganti Bisnis". Untuk keamanan kasir, lakukan "Keluar Akun" saat pergantian shift atau tutup gerai.',
        ),

        // =====================================================================
        // BAB 8: FAQ & TIPS KASIR
        // =====================================================================
        buildChapterHeader('BAB 8', 'TIPS & TANYA JAWAB (FAQ) KASIR'),
        buildStepBox(
          1,
          'Kenapa Uang Fisik di Laci Tidak Cocok dengan Penjualan?',
          'Penyebab paling sering: Staf kasir membeli es batu atau galon menggunakan uang laci kasir tetapi LUPA mencatatnya di menu "Pencatatan Biaya". Selalu catat setiap rupiah yang keluar dari laci!',
        ),
        buildStepBox(
          2,
          'Kenapa Menu di Layar Kasir Berwarna Abu-Abu & Tidak Bisa Diklik?',
          'Itu artinya salah satu bahan baku pada resep menu tersebut sudah habis (0) di gudang. Silakan masukkan data "Stok Masuk" setelah belanja bahan agar menu aktif kembali.',
        ),
        buildStepBox(
          3,
          'Bagaimana Jika Kertas Struk Printer Habis Saat Pelanggan Menunggu?',
          'Pasang roll kertas baru, lalu buka menu "Riwayat Transaksi", klik transaksi terakhir yang paling atas, dan klik tombol "Cetak Ulang Struk". Nota akan langsung keluar rapi.',
        ),
        buildTipBox('SOP Tutup Toko (Closing)', 'Sebelum pulang, kasir wajib: 1) Cocokkan uang fisik laci dengan angka "Penjualan Hari Ini" di beranda; 2) Pastikan semua pengeluaran es batu/gas sudah diinput di "Pencatatan Biaya"; 3) Lakukan Logout akun.'),
      ],
    ),
  );

  final outputDir = Directory('C:/Users/ACER/Documents/PEMROGRAMMAN/UsahaKu');
  final outputFile = File('${outputDir.path}/MANUAL_BOOK_PANDUAN_USAHAKU.pdf');
  final bytes = await pdf.save();
  await outputFile.writeAsBytes(bytes);

  print('Manual Book PDF Generated: ${outputFile.path}');
  print('Size: ${bytes.length} bytes');
}
