import 'dart:io';
import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

void main() async {
  print('Generating Laporan UsahaKu PDF...');

  final pdf = pw.Document(
    title: 'Laporan Sistem Aplikasi UsahaKu - POS & Multi-Outlet ERP',
    author: 'Tim Pengembang UsahaKu',
  );

  // Colors
  const primaryColor = PdfColor.fromInt(0xFF1E3A8A); // Indigo / Deep Blue
  const primaryLight = PdfColor.fromInt(0xFFEFF6FF);
  const secondaryColor = PdfColor.fromInt(0xFF0D9488); // Teal
  const textDark = PdfColor.fromInt(0xFF1E293B);
  const textMuted = PdfColor.fromInt(0xFF64748B);
  const borderColor = PdfColor.fromInt(0xFFE2E8F0);
  const cardBg = PdfColor.fromInt(0xFFF8FAFC);
  const dangerColor = PdfColor.fromInt(0xFFEF4444);

  // Helper styles
  final h1Style = pw.TextStyle(
    fontSize: 18,
    fontWeight: pw.FontWeight.bold,
    color: primaryColor,
  );

  final h2Style = pw.TextStyle(
    fontSize: 13,
    fontWeight: pw.FontWeight.bold,
    color: primaryColor,
  );

  final bodyStyle = const pw.TextStyle(
    fontSize: 9.5,
    color: textDark,
    lineSpacing: 3.5,
  );

  final boldBodyStyle = pw.TextStyle(
    fontSize: 9.5,
    fontWeight: pw.FontWeight.bold,
    color: textDark,
  );

  final captionStyle = const pw.TextStyle(
    fontSize: 8,
    color: textMuted,
  );

  pw.Widget buildSectionHeader(String number, String title) {
    return pw.Container(
      margin: const pw.EdgeInsets.only(top: 14, bottom: 8),
      padding: const pw.EdgeInsets.only(bottom: 4),
      decoration: const pw.BoxDecoration(
        border: pw.Border(bottom: pw.BorderSide(color: primaryColor, width: 1.5)),
      ),
      child: pw.Row(
        children: [
          pw.Container(
            padding: const pw.EdgeInsets.symmetric(horizontal: 7, vertical: 3),
            decoration: pw.BoxDecoration(
              color: primaryColor,
              borderRadius: pw.BorderRadius.circular(4),
            ),
            child: pw.Text(
              number,
              style: pw.TextStyle(color: PdfColors.white, fontWeight: pw.FontWeight.bold, fontSize: 10),
            ),
          ),
          pw.SizedBox(width: 8),
          pw.Expanded(
            child: pw.Text(title, style: h1Style),
          ),
        ],
      ),
    );
  }

  pw.Widget buildSubSection(String title) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(top: 10, bottom: 4),
      child: pw.Text(title, style: h2Style),
    );
  }

  pw.Widget buildCalloutBox(String text, {PdfColor color = secondaryColor, PdfColor bg = primaryLight}) {
    return pw.Container(
      margin: const pw.EdgeInsets.symmetric(vertical: 6),
      padding: const pw.EdgeInsets.all(10),
      decoration: pw.BoxDecoration(
        color: bg,
        borderRadius: pw.BorderRadius.circular(6),
        border: pw.Border.all(color: color, width: 0.8),
      ),
      child: pw.Text(
        text,
        style: pw.TextStyle(fontSize: 9, color: textDark, fontStyle: pw.FontStyle.italic, lineSpacing: 2.5),
      ),
    );
  }

  pw.Widget buildBulletPoint(String title, String desc) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 5, left: 4),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Container(
            margin: const pw.EdgeInsets.only(top: 4, right: 6),
            width: 4.5,
            height: 4.5,
            decoration: const pw.BoxDecoration(
              color: primaryColor,
              shape: pw.BoxShape.circle,
            ),
          ),
          pw.Expanded(
            child: pw.RichText(
              text: pw.TextSpan(
                children: [
                  pw.TextSpan(text: '$title: ', style: boldBodyStyle),
                  pw.TextSpan(text: desc, style: bodyStyle),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  pw.Widget buildCard(String title, String subtitle, List<String> points, {PdfColor accent = primaryColor}) {
    return pw.Container(
      margin: const pw.EdgeInsets.only(bottom: 8),
      padding: const pw.EdgeInsets.all(9),
      decoration: pw.BoxDecoration(
        color: cardBg,
        borderRadius: pw.BorderRadius.circular(6),
        border: pw.Border.all(color: borderColor),
      ),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Row(
            children: [
              pw.Container(width: 3.5, height: 14, color: accent),
              pw.SizedBox(width: 6),
              pw.Text(title, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10.5, color: accent)),
            ],
          ),
          if (subtitle.isNotEmpty) ...[
            pw.SizedBox(height: 3),
            pw.Text(subtitle, style: pw.TextStyle(fontSize: 8.5, color: textMuted)),
          ],
          pw.SizedBox(height: 5),
          ...points.map((p) => pw.Padding(
                padding: const pw.EdgeInsets.only(bottom: 2.5),
                child: pw.Row(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('• ', style: pw.TextStyle(color: accent, fontWeight: pw.FontWeight.bold, fontSize: 9)),
                    pw.Expanded(child: pw.Text(p, style: pw.TextStyle(fontSize: 8.8, color: textDark, lineSpacing: 2))),
                  ],
                ),
              )),
        ],
      ),
    );
  }

  // Cover Page
  pdf.addPage(
    pw.Page(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(40),
      build: (ctx) {
        return pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Container(
                  padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: pw.BoxDecoration(
                    color: primaryColor,
                    borderRadius: pw.BorderRadius.circular(6),
                  ),
                  child: pw.Text(
                    'USAHAKU POS & ERP',
                    style: pw.TextStyle(color: PdfColors.white, fontWeight: pw.FontWeight.bold, fontSize: 11),
                  ),
                ),
                pw.Text('DOKUMEN SPESIFIKASI SISTEM', style: pw.TextStyle(fontSize: 9, color: textMuted, fontWeight: pw.FontWeight.bold)),
              ],
            ),
            pw.Spacer(flex: 1),
            pw.Container(
              padding: const pw.EdgeInsets.all(20),
              decoration: pw.BoxDecoration(
                color: primaryLight,
                borderRadius: pw.BorderRadius.circular(12),
                border: pw.Border.all(color: const PdfColor.fromInt(0xFFBFDBFE), width: 1.5),
              ),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text('LAPORAN DESAIN SISTEM & PROPOSAL BISNIS',
                      style: pw.TextStyle(fontSize: 10.5, fontWeight: pw.FontWeight.bold, color: secondaryColor, letterSpacing: 1.2)),
                  pw.SizedBox(height: 10),
                  pw.Text(
                    'USAHAKU: Solusi Point of Sale & Multi-Outlet Enterprise Resource Planning Berbasis Resep Otomatis',
                    style: pw.TextStyle(fontSize: 21, fontWeight: pw.FontWeight.bold, color: primaryColor, height: 1.3),
                  ),
                  pw.SizedBox(height: 12),
                  pw.Text(
                    'Kajian Komprehensif: Latar Belakang Masalah, Solusi Teknologi, Tujuan Strategis, dan Analisis Manfaat bagi UMKM & Bisnis Multi-Cabang',
                    style: pw.TextStyle(fontSize: 10.5, color: textDark, lineSpacing: 3),
                  ),
                ],
              ),
            ),
            pw.SizedBox(height: 25),
            pw.Container(
              padding: const pw.EdgeInsets.all(15),
              decoration: pw.BoxDecoration(
                color: cardBg,
                borderRadius: pw.BorderRadius.circular(8),
                border: pw.Border.all(color: borderColor),
              ),
              child: pw.Column(
                children: [
                  pw.Row(
                    children: [
                      pw.Expanded(child: pw.Text('Entitas Produk', style: boldBodyStyle)),
                      pw.Expanded(flex: 2, child: pw.Text(': Platform UsahaKu (POS & ERP Multi-Cabang)', style: bodyStyle)),
                    ],
                  ),
                  pw.SizedBox(height: 6),
                  pw.Row(
                    children: [
                      pw.Expanded(child: pw.Text('Sektor Target', style: boldBodyStyle)),
                      pw.Expanded(flex: 2, child: pw.Text(': F&B (Food & Beverages), Retail, Usaha Waralaba / Kemitraan', style: bodyStyle)),
                    ],
                  ),
                  pw.SizedBox(height: 6),
                  pw.Row(
                    children: [
                      pw.Expanded(child: pw.Text('Arsitektur', style: boldBodyStyle)),
                      pw.Expanded(flex: 2, child: pw.Text(': Client-Server (Flutter Web/Mobile + Node.js Express REST API)', style: bodyStyle)),
                    ],
                  ),
                  pw.SizedBox(height: 6),
                  pw.Row(
                    children: [
                      pw.Expanded(child: pw.Text('Waktu Penerbitan', style: boldBodyStyle)),
                      pw.Expanded(flex: 2, child: pw.Text(': Oktober 2026', style: bodyStyle)),
                    ],
                  ),
                  pw.SizedBox(height: 6),
                  pw.Row(
                    children: [
                      pw.Expanded(child: pw.Text('Klasifikasi Dokumen', style: boldBodyStyle)),
                      pw.Expanded(flex: 2, child: pw.Text(': Dokumen Teknis & Strategis (Whitepaper / Laporan)', style: bodyStyle)),
                    ],
                  ),
                ],
              ),
            ),
            pw.Spacer(flex: 2),
            pw.Divider(color: borderColor),
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text('UsahaKu Platform - Enterprise Digital Solution for Indonesian MSMEs', style: captionStyle),
                pw.Text('Halaman 1', style: captionStyle),
              ],
            ),
          ],
        );
      },
    ),
  );

  // Content Pages (MultiPage)
  pdf.addPage(
    pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(36),
      header: (ctx) {
        return pw.Container(
          margin: const pw.EdgeInsets.only(bottom: 12),
          padding: const pw.EdgeInsets.only(bottom: 4),
          decoration: const pw.BoxDecoration(
            border: pw.Border(bottom: pw.BorderSide(color: borderColor, width: 0.8)),
          ),
          child: pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Text('USAHAKU: Laporan Masalah, Solusi, Tujuan & Manfaat', style: pw.TextStyle(fontSize: 8, color: textMuted, fontWeight: pw.FontWeight.bold)),
              pw.Text('Sistem Manajemen Bisnis & Kasir Modern', style: pw.TextStyle(fontSize: 8, color: textMuted)),
            ],
          ),
        );
      },
      footer: (ctx) {
        return pw.Container(
          margin: const pw.EdgeInsets.only(top: 12),
          padding: const pw.EdgeInsets.only(top: 4),
          decoration: const pw.BoxDecoration(
            border: pw.Border(top: pw.BorderSide(color: borderColor, width: 0.8)),
          ),
          child: pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Text('UsahaKu Platform © 2026 - Hak Cipta Dilindungi', style: captionStyle),
              pw.Text('Halaman ${ctx.pageNumber} dari ${ctx.pagesCount}', style: captionStyle),
            ],
          ),
        );
      },
      build: (ctx) => [
        // =====================================================================
        // BAB I: LATAR BELAKANG MASALAH
        // =====================================================================
        buildSectionHeader('BAB I', 'LATAR BELAKANG MASALAH'),
        pw.Text(
          'Sektor Usaha Mikro, Kecil, dan Menengah (UMKM), khususnya di bidang Food and Beverage (F&B) seperti gerai teh kekinian, kedai kopi, dan makanan cepat saji, merupakan pilar ekonomi dengan volume transaksi harian yang sangat tinggi. Kendati demikian, sebagian besar pelaku usaha masih mengoperasikan bisnisnya dengan infrastruktur konvensional atau perangkat lunak terpisah yang saling terisolasi.',
          style: bodyStyle,
        ),
        pw.SizedBox(height: 6),
        buildCalloutBox(
          'Fakta Lapangan: Sekitar 70% kegagalan bisnis UMKM yang berekspansi ke multi-cabang bukan disebabkan oleh produk yang tidak laku, melainkan kebocoran bahan baku (inventory shrinkage), manipulasi kas manual, dan ketidaktahuan atas Laba Bersih riil akibat pencatatan operasional yang lambat dan terfragmentasi.',
        ),
        buildSubSection('1.1 Masalah Utama yang Dihadapi Pelaku Usaha:'),
        buildBulletPoint(
          'Pencatatan Transaksi Manual & Rawan Human Error',
          'Penggunaan nota kertas, kalkulator, atau aplikasi kasir offline sering menyebabkan selisih uang fisik kasir di akhir shift, transaksi ganda, hilangnya arsip nota saat pemeriksaan, dan antrean pelanggan yang lambat pada jam sibuk.',
        ),
        buildBulletPoint(
          'Kebocoran Bahan Baku & Tidak Adanya Perhitungan Resep (BOM)',
          'Pada bisnis F&B, produk yang dijual adalah hasil racikan bahan baku mentah (misal: daun teh, gula cair, es batu, cup 16oz, sedotan). Tanpa sistem yang otomatis memotong stok bahan baku berdasarkan formula resep menu saat kasir checkout, pemilik usaha tidak pernah tahu apakah stok gudang hilang karena terbuang, rusak, atau diselewengkan.',
        ),
        buildBulletPoint(
          'Ketiadaan Visibilitas Multi-Cabang Secara Real-Time',
          'Pemilik bisnis yang memiliki 2 cabang atau lebih mengalami sindrom "Blind Spot Management". Owner harus menunggu kasir cabang mengirim foto rekap via WhatsApp setiap larut malam. Rekap ini rentan diedit, tidak dapat diaudit seketika, dan memperlambat pasokan ulang bahan baku antar-cabang.',
        ),
        buildBulletPoint(
          'Ketidakjelasan Laba Bersih (Net Profit vs Omset Palsu)',
          'Banyak pengusaha merasa omsetnya besar, namun kas usaha selalu habis. Hal ini terjadi karena biaya operasional harian (pembelian es, gas, listrik, biaya pemeliharaan, sewa ruko) tidak tercatat dalam satu sistem yang langsung memotong margin penjualan harian.',
        ),
        buildBulletPoint(
          'Kesulitan Rekonsiliasi Pembayaran Digital (QRIS / Transfer)',
          'Peralihan masyarakat ke pembayaran non-tunai (cashless/QRIS) sering menimbulkan kendala verifikasi manual pada struk bukti transfer palsu serta selisih pencatatan antara uang tunai di laci dan dana masuk di rekening bank.',
        ),

        // =====================================================================
        // BAB II: SOLUSI YANG DITAWARKAN (USAHAKU)
        // =====================================================================
        buildSectionHeader('BAB II', 'SOLUSI TEKNOLOGI APLIKASI "USAHAKU"'),
        pw.Text(
          'Aplikasi "USAHAKU" hadir sebagai platform Point of Sale (POS) dan Enterprise Resource Planning (ERP) cerdas yang dirancang khusus untuk memecahkan seluruh persoalan operasional, inventaris, dan keuangan bisnis multi-cabang dalam satu ekosistem terpadu.',
          style: bodyStyle,
        ),
        pw.SizedBox(height: 6),
        buildCard(
          '1. Point of Sale (POS) Cepat, Responsif & Multi-Metode Pembayaran',
          'Frontend berbasis Flutter yang modern dan intuitif dengan alur transaksi instan',
          [
            'Katalog menu visual dengan varian (Hot/Ice, Regular/Large) dan modifier/topping (Boba, Jelly, Sugar Level).',
            'Sistem keranjang cerdas dengan tombol hapus cepat dan proteksi stok kosong.',
            'Dukungan pembayaran multi-metode: Tunai (otomatis menghitung kembalian), QRIS Dinamis, dan Transfer Bank.',
            'Pencetakan struk fisik via printer thermal Bluetooth/USB serta struk digital.',
          ],
          accent: primaryColor,
        ),
        buildCard(
          '2. Manajemen Inventaris Berbasis Resep Otomatis (Recipe-Based Auto Deduct)',
          'Sinkronisasi instan antara penjualan di kasir dengan gudang bahan baku',
          [
            'Formula Resep Menu: Menghubungkan setiap porsi menu dengan bahan baku mentah (gramasi, ml, pcs).',
            'Auto Stock Deduction: Setiap transaksi sukses langsung memotong kuantitas stok bahan baku secara presisi.',
            'Trisula Pergerakan Stok: Pencatatan akurat untuk Stok Masuk (restock), Stok Keluar (rusak/waste), dan Stock Opname (penyelarasan fisik).',
            'Peringatan Stok Kritis (Low Stock Alert): Notifikasi dini ketika stok bahan baku mendekati batas aman minimum.',
          ],
          accent: secondaryColor,
        ),
        buildCard(
          '3. Sentralisasi Multi-Cabang & Kontrol Hak Akses Ketat (RBAC)',
          'Satu akun pemilik untuk memonitor seluruh gerai tanpa batasan jarak',
          [
            'Multi-Outlet Switcher: Owner dapat berpindah melihat performa Cabang A, B, atau Konsolidasi Semua Cabang dalam 1 klik.',
            'Role-Based Access Control: Pemisahan peran tegas antara Superadmin/Owner, Manajer Cabang, dan Kasir untuk mencegah kecurangan kas.',
            'Transfer Stok Antar-Cabang: Pelacakan mutasi bahan baku dari pusat logistik ke masing-masing cabang.',
          ],
          accent: const PdfColor.fromInt(0xFF6366F1),
        ),
        buildCard(
          '4. Kalkulasi Keuangan Komprehensif & Modul Pengeluaran Operasional',
          'Laba Bersih dihitung otomatis dari Omset dikurangi HPP dan Biaya Operasional',
          [
            'Pencatatan Beban Biaya: Input pengeluaran kas kecil (petty cash) kasir maupun beban bulanan secara real-time.',
            'Kalkulasi Otomatis Laba Rugi: Omset Penjualan - HPP Bahan Baku - Biaya Operasional = Laba Bersih Riil.',
            'Visualisasi Arus Kas & Metode Pembayaran: Memisahkan uang kas di laci fisik vs saldo uang elektronik.',
          ],
          accent: const PdfColor.fromInt(0xFF059669),
        ),
        buildCard(
          '5. Ekspor Laporan Eksekutif Multi-Format Profesional',
          'Penyajian data untuk kebutuhan pembukuan, evaluasi bisnis, dan pelaporan pajak/investor',
          [
            'Export Dokumen PDF: Dokumen A4 siap cetak dengan kartu KPI, tabel rincian menu, perbandingan cabang, dan analisis biaya.',
            'Export Excel Multi-Sheet (.xls): Buku kerja native dengan 4 sheet terpisah (Ringkasan, Performa Menu, Cabang, Pengeluaran).',
            'Export Universal CSV (.csv): Format data mentah standar UTF-8 untuk integrasi ke software akuntansi lanjutan.',
          ],
          accent: const PdfColor.fromInt(0xFFD97706),
        ),

        // =====================================================================
        // BAB III: TUJUAN SISTEM
        // =====================================================================
        buildSectionHeader('BAB III', 'TUJUAN PENGEMBANGAN SISTEM'),
        pw.Text(
          'Tujuan utama dari perancangan dan implementasi aplikasi UsahaKu terbagi menjadi tiga dimensi strategis:',
          style: bodyStyle,
        ),
        pw.SizedBox(height: 6),
        pw.Row(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Expanded(
              child: buildCard(
                'A. Tujuan Operasional',
                'Efisiensi alur kerja harian',
                [
                  'Mengurangi waktu antrean kasir menjadi rata-rata di bawah 15 detik per transaksi.',
                  'Mengeliminasi 100% proses rekap kertas manual di setiap akhir shift kerja kasir.',
                  'Memastikan akurasi stok fisik dan sistem berada di atas tingkat toleransi 98%.',
                ],
                accent: primaryColor,
              ),
            ),
            pw.SizedBox(width: 8),
            pw.Expanded(
              child: buildCard(
                'B. Tujuan Finansial',
                'Transparansi & proteksi laba',
                [
                  'Mencegah kebocoran dana kas kasir (cash shrinkage) melalui rekonsiliasi otomatis.',
                  'Mengontrol HPP (Harga Pokok Penjualan) agar margin keuntungan tetap terjaga stabil.',
                  'Mengetahui profitabilitas riil setiap menu dan setiap cabang setiap hari.',
                ],
                accent: secondaryColor,
              ),
            ),
          ],
        ),
        buildCard(
          'C. Tujuan Strategis & Manajerial',
          'Akselerasi pertumbuhan bisnis jangka panjang',
          [
            'Menyediakan Executive Dashboard berbasis data nyata (data-driven) agar Owner dapat memutuskan cabang mana yang layak diekspansi dan cabang mana yang butuh evaluasi efisiensi.',
            'Mempermudah standardisasi SOP (Standar Operasional Prosedur) bagi bisnis yang ingin membuka cabang kemitraan / waralaba (franchise).',
            'Menciptakan rekam jejak keuangan yang rapi dan kredibel untuk pengajuan permodalan perbankan atau kerja sama investor.',
          ],
          accent: const PdfColor.fromInt(0xFF7C3AED),
        ),

        // =====================================================================
        // BAB IV: MANFAAT SISTEM
        // =====================================================================
        buildSectionHeader('BAB IV', 'MANFAAT IMPLEMENTASI APLIKASI'),
        pw.Text(
          'Penerapan aplikasi UsahaKu memberikan dampak langsung bagi seluruh pemangku kepentingan dalam ekosistem bisnis:',
          style: bodyStyle,
        ),
        pw.SizedBox(height: 8),

        pw.Table(
          border: pw.TableBorder.all(color: borderColor, width: 0.8),
          columnWidths: {
            0: const pw.FlexColumnWidth(1.2),
            1: const pw.FlexColumnWidth(2.5),
            2: const pw.FlexColumnWidth(2.3),
          },
          children: [
            pw.TableRow(
              decoration: const pw.BoxDecoration(color: primaryLight),
              children: [
                pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('Pihak Terkait', style: boldBodyStyle)),
                pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('Manfaat Operasional & Bisnis', style: boldBodyStyle)),
                pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('Dampak Positif / Output', style: boldBodyStyle)),
              ],
            ),
            pw.TableRow(
              children: [
                pw.Padding(
                  padding: const pw.EdgeInsets.all(6),
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('Pemilik Bisnis (Owner)', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8.8, color: primaryColor)),
                      pw.Text('Pucuk Pimpinan', style: captionStyle),
                    ],
                  ),
                ),
                pw.Padding(
                  padding: const pw.EdgeInsets.all(6),
                  child: pw.Text(
                    '• Dapat memantau seluruh cabang dari smartphone/laptop tanpa harus hadir fisik di outlet.\n• Mencegah kecurangan kasir dan kebocoran persediaan bahan baku.\n• Laporan laba/rugi otomatis tanpa perlu membayar staf audit manual.',
                    style: pw.TextStyle(fontSize: 8.5, lineSpacing: 2),
                  ),
                ),
                pw.Padding(
                  padding: const pw.EdgeInsets.all(6),
                  child: pw.Text(
                    'Ketenangan pikiran (Peace of Mind), kontrol penuh atas modal, dan kecepatan dalam mengambil keputusan ekspansi cabang.',
                    style: pw.TextStyle(fontSize: 8.5, lineSpacing: 2),
                  ),
                ),
              ],
            ),
            pw.TableRow(
              decoration: const pw.BoxDecoration(color: cardBg),
              children: [
                pw.Padding(
                  padding: const pw.EdgeInsets.all(6),
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('Manajer Cabang', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8.8, color: secondaryColor)),
                      pw.Text('Supervisor Outlet', style: captionStyle),
                    ],
                  ),
                ),
                pw.Padding(
                  padding: const pw.EdgeInsets.all(6),
                  child: pw.Text(
                    '• Mempermudah proses stock opname berkala dengan membandingkan sisa fisik vs sistem.\n• Notifikasi stok menipis memastikan outlet tidak pernah kehabisan bahan saat ramai.\n• Pencatatan pengeluaran operasional cabang rapi dan transparan.',
                    style: pw.TextStyle(fontSize: 8.5, lineSpacing: 2),
                  ),
                ),
                pw.Padding(
                  padding: const pw.EdgeInsets.all(6),
                  child: pw.Text(
                    'Efisiensi jam kerja staf, nihilnya stok kadaluarsa/rusak, dan transparansi anggaran operasional gerai.',
                    style: pw.TextStyle(fontSize: 8.5, lineSpacing: 2),
                  ),
                ),
              ],
            ),
            pw.TableRow(
              children: [
                pw.Padding(
                  padding: const pw.EdgeInsets.all(6),
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('Kasir / Barista', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8.8, color: textDark)),
                      pw.Text('Staf Garda Depan', style: captionStyle),
                    ],
                  ),
                ),
                pw.Padding(
                  padding: const pw.EdgeInsets.all(6),
                  child: pw.Text(
                    '• UI kasir ramah pemula, minim salah klik berkat ikon dan tombol yang jelas.\n• Perhitungan uang kembalian otomatis mengurangi selisih kas fisik di akhir hari.\n• Proses penutupan kas (closing shift) selesai dalam waktu kurang dari 5 menit.',
                    style: pw.TextStyle(fontSize: 8.5, lineSpacing: 2),
                  ),
                ),
                pw.Padding(
                  padding: const pw.EdgeInsets.all(6),
                  child: pw.Text(
                    'Beban kerja berkurang signifikan, terhindar dari pemotongan gaji akibat selisih kas salah hitung.',
                    style: pw.TextStyle(fontSize: 8.5, lineSpacing: 2),
                  ),
                ),
              ],
            ),
            pw.TableRow(
              decoration: const pw.BoxDecoration(color: cardBg),
              children: [
                pw.Padding(
                  padding: const pw.EdgeInsets.all(6),
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('Pelanggan (Customer)', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8.8, color: const PdfColor.fromInt(0xFFD97706))),
                      pw.Text('Konsumen Akhir', style: captionStyle),
                    ],
                  ),
                ),
                pw.Padding(
                  padding: const pw.EdgeInsets.all(6),
                  child: pw.Text(
                    '• Waktu tunggu dan antrean pembayaran jauh lebih singkat.\n• Kemudahan memilih metode pembayaran favorit (Tunai, QRIS, e-Wallet).\n• Menerima struk belanja yang jelas, profesional, dan akurat.',
                    style: pw.TextStyle(fontSize: 8.5, lineSpacing: 2),
                  ),
                ),
                pw.Padding(
                  padding: const pw.EdgeInsets.all(6),
                  child: pw.Text(
                    'Kepuasan pelanggan meningkat, mendorong loyalitas pembelian berulang (repeat order).',
                    style: pw.TextStyle(fontSize: 8.5, lineSpacing: 2),
                  ),
                ),
              ],
            ),
          ],
        ),

        // =====================================================================
        // BAB V: ARSITEKTUR TEKNOLOGI
        // =====================================================================
        buildSectionHeader('BAB V', 'ARSITEKTUR TEKNOLOGI SISTEM'),
        pw.Text(
          'Aplikasi UsahaKu dibangun menggunakan tumpukan teknologi modern berstandar enterprise yang menjamin performa tinggi, keamanan data, dan keandalan operasional:',
          style: bodyStyle,
        ),
        pw.SizedBox(height: 6),
        pw.Table(
          border: pw.TableBorder.all(color: borderColor, width: 0.8),
          columnWidths: {
            0: const pw.FlexColumnWidth(1.5),
            1: const pw.FlexColumnWidth(1.8),
            2: const pw.FlexColumnWidth(3.0),
          },
          children: [
            pw.TableRow(
              decoration: const pw.BoxDecoration(color: primaryLight),
              children: [
                pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('Komponen Sistem', style: boldBodyStyle)),
                pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('Teknologi Utama', style: boldBodyStyle)),
                pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('Deskripsi & Peran', style: boldBodyStyle)),
              ],
            ),
            pw.TableRow(
              children: [
                pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('Frontend Client', style: boldBodyStyle)),
                pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('Flutter 3.x (Dart 3)', style: bodyStyle)),
                pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('Aplikasi multi-platform (Web browser Chrome, Tablet Android, Desktop POS) dengan responsivitas tinggi dan state management Provider.', style: bodyStyle)),
              ],
            ),
            pw.TableRow(
              decoration: const pw.BoxDecoration(color: cardBg),
              children: [
                pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('Backend API', style: boldBodyStyle)),
                pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('Node.js & Express.js', style: bodyStyle)),
                pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('RESTful API arsitektur modular, routing terstruktur, middleware JWT authentication, dan audit logging.', style: bodyStyle)),
              ],
            ),
            pw.TableRow(
              children: [
                pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('Basis Data (Database)', style: boldBodyStyle)),
                pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('PostgreSQL / MySQL (Sequelize)', style: bodyStyle)),
                pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('Relational Database dengan ACID compliance untuk menjamin tidak adanya selisih saldo transaksi atau double deduction pada stok.', style: bodyStyle)),
              ],
            ),
            pw.TableRow(
              decoration: const pw.BoxDecoration(color: cardBg),
              children: [
                pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('Reporting Engine', style: boldBodyStyle)),
                pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('PDF Widgets & XML Spreadsheet', style: bodyStyle)),
                pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('Mesin render dokumen client-side dan server-side yang mampu memproduksi file PDF cetak, Excel native multi-sheet, dan CSV.', style: bodyStyle)),
              ],
            ),
          ],
        ),

        // =====================================================================
        // BAB VI: KESIMPULAN
        // =====================================================================
        buildSectionHeader('BAB VI', 'KESIMPULAN'),
        pw.Text(
          'Aplikasi "USAHAKU" bukan sekadar aplikasi kasir pencatat nota, melainkan sistem saraf pusat (Enterprise Resource Planning) yang mentransformasi bisnis UMKM dari pola konvensional yang rentan kebocoran menjadi bisnis modern yang terstruktur, transparan, dan siap berekspansi cepat.',
          style: bodyStyle,
        ),
        pw.SizedBox(height: 6),
        pw.Text(
          'Dengan memadukan kemudahan antarmuka POS, presisi inventaris berbasis resep menu, integrasi multi-cabang, serta pelaporan keuangan Laba Bersih yang komprehensif, UsahaKu menjadi fondasi digital yang kokoh bagi para wirausahawan untuk melipatgandakan profit dan memperluas jaringan bisnisnya dengan rasa aman dan terukur.',
          style: bodyStyle,
        ),
        pw.SizedBox(height: 12),
        pw.Container(
          padding: const pw.EdgeInsets.all(12),
          decoration: pw.BoxDecoration(
            color: primaryLight,
            borderRadius: pw.BorderRadius.circular(8),
            border: pw.Border.all(color: const PdfColor.fromInt(0xFF93C5FD)),
          ),
          child: pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text('Status Proyek : Aktif & Terintegrasi Penuh', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 9.5, color: primaryColor)),
                  pw.SizedBox(height: 2),
                  pw.Text('Modul : POS • Inventaris Resep • Pengeluaran • Multi-Cabang • Export Laporan', style: pw.TextStyle(fontSize: 8.5, color: textDark)),
                ],
              ),
              pw.Container(
                padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: pw.BoxDecoration(
                  color: secondaryColor,
                  borderRadius: pw.BorderRadius.circular(6),
                ),
                child: pw.Text('SIAP OPERASIONAL', style: pw.TextStyle(color: PdfColors.white, fontWeight: pw.FontWeight.bold, fontSize: 8.5)),
              ),
            ],
          ),
        ),
      ],
    ),
  );

  // Output paths
  final outputDir = Directory('C:/Users/ACER/Documents/PEMROGRAMMAN/UsahaKu');
  final outputFile = File('${outputDir.path}/LAPORAN_PROYEK_USAHAKU.pdf');
  final bytes = await pdf.save();
  await outputFile.writeAsBytes(bytes);

  print('PDF Successfully generated at: ${outputFile.path}');
  print('Total Size: ${bytes.length} bytes');
}
