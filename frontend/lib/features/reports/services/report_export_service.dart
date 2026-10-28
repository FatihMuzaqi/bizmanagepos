import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/storage/storage_service.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/ui_helpers.dart';
import '../providers/report_provider.dart';

class ReportExportService {
  /// Safely format date with Indonesian locale fallback
  static String _formatIndonesianDate(DateTime date, [String pattern = 'dd MMMM yyyy, HH:mm']) {
    try {
      return DateFormat(pattern, 'id_ID').format(date);
    } catch (_) {
      try {
        return DateFormat(pattern).format(date);
      } catch (_) {
        return '${date.day.toString().padLeft(2, '0')}-${date.month.toString().padLeft(2, '0')}-${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
      }
    }
  }

  /// Map preset key to Indonesian human-readable label
  static String getPresetLabel(String preset) {
    switch (preset) {
      case 'today':
        return 'Hari Ini';
      case 'yesterday':
        return 'Kemarin';
      case 'this_week':
        return 'Minggu Ini';
      case 'this_month':
        return 'Bulan Ini';
      case 'last_month':
        return 'Bulan Lalu';
      default:
        return 'Semua Periode';
    }
  }

  // ===========================================================================
  // 1. EXPORT TO PDF (PREVIEW & PRINT)
  // ===========================================================================

  static Future<void> exportPdf({
    required BuildContext context,
    required ReportProvider rep,
    String? customTitle,
  }) async {
    try {
      try {
        await initializeDateFormatting('id_ID', null);
      } catch (_) {}

      final doc = pw.Document();

      final businessName = StorageService.getActiveBusinessName() ?? 'UsahaKu';
      final outletName = StorageService.getActiveOutletName() ?? 'Semua Cabang';
      final presetLabel = getPresetLabel(rep.selectedPreset);
      final currentDateStr = _formatIndonesianDate(DateTime.now());

      final sales = rep.salesReport;
      final dashboard = rep.dashboardData;
      final products = rep.productReport;
      final outlets = rep.outletReport;
      final expenseData = rep.expenseReport;

      final totalSales = (sales?['total_sales'] ?? dashboard?['sales_today'] ?? 0).toDouble();
      final txCount = (sales?['transaction_count'] ?? dashboard?['transactions_today'] ?? 0) as int;
      final totalExpenses = (expenseData?['total_expense'] ?? dashboard?['expenses_today'] ?? 0).toDouble();
      final netIncome = totalSales - totalExpenses;
      final avgOrder = (sales?['average_transaction'] ?? (txCount > 0 ? totalSales / txCount : 0)).toDouble();

      final paymentMethods = (sales?['payment_methods'] as List? ?? []).cast<Map<String, dynamic>>();
      final expenseCategories = (expenseData?['categories'] as List? ?? []).cast<Map<String, dynamic>>();

      // Theme Colors for PDF
      const pdfPrimary = PdfColor.fromInt(0xFF0066FF);
      const pdfTextDark = PdfColor.fromInt(0xFF0F172A);
      const pdfTextGrey = PdfColor.fromInt(0xFF64748B);
      const pdfBgLight = PdfColor.fromInt(0xFFF8FAFC);
      const pdfBorder = PdfColor.fromInt(0xFFE2E8F0);
      const pdfSuccess = PdfColor.fromInt(0xFF10B981);
      const pdfError = PdfColor.fromInt(0xFFEF4444);

      doc.addPage(
        pw.MultiPage(
          pageFormat: PdfPageFormat.a4,
          margin: const pw.EdgeInsets.symmetric(horizontal: 32, vertical: 28),
          header: (pw.Context ctx) {
            return pw.Container(
              margin: const pw.EdgeInsets.only(bottom: 16),
              decoration: const pw.BoxDecoration(
                border: pw.Border(bottom: pw.BorderSide(color: pdfPrimary, width: 2)),
              ),
              padding: const pw.EdgeInsets.only(bottom: 10),
              child: pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                crossAxisAlignment: pw.CrossAxisAlignment.end,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        businessName.toUpperCase(),
                        style: pw.TextStyle(
                          color: pdfPrimary,
                          fontSize: 16,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                      pw.SizedBox(height: 2),
                      pw.Text(
                        'LAPORAN PENJUALAN & KEUANGAN',
                        style: pw.TextStyle(
                          color: pdfTextDark,
                          fontSize: 14,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                      pw.Text(
                        'Cabang: $outletName | Periode: $presetLabel',
                        style: const pw.TextStyle(color: pdfTextGrey, fontSize: 10),
                      ),
                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text(
                        'Waktu Cetak:',
                        style: const pw.TextStyle(color: pdfTextGrey, fontSize: 8),
                      ),
                      pw.Text(
                        currentDateStr,
                        style: pw.TextStyle(
                          color: pdfTextDark,
                          fontSize: 9,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
          footer: (pw.Context ctx) {
            return pw.Container(
              margin: const pw.EdgeInsets.only(top: 12),
              padding: const pw.EdgeInsets.only(top: 8),
              decoration: const pw.BoxDecoration(
                border: pw.Border(top: pw.BorderSide(color: pdfBorder, width: 0.8)),
              ),
              child: pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text(
                    'Dicetak otomatis oleh Sistem UsahaKu POS & Manajemen Bisnis',
                    style: const pw.TextStyle(color: pdfTextGrey, fontSize: 8),
                  ),
                  pw.Text(
                    'Halaman ${ctx.pageNumber} dari ${ctx.pagesCount}',
                    style: const pw.TextStyle(color: pdfTextGrey, fontSize: 8),
                  ),
                ],
              ),
            );
          },
          build: (pw.Context ctx) => [
            // 1. Executive Summary Cards (4 Metrics)
            pw.Container(
              padding: const pw.EdgeInsets.all(12),
              decoration: pw.BoxDecoration(
                color: pdfBgLight,
                borderRadius: const pw.BorderRadius.all(pw.Radius.circular(6)),
                border: pw.Border.all(color: pdfBorder, width: 1),
              ),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text(
                    'RINGKASAN KEUANGAN (EXECUTIVE SUMMARY)',
                    style: pw.TextStyle(
                      fontSize: 10,
                      fontWeight: pw.FontWeight.bold,
                      color: pdfTextDark,
                    ),
                  ),
                  pw.SizedBox(height: 8),
                  pw.Row(
                    children: [
                      _buildPdfMetricItem('TOTAL OMSET (PENJUALAN)', CurrencyFormatter.format(totalSales), pdfSuccess),
                      _buildPdfMetricItem('TOTAL TRANSAKSI', '$txCount Pesanan', pdfPrimary),
                      _buildPdfMetricItem('BIAYA PENGELUARAN', CurrencyFormatter.format(totalExpenses), pdfError),
                      _buildPdfMetricItem('LABA BERSIH', CurrencyFormatter.format(netIncome), pdfPrimary),
                    ],
                  ),
                  pw.SizedBox(height: 6),
                  pw.Divider(color: pdfBorder, thickness: 0.5),
                  pw.SizedBox(height: 4),
                  pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Text(
                        'Rata-rata Penjualan per Nota Transaksi: ${CurrencyFormatter.format(avgOrder)}',
                        style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: pdfTextDark),
                      ),
                      pw.Text(
                        'Status Margin Bersih: ${totalSales > 0 ? ((netIncome / totalSales) * 100).toStringAsFixed(1) : 0}%',
                        style: pw.TextStyle(
                          fontSize: 9,
                          fontWeight: pw.FontWeight.bold,
                          color: netIncome >= 0 ? pdfSuccess : pdfError,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            pw.SizedBox(height: 16),

            // 2. Metode Pembayaran
            if (paymentMethods.isNotEmpty) ...[
              pw.Text(
                '1. Rincian Metode Pembayaran',
                style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold, color: pdfTextDark),
              ),
              pw.SizedBox(height: 6),
              pw.TableHelper.fromTextArray(
                border: pw.TableBorder.all(color: pdfBorder, width: 0.5),
                headerStyle: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.white),
                headerDecoration: const pw.BoxDecoration(color: pdfPrimary),
                cellStyle: const pw.TextStyle(fontSize: 8.5),
                cellAlignment: pw.Alignment.centerLeft,
                headerAlignment: pw.Alignment.centerLeft,
                headers: ['No', 'Metode Pembayaran', 'Jumlah Transaksi', 'Total Nominal (Rp)', 'Kontribusi (%)'],
                data: List.generate(paymentMethods.length, (i) {
                  final pm = paymentMethods[i];
                  final method = pm['method']?.toString() ?? 'CASH';
                  final count = pm['count'] ?? 0;
                  final amt = (pm['total_amount'] ?? 0).toDouble();
                  final percent = totalSales > 0 ? ((amt / totalSales) * 100).toStringAsFixed(1) : '0';
                  return [
                    '${i + 1}',
                    method,
                    '$count transaksi',
                    CurrencyFormatter.format(amt),
                    '$percent%',
                  ];
                }),
              ),
              pw.SizedBox(height: 16),
            ],

            // 3. Performa Penjualan Menu
            pw.Text(
              '2. Performa Penjualan Menu / Produk Terlaris',
              style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold, color: pdfTextDark),
            ),
            pw.SizedBox(height: 6),
            if (products.isEmpty)
              pw.Container(
                padding: const pw.EdgeInsets.all(8),
                decoration: pw.BoxDecoration(border: pw.Border.all(color: pdfBorder, width: 0.5)),
                child: pw.Text('Tidak ada transaksi penjualan produk pada periode ini.', style: const pw.TextStyle(fontSize: 8.5, color: pdfTextGrey)),
              )
            else
              pw.TableHelper.fromTextArray(
                border: pw.TableBorder.all(color: pdfBorder, width: 0.5),
                headerStyle: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.white),
                headerDecoration: const pw.BoxDecoration(color: pdfPrimary),
                cellStyle: const pw.TextStyle(fontSize: 8.5),
                headers: ['Rank', 'Nama Menu / Produk', 'Porsi Terjual', 'Pesanan', 'Total Omset (Rp)'],
                data: List.generate(products.length, (i) {
                  final p = products[i];
                  final name = p['product_name']?.toString() ?? 'Produk';
                  final qty = p['quantity_sold'] ?? 0;
                  final orders = p['order_count'] ?? 0;
                  final rev = (p['revenue'] ?? 0).toDouble();
                  return [
                    '#${i + 1}',
                    name,
                    '$qty porsi',
                    '$orders nota',
                    CurrencyFormatter.format(rev),
                  ];
                }),
              ),
            pw.SizedBox(height: 16),

            // 4. Rincian Pengeluaran Operasional
            pw.Text(
              '3. Rincian Biaya Pengeluaran Operasional',
              style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold, color: pdfTextDark),
            ),
            pw.SizedBox(height: 6),
            if (expenseCategories.isEmpty)
              pw.Container(
                padding: const pw.EdgeInsets.all(8),
                decoration: pw.BoxDecoration(border: pw.Border.all(color: pdfBorder, width: 0.5)),
                child: pw.Text('Tidak ada catatan pengeluaran operasional pada periode ini.', style: const pw.TextStyle(fontSize: 8.5, color: pdfTextGrey)),
              )
            else
              pw.TableHelper.fromTextArray(
                border: pw.TableBorder.all(color: pdfBorder, width: 0.5),
                headerStyle: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.white),
                headerDecoration: const pw.BoxDecoration(color: pdfError),
                cellStyle: const pw.TextStyle(fontSize: 8.5),
                headers: ['No', 'Kategori Pengeluaran', 'Jumlah Bukti/Catatan', 'Total Biaya (Rp)'],
                data: List.generate(expenseCategories.length, (i) {
                  final cat = expenseCategories[i];
                  final name = cat['category_name']?.toString() ?? 'Biaya';
                  final count = cat['expense_count'] ?? 0;
                  final total = (cat['total_expense'] ?? 0).toDouble();
                  return [
                    '${i + 1}',
                    name,
                    '$count transaksi',
                    CurrencyFormatter.format(total),
                  ];
                }),
              ),
            pw.SizedBox(height: 16),

            // 5. Performa Antar Cabang (jika ada data outlet)
            if (outlets.isNotEmpty) ...[
              pw.Text(
                '4. Perbandingan Performa Antar Cabang',
                style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold, color: pdfTextDark),
              ),
              pw.SizedBox(height: 6),
              pw.TableHelper.fromTextArray(
                border: pw.TableBorder.all(color: pdfBorder, width: 0.5),
                headerStyle: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.white),
                headerDecoration: const pw.BoxDecoration(color: pdfPrimary),
                cellStyle: const pw.TextStyle(fontSize: 8.5),
                headers: ['No', 'Nama Cabang', 'Kode', 'Transaksi', 'Penjualan (Rp)', 'Biaya (Rp)', 'Laba Bersih (Rp)'],
                data: List.generate(outlets.length, (i) {
                  final o = outlets[i];
                  final name = o['name']?.toString() ?? 'Cabang';
                  final code = o['code']?.toString() ?? '-';
                  final count = o['transaction_count'] ?? 0;
                  final s = (o['sales'] ?? 0).toDouble();
                  final e = (o['expense'] ?? 0).toDouble();
                  final p = (o['net_profit'] ?? (s - e)).toDouble();
                  return [
                    '${i + 1}',
                    name,
                    code,
                    '$count',
                    CurrencyFormatter.format(s),
                    CurrencyFormatter.format(e),
                    CurrencyFormatter.format(p),
                  ];
                }),
              ),
            ],
          ],
        ),
      );

      final fileName = 'Laporan_Keuangan_${rep.selectedPreset}_${DateFormat('yyyyMMdd_HHmm').format(DateTime.now())}.pdf';

      // Open PDF Preview & Print Layout (allows saving, printing, or sharing directly)
      await Printing.layoutPdf(
        name: fileName,
        onLayout: (PdfPageFormat format) async => doc.save(),
      );

      if (context.mounted) {
        UiHelpers.showSuccess(context, 'Laporan PDF berhasil disiapkan untuk dicetak atau disimpan', title: 'Export PDF Siap');
      }
    } catch (e) {
      if (context.mounted) {
        UiHelpers.showError(context, e, title: 'Gagal Export PDF');
      }
    }
  }

  static pw.Widget _buildPdfMetricItem(String label, String value, PdfColor valueColor) {
    return pw.Expanded(
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(
            label,
            style: const pw.TextStyle(fontSize: 7.5, color: PdfColor.fromInt(0xFF64748B)),
          ),
          pw.SizedBox(height: 2),
          pw.Text(
            value,
            style: pw.TextStyle(
              fontSize: 10,
              fontWeight: pw.FontWeight.bold,
              color: valueColor,
            ),
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // 2. EXPORT TO EXCEL / SPREADSHEET (.XLS / .CSV)
  // ===========================================================================

  static Future<void> exportExcel({
    required BuildContext context,
    required ReportProvider rep,
  }) async {
    try {
      final businessName = StorageService.getActiveBusinessName() ?? 'UsahaKu';
      final outletName = StorageService.getActiveOutletName() ?? 'Semua Cabang';
      final presetLabel = getPresetLabel(rep.selectedPreset);
      final currentDateStr = DateFormat('dd MMMM yyyy HH:mm').format(DateTime.now());

      final sales = rep.salesReport;
      final dashboard = rep.dashboardData;
      final products = rep.productReport;
      final outlets = rep.outletReport;
      final expenseData = rep.expenseReport;

      final totalSales = (sales?['total_sales'] ?? dashboard?['sales_today'] ?? 0).toDouble();
      final txCount = (sales?['transaction_count'] ?? dashboard?['transactions_today'] ?? 0) as int;
      final totalExpenses = (expenseData?['total_expense'] ?? dashboard?['expenses_today'] ?? 0).toDouble();
      final netIncome = totalSales - totalExpenses;
      final avgOrder = (sales?['average_transaction'] ?? (txCount > 0 ? totalSales / txCount : 0)).toDouble();

      final paymentMethods = (sales?['payment_methods'] as List? ?? []).cast<Map<String, dynamic>>();
      final expenseCategories = (expenseData?['categories'] as List? ?? []).cast<Map<String, dynamic>>();

      // Generate XML Spreadsheet 2003 (.xls) which Microsoft Excel natively opens with multi-worksheets and styles
      final xmlBuffer = StringBuffer();
      xmlBuffer.writeln('<?xml version="1.0" encoding="UTF-8"?>');
      xmlBuffer.writeln('<?mso-application progid="Excel.Sheet"?>');
      xmlBuffer.writeln('<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"');
      xmlBuffer.writeln(' xmlns:o="urn:schemas-microsoft-com:office:office"');
      xmlBuffer.writeln(' xmlns:x="urn:schemas-microsoft-com:office:excel"');
      xmlBuffer.writeln(' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"');
      xmlBuffer.writeln(' xmlns:html="http://www.w3.org/TR/REC-html40">');

      // Styles
      xmlBuffer.writeln(' <Styles>');
      xmlBuffer.writeln('  <Style ss:ID="Default" ss:Name="Normal">');
      xmlBuffer.writeln('   <Alignment ss:Vertical="Center"/>');
      xmlBuffer.writeln('   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#0F172A"/>');
      xmlBuffer.writeln('  </Style>');
      xmlBuffer.writeln('  <Style ss:ID="Header">');
      xmlBuffer.writeln('   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>');
      xmlBuffer.writeln('   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>');
      xmlBuffer.writeln('   <Interior ss:Color="#0066FF" ss:Pattern="Solid"/>');
      xmlBuffer.writeln('  </Style>');
      xmlBuffer.writeln('  <Style ss:ID="HeaderRed">');
      xmlBuffer.writeln('   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>');
      xmlBuffer.writeln('   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>');
      xmlBuffer.writeln('   <Interior ss:Color="#EF4444" ss:Pattern="Solid"/>');
      xmlBuffer.writeln('  </Style>');
      xmlBuffer.writeln('  <Style ss:ID="Title">');
      xmlBuffer.writeln('   <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#0066FF"/>');
      xmlBuffer.writeln('  </Style>');
      xmlBuffer.writeln('  <Style ss:ID="SubTitle">');
      xmlBuffer.writeln('   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#64748B"/>');
      xmlBuffer.writeln('  </Style>');
      xmlBuffer.writeln('  <Style ss:ID="Bold">');
      xmlBuffer.writeln('   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>');
      xmlBuffer.writeln('  </Style>');
      xmlBuffer.writeln('  <Style ss:ID="Currency">');
      xmlBuffer.writeln('   <NumberFormat ss:Format="&quot;Rp&quot; #,##0"/>');
      xmlBuffer.writeln('  </Style>');
      xmlBuffer.writeln('  <Style ss:ID="CurrencyBold">');
      xmlBuffer.writeln('   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>');
      xmlBuffer.writeln('   <NumberFormat ss:Format="&quot;Rp&quot; #,##0"/>');
      xmlBuffer.writeln('  </Style>');
      xmlBuffer.writeln(' </Styles>');

      // =======================================================================
      // Sheet 1: Ringkasan Finansial
      // =======================================================================
      xmlBuffer.writeln(' <Worksheet ss:Name="Ringkasan Finansial">');
      xmlBuffer.writeln('  <Table ss:DefaultColumnWidth="140">');
      xmlBuffer.writeln('   <Column ss:Width="200"/>');
      xmlBuffer.writeln('   <Column ss:Width="180"/>');
      xmlBuffer.writeln('   <Column ss:Width="160"/>');

      xmlBuffer.writeln('   <Row>');
      xmlBuffer.writeln('    <Cell ss:StyleID="Title"><Data ss:Type="String">${_escapeXml(businessName.toUpperCase())}</Data></Cell>');
      xmlBuffer.writeln('   </Row>');
      xmlBuffer.writeln('   <Row>');
      xmlBuffer.writeln('    <Cell ss:StyleID="Bold"><Data ss:Type="String">LAPORAN PENJUALAN &amp; KEUANGAN</Data></Cell>');
      xmlBuffer.writeln('   </Row>');
      xmlBuffer.writeln('   <Row>');
      xmlBuffer.writeln('    <Cell ss:StyleID="SubTitle"><Data ss:Type="String">Cabang: ${_escapeXml(outletName)} | Periode: ${_escapeXml(presetLabel)} | Dicetak: $currentDateStr</Data></Cell>');
      xmlBuffer.writeln('   </Row>');
      xmlBuffer.writeln('   <Row></Row>');

      // KPI Table
      xmlBuffer.writeln('   <Row>');
      xmlBuffer.writeln('    <Cell ss:StyleID="Header"><Data ss:Type="String">METRIK KEUANGAN</Data></Cell>');
      xmlBuffer.writeln('    <Cell ss:StyleID="Header"><Data ss:Type="String">NILAI / JUMLAH</Data></Cell>');
      xmlBuffer.writeln('    <Cell ss:StyleID="Header"><Data ss:Type="String">KETERANGAN</Data></Cell>');
      xmlBuffer.writeln('   </Row>');

      _writeExcelRow(xmlBuffer, 'Total Omset Penjualan', totalSales, 'Total pendapatan kotor', isCurrency: true);
      _writeExcelRow(xmlBuffer, 'Total Transaksi Nota', txCount, 'Pesanan selesai tercatat', isCurrency: false);
      _writeExcelRow(xmlBuffer, 'Total Pengeluaran Operasional', totalExpenses, 'Biaya operasional tercatat', isCurrency: true);
      _writeExcelRow(xmlBuffer, 'Laba Bersih (Net Profit)', netIncome, 'Total Omset dikurangi Biaya', isCurrency: true, isBold: true);
      _writeExcelRow(xmlBuffer, 'Rata-rata Transaksi / Nota', avgOrder, 'Rata-rata belanja per pelanggan', isCurrency: true);

      // Payment Breakdown
      if (paymentMethods.isNotEmpty) {
        xmlBuffer.writeln('   <Row></Row>');
        xmlBuffer.writeln('   <Row>');
        xmlBuffer.writeln('    <Cell ss:StyleID="Bold"><Data ss:Type="String">Rincian Metode Pembayaran:</Data></Cell>');
        xmlBuffer.writeln('   </Row>');
        xmlBuffer.writeln('   <Row>');
        xmlBuffer.writeln('    <Cell ss:StyleID="Header"><Data ss:Type="String">Metode Pembayaran</Data></Cell>');
        xmlBuffer.writeln('    <Cell ss:StyleID="Header"><Data ss:Type="String">Jumlah Transaksi</Data></Cell>');
        xmlBuffer.writeln('    <Cell ss:StyleID="Header"><Data ss:Type="String">Total Nominal (Rp)</Data></Cell>');
        xmlBuffer.writeln('   </Row>');
        for (final pm in paymentMethods) {
          final m = pm['method']?.toString() ?? 'CASH';
          final c = pm['count'] ?? 0;
          final amt = (pm['total_amount'] ?? 0).toDouble();
          xmlBuffer.writeln('   <Row>');
          xmlBuffer.writeln('    <Cell><Data ss:Type="String">${_escapeXml(m)}</Data></Cell>');
          xmlBuffer.writeln('    <Cell><Data ss:Type="Number">$c</Data></Cell>');
          xmlBuffer.writeln('    <Cell ss:StyleID="Currency"><Data ss:Type="Number">$amt</Data></Cell>');
          xmlBuffer.writeln('   </Row>');
        }
      }

      xmlBuffer.writeln('  </Table>');
      xmlBuffer.writeln(' </Worksheet>');

      // =======================================================================
      // Sheet 2: Performa Menu Produk
      // =======================================================================
      xmlBuffer.writeln(' <Worksheet ss:Name="Performa Menu">');
      xmlBuffer.writeln('  <Table ss:DefaultColumnWidth="120">');
      xmlBuffer.writeln('   <Column ss:Width="60"/>');
      xmlBuffer.writeln('   <Column ss:Width="220"/>');
      xmlBuffer.writeln('   <Column ss:Width="120"/>');
      xmlBuffer.writeln('   <Column ss:Width="120"/>');
      xmlBuffer.writeln('   <Column ss:Width="160"/>');

      xmlBuffer.writeln('   <Row>');
      xmlBuffer.writeln('    <Cell ss:StyleID="Header"><Data ss:Type="String">Rank</Data></Cell>');
      xmlBuffer.writeln('    <Cell ss:StyleID="Header"><Data ss:Type="String">Nama Menu / Produk</Data></Cell>');
      xmlBuffer.writeln('    <Cell ss:StyleID="Header"><Data ss:Type="String">Porsi Terjual</Data></Cell>');
      xmlBuffer.writeln('    <Cell ss:StyleID="Header"><Data ss:Type="String">Jumlah Pesanan</Data></Cell>');
      xmlBuffer.writeln('    <Cell ss:StyleID="Header"><Data ss:Type="String">Total Omset (Rp)</Data></Cell>');
      xmlBuffer.writeln('   </Row>');

      for (int i = 0; i < products.length; i++) {
        final p = products[i];
        final name = p['product_name']?.toString() ?? 'Produk';
        final qty = p['quantity_sold'] ?? 0;
        final orders = p['order_count'] ?? 0;
        final rev = (p['revenue'] ?? 0).toDouble();

        xmlBuffer.writeln('   <Row>');
        xmlBuffer.writeln('    <Cell ss:StyleID="Default"><Data ss:Type="Number">${i + 1}</Data></Cell>');
        xmlBuffer.writeln('    <Cell><Data ss:Type="String">${_escapeXml(name)}</Data></Cell>');
        xmlBuffer.writeln('    <Cell><Data ss:Type="Number">$qty</Data></Cell>');
        xmlBuffer.writeln('    <Cell><Data ss:Type="Number">$orders</Data></Cell>');
        xmlBuffer.writeln('    <Cell ss:StyleID="Currency"><Data ss:Type="Number">$rev</Data></Cell>');
        xmlBuffer.writeln('   </Row>');
      }

      xmlBuffer.writeln('  </Table>');
      xmlBuffer.writeln(' </Worksheet>');

      // =======================================================================
      // Sheet 3: Rincian Pengeluaran
      // =======================================================================
      xmlBuffer.writeln(' <Worksheet ss:Name="Rincian Pengeluaran">');
      xmlBuffer.writeln('  <Table ss:DefaultColumnWidth="140">');
      xmlBuffer.writeln('   <Column ss:Width="60"/>');
      xmlBuffer.writeln('   <Column ss:Width="220"/>');
      xmlBuffer.writeln('   <Column ss:Width="140"/>');
      xmlBuffer.writeln('   <Column ss:Width="160"/>');

      xmlBuffer.writeln('   <Row>');
      xmlBuffer.writeln('    <Cell ss:StyleID="HeaderRed"><Data ss:Type="String">No</Data></Cell>');
      xmlBuffer.writeln('    <Cell ss:StyleID="HeaderRed"><Data ss:Type="String">Kategori Pengeluaran</Data></Cell>');
      xmlBuffer.writeln('    <Cell ss:StyleID="HeaderRed"><Data ss:Type="String">Jumlah Catatan</Data></Cell>');
      xmlBuffer.writeln('    <Cell ss:StyleID="HeaderRed"><Data ss:Type="String">Total Biaya (Rp)</Data></Cell>');
      xmlBuffer.writeln('   </Row>');

      for (int i = 0; i < expenseCategories.length; i++) {
        final cat = expenseCategories[i];
        final name = cat['category_name']?.toString() ?? 'Biaya';
        final count = cat['expense_count'] ?? 0;
        final total = (cat['total_expense'] ?? 0).toDouble();

        xmlBuffer.writeln('   <Row>');
        xmlBuffer.writeln('    <Cell><Data ss:Type="Number">${i + 1}</Data></Cell>');
        xmlBuffer.writeln('    <Cell><Data ss:Type="String">${_escapeXml(name)}</Data></Cell>');
        xmlBuffer.writeln('    <Cell><Data ss:Type="Number">$count</Data></Cell>');
        xmlBuffer.writeln('    <Cell ss:StyleID="Currency"><Data ss:Type="Number">$total</Data></Cell>');
        xmlBuffer.writeln('   </Row>');
      }

      xmlBuffer.writeln('  </Table>');
      xmlBuffer.writeln(' </Worksheet>');

      // =======================================================================
      // Sheet 4: Performa Cabang
      // =======================================================================
      if (outlets.isNotEmpty) {
        xmlBuffer.writeln(' <Worksheet ss:Name="Performa Cabang">');
        xmlBuffer.writeln('  <Table ss:DefaultColumnWidth="130">');
        xmlBuffer.writeln('   <Column ss:Width="60"/>');
        xmlBuffer.writeln('   <Column ss:Width="180"/>');
        xmlBuffer.writeln('   <Column ss:Width="90"/>');
        xmlBuffer.writeln('   <Column ss:Width="100"/>');
        xmlBuffer.writeln('   <Column ss:Width="140"/>');
        xmlBuffer.writeln('   <Column ss:Width="140"/>');
        xmlBuffer.writeln('   <Column ss:Width="140"/>');

        xmlBuffer.writeln('   <Row>');
        xmlBuffer.writeln('    <Cell ss:StyleID="Header"><Data ss:Type="String">No</Data></Cell>');
        xmlBuffer.writeln('    <Cell ss:StyleID="Header"><Data ss:Type="String">Nama Cabang</Data></Cell>');
        xmlBuffer.writeln('    <Cell ss:StyleID="Header"><Data ss:Type="String">Kode</Data></Cell>');
        xmlBuffer.writeln('    <Cell ss:StyleID="Header"><Data ss:Type="String">Transaksi</Data></Cell>');
        xmlBuffer.writeln('    <Cell ss:StyleID="Header"><Data ss:Type="String">Penjualan (Rp)</Data></Cell>');
        xmlBuffer.writeln('    <Cell ss:StyleID="Header"><Data ss:Type="String">Biaya (Rp)</Data></Cell>');
        xmlBuffer.writeln('    <Cell ss:StyleID="Header"><Data ss:Type="String">Laba Bersih (Rp)</Data></Cell>');
        xmlBuffer.writeln('   </Row>');

        for (int i = 0; i < outlets.length; i++) {
          final o = outlets[i];
          final name = o['name']?.toString() ?? 'Cabang';
          final code = o['code']?.toString() ?? '-';
          final count = o['transaction_count'] ?? 0;
          final s = (o['sales'] ?? 0).toDouble();
          final e = (o['expense'] ?? 0).toDouble();
          final p = (o['net_profit'] ?? (s - e)).toDouble();

          xmlBuffer.writeln('   <Row>');
          xmlBuffer.writeln('    <Cell><Data ss:Type="Number">${i + 1}</Data></Cell>');
          xmlBuffer.writeln('    <Cell><Data ss:Type="String">${_escapeXml(name)}</Data></Cell>');
          xmlBuffer.writeln('    <Cell><Data ss:Type="String">${_escapeXml(code)}</Data></Cell>');
          xmlBuffer.writeln('    <Cell><Data ss:Type="Number">$count</Data></Cell>');
          xmlBuffer.writeln('    <Cell ss:StyleID="Currency"><Data ss:Type="Number">$s</Data></Cell>');
          xmlBuffer.writeln('    <Cell ss:StyleID="Currency"><Data ss:Type="Number">$e</Data></Cell>');
          xmlBuffer.writeln('    <Cell ss:StyleID="CurrencyBold"><Data ss:Type="Number">$p</Data></Cell>');
          xmlBuffer.writeln('   </Row>');
        }

        xmlBuffer.writeln('  </Table>');
        xmlBuffer.writeln(' </Worksheet>');
      }

      xmlBuffer.writeln('</Workbook>');

      final timestamp = DateFormat('yyyyMMdd_HHmmss').format(DateTime.now());
      final fileName = 'Laporan_Keuangan_${rep.selectedPreset}_$timestamp.xls';

      // Cross-platform save: Web (browser download) vs Native (File storage)
      if (kIsWeb) {
        final bytes = Uint8List.fromList(utf8.encode(xmlBuffer.toString()));
        await Printing.sharePdf(bytes: bytes, filename: fileName);
        if (context.mounted) {
          UiHelpers.showSuccess(
            context,
            'File Excel ($fileName) berhasil diunduh.',
            title: 'Export Excel Berhasil',
          );
        }
        return;
      }

      // Save file to user's device on Native Mobile/Desktop
      Directory? targetDir;
      try {
        targetDir = await getDownloadsDirectory();
      } catch (_) {}
      targetDir ??= await getApplicationDocumentsDirectory();

      final file = File('${targetDir.path}/$fileName');
      await file.writeAsString(xmlBuffer.toString(), encoding: utf8);

      if (context.mounted) {
        // Show success alert dialog with option to directly open file
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: Row(
              children: const [
                Icon(Icons.check_circle_rounded, color: AppColors.success, size: 28),
                SizedBox(width: 10),
                Text('Export Excel Berhasil', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('File Excel multi-sheet berhasil dibuat dan disimpan:'),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.cardBackground,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.cardBorder),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.table_chart_rounded, color: AppColors.success, size: 22),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          file.path,
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Format file (.xls) dapat langsung dibuka di Microsoft Excel, Google Sheets, atau aplikasi Spreadsheet lainnya.',
                  style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('Tutup'),
              ),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.success,
                  foregroundColor: Colors.white,
                ),
                icon: const Icon(Icons.open_in_new_rounded, size: 18),
                label: const Text('Buka File'),
                onPressed: () async {
                  Navigator.of(ctx).pop();
                  final uri = Uri.file(file.path);
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri);
                  } else {
                    if (context.mounted) {
                      UiHelpers.showInfo(context, 'Buka file dari lokasi: ${file.path}');
                    }
                  }
                },
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        UiHelpers.showError(context, e, title: 'Gagal Export Excel');
      }
    }
  }

  // ===========================================================================
  // 3. EXPORT TO CSV (.CSV)
  // ===========================================================================

  static Future<void> exportCsv({
    required BuildContext context,
    required ReportProvider rep,
  }) async {
    try {
      final businessName = StorageService.getActiveBusinessName() ?? 'UsahaKu';
      final outletName = StorageService.getActiveOutletName() ?? 'Semua Cabang';
      final presetLabel = getPresetLabel(rep.selectedPreset);
      final currentDateStr = DateFormat('dd MMMM yyyy HH:mm').format(DateTime.now());

      final sales = rep.salesReport;
      final dashboard = rep.dashboardData;
      final products = rep.productReport;
      final outlets = rep.outletReport;
      final expenseData = rep.expenseReport;

      final totalSales = (sales?['total_sales'] ?? dashboard?['sales_today'] ?? 0).toDouble();
      final txCount = (sales?['transaction_count'] ?? dashboard?['transactions_today'] ?? 0) as int;
      final totalExpenses = (expenseData?['total_expense'] ?? dashboard?['expenses_today'] ?? 0).toDouble();
      final netIncome = totalSales - totalExpenses;

      final csvBuffer = StringBuffer();
      // UTF-8 BOM so Excel opens with proper character encoding
      csvBuffer.write('\uFEFF');

      csvBuffer.writeln('"LAPORAN PENJUALAN & KEUANGAN"');
      csvBuffer.writeln('"Bisnis","${_escapeCsv(businessName)}"');
      csvBuffer.writeln('"Cabang","${_escapeCsv(outletName)}"');
      csvBuffer.writeln('"Periode","${_escapeCsv(presetLabel)}"');
      csvBuffer.writeln('"Tanggal Cetak","${_escapeCsv(currentDateStr)}"');
      csvBuffer.writeln('');

      csvBuffer.writeln('"RINGKASAN EKSEKUTIF"');
      csvBuffer.writeln('"Total Omset Penjualan",${totalSales.toStringAsFixed(2)}');
      csvBuffer.writeln('"Total Transaksi Nota",$txCount');
      csvBuffer.writeln('"Total Pengeluaran Operasional",${totalExpenses.toStringAsFixed(2)}');
      csvBuffer.writeln('"Laba Bersih",${netIncome.toStringAsFixed(2)}');
      csvBuffer.writeln('');

      csvBuffer.writeln('"PERFORMA PENJUALAN MENU PRODUK"');
      csvBuffer.writeln('"Rank","Nama Menu / Produk","Porsi Terjual","Pesanan","Total Pendapatan"');
      for (int i = 0; i < products.length; i++) {
        final p = products[i];
        csvBuffer.writeln('${i + 1},"${_escapeCsv(p['product_name']?.toString() ?? '')}",${p['quantity_sold'] ?? 0},${p['order_count'] ?? 0},${p['revenue'] ?? 0}');
      }
      csvBuffer.writeln('');

      csvBuffer.writeln('"RINCIAN PENGELUARAN OPERASIONAL"');
      csvBuffer.writeln('"No","Kategori Pengeluaran","Jumlah Catatan","Total Biaya"');
      final expenseCats = (expenseData?['categories'] as List? ?? []).cast<Map<String, dynamic>>();
      for (int i = 0; i < expenseCats.length; i++) {
        final c = expenseCats[i];
        csvBuffer.writeln('${i + 1},"${_escapeCsv(c['category_name']?.toString() ?? '')}",${c['expense_count'] ?? 0},${c['total_expense'] ?? 0}');
      }
      csvBuffer.writeln('');

      if (outlets.isNotEmpty) {
        csvBuffer.writeln('"PERBANDINGAN ANTAR CABANG"');
        csvBuffer.writeln('"No","Nama Cabang","Kode","Transaksi","Penjualan","Biaya","Laba Bersih"');
        for (int i = 0; i < outlets.length; i++) {
          final o = outlets[i];
          csvBuffer.writeln('${i + 1},"${_escapeCsv(o['name']?.toString() ?? '')}","${_escapeCsv(o['code']?.toString() ?? '')}",${o['transaction_count'] ?? 0},${o['sales'] ?? 0},${o['expense'] ?? 0},${o['net_profit'] ?? 0}');
        }
      }

      final timestamp = DateFormat('yyyyMMdd_HHmmss').format(DateTime.now());
      final fileName = 'Laporan_Keuangan_${rep.selectedPreset}_$timestamp.csv';

      // Cross-platform save: Web (browser download) vs Native (File storage)
      if (kIsWeb) {
        final bytes = Uint8List.fromList(utf8.encode(csvBuffer.toString()));
        await Printing.sharePdf(bytes: bytes, filename: fileName);
        if (context.mounted) {
          UiHelpers.showSuccess(
            context,
            'File CSV ($fileName) berhasil diunduh.',
            title: 'Export CSV Berhasil',
          );
        }
        return;
      }

      Directory? targetDir;
      try {
        targetDir = await getDownloadsDirectory();
      } catch (_) {}
      targetDir ??= await getApplicationDocumentsDirectory();

      final file = File('${targetDir.path}/$fileName');
      await file.writeAsString(csvBuffer.toString(), encoding: utf8);

      if (context.mounted) {
        UiHelpers.showSuccess(
          context,
          'File CSV disimpan di:\n${file.path}',
          title: 'Export CSV Berhasil',
        );
      }
    } catch (e) {
      if (context.mounted) {
        UiHelpers.showError(context, e, title: 'Gagal Export CSV');
      }
    }
  }

  // ===========================================================================
  // Helper methods
  // ===========================================================================

  static void _writeExcelRow(
    StringBuffer buf,
    String label,
    dynamic value,
    String notes, {
    bool isCurrency = false,
    bool isBold = false,
  }) {
    buf.writeln('   <Row>');
    buf.writeln('    <Cell ss:StyleID="${isBold ? 'Bold' : 'Default'}"><Data ss:Type="String">${_escapeXml(label)}</Data></Cell>');
    if (value is num) {
      buf.writeln('    <Cell ss:StyleID="${isCurrency ? (isBold ? 'CurrencyBold' : 'Currency') : (isBold ? 'Bold' : 'Default')}"><Data ss:Type="Number">$value</Data></Cell>');
    } else {
      buf.writeln('    <Cell ss:StyleID="${isBold ? 'Bold' : 'Default'}"><Data ss:Type="String">${_escapeXml(value.toString())}</Data></Cell>');
    }
    buf.writeln('    <Cell ss:StyleID="SubTitle"><Data ss:Type="String">${_escapeXml(notes)}</Data></Cell>');
    buf.writeln('   </Row>');
  }

  static String _escapeXml(String input) {
    return input
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
  }

  static String _escapeCsv(String input) {
    return input.replaceAll('"', '""');
  }
}
