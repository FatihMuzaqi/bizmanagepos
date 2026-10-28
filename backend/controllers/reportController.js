const reportService = require('../services/reportService');
const { successResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get dashboard overview analytics
 */
const getDashboard = asyncHandler(async (req, res) => {
  const data = await reportService.getDashboardSummary(
    req.business.id,
    req.user.id,
    req.business.isOwner,
    req.query
  );
  return successResponse(res, 'Dashboard summary retrieved successfully', data);
});

/**
 * Get sales summary report
 */
const getSalesReport = asyncHandler(async (req, res) => {
  const data = await reportService.getSalesReport(
    req.business.id,
    req.user.id,
    req.business.isOwner,
    req.query
  );
  return successResponse(res, 'Sales report retrieved successfully', data);
});

/**
 * Get product sales performance report
 */
const getProductSalesReport = asyncHandler(async (req, res) => {
  const data = await reportService.getProductSalesReport(
    req.business.id,
    req.user.id,
    req.business.isOwner,
    req.query
  );
  return successResponse(res, 'Product sales report retrieved successfully', data);
});

/**
 * Get outlet comparison report
 */
const getOutletReport = asyncHandler(async (req, res) => {
  const data = await reportService.getOutletReport(
    req.business.id,
    req.user.id,
    req.business.isOwner,
    req.query
  );
  return successResponse(res, 'Outlet report retrieved successfully', data);
});

/**
 * Get expense breakdown report
 */
const getExpenseReport = asyncHandler(async (req, res) => {
  const data = await reportService.getExpenseReport(
    req.business.id,
    req.user.id,
    req.business.isOwner,
    req.query
  );
  return successResponse(res, 'Expense report retrieved successfully', data);
});

/**
 * Get inventory stock level report
 */
const getStockReport = asyncHandler(async (req, res) => {
  const data = await reportService.getStockReport(
    req.business.id,
    req.user.id,
    req.business.isOwner,
    req.query
  );
  return successResponse(res, 'Stock report retrieved successfully', data);
});

const escapeXml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const escapeCsv = (str) => {
  if (!str) return '';
  return String(str).replace(/"/g, '""');
};

/**
 * Export sales & financial report as Excel XML spreadsheet (.xls)
 */
const exportExcelReport = asyncHandler(async (req, res) => {
  const businessId = req.business.id;
  const userId = req.user.id;
  const isOwner = req.business.isOwner;
  const query = req.query;

  const [dashboard, sales, productsData, outletsData, expenseData] = await Promise.all([
    reportService.getDashboardSummary(businessId, userId, isOwner, query),
    reportService.getSalesReport(businessId, userId, isOwner, query),
    reportService.getProductSalesReport(businessId, userId, isOwner, query),
    reportService.getOutletReport(businessId, userId, isOwner, query),
    reportService.getExpenseReport(businessId, userId, isOwner, query)
  ]);

  const businessName = req.business.name || 'UsahaKu';
  const preset = query.date_preset || 'this_month';
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);

  const totalSales = sales.total_sales || dashboard.sales_today || 0;
  const totalExpenses = expenseData.total_expense || dashboard.expenses_today || 0;
  const netIncome = totalSales - totalExpenses;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11" ss:Color="#0F172A"/></Style>
  <Style ss:ID="Header"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/><Interior ss:Color="#0066FF" ss:Pattern="Solid"/></Style>
  <Style ss:ID="HeaderRed"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/><Interior ss:Color="#EF4444" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Title"><Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#0066FF"/></Style>
  <Style ss:ID="SubTitle"><Font ss:FontName="Calibri" ss:Size="11" ss:Color="#64748B"/></Style>
  <Style ss:ID="Bold"><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/></Style>
  <Style ss:ID="Currency"><NumberFormat ss:Format="&quot;Rp&quot; #,##0"/></Style>
  <Style ss:ID="CurrencyBold"><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/><NumberFormat ss:Format="&quot;Rp&quot; #,##0"/></Style>
 </Styles>
 <Worksheet ss:Name="Ringkasan Finansial">
  <Table ss:DefaultColumnWidth="140">
   <Column ss:Width="200"/><Column ss:Width="180"/><Column ss:Width="180"/>
   <Row><Cell ss:StyleID="Title"><Data ss:Type="String">${escapeXml(businessName.toUpperCase())}</Data></Cell></Row>
   <Row><Cell ss:StyleID="Bold"><Data ss:Type="String">LAPORAN PENJUALAN &amp; KEUANGAN</Data></Cell></Row>
   <Row><Cell ss:StyleID="SubTitle"><Data ss:Type="String">Periode: ${escapeXml(preset)} | Dibuat: ${new Date().toLocaleString('id-ID')}</Data></Cell></Row>
   <Row></Row>
   <Row>
    <Cell ss:StyleID="Header"><Data ss:Type="String">METRIK KEUANGAN</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">NILAI / JUMLAH</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">KETERANGAN</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Total Omset Penjualan</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${totalSales}</Data></Cell>
    <Cell ss:StyleID="SubTitle"><Data ss:Type="String">Total pendapatan kotor</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Total Transaksi Nota</Data></Cell>
    <Cell><Data ss:Type="Number">${sales.transaction_count || dashboard.transactions_today || 0}</Data></Cell>
    <Cell ss:StyleID="SubTitle"><Data ss:Type="String">Pesanan selesai tercatat</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Total Biaya Pengeluaran</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${totalExpenses}</Data></Cell>
    <Cell ss:StyleID="SubTitle"><Data ss:Type="String">Biaya operasional tercatat</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="Bold"><Data ss:Type="String">Laba Bersih (Net Profit)</Data></Cell>
    <Cell ss:StyleID="CurrencyBold"><Data ss:Type="Number">${netIncome}</Data></Cell>
    <Cell ss:StyleID="SubTitle"><Data ss:Type="String">Total Omset dikurangi Biaya</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Rata-rata Transaksi / Nota</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${sales.average_transaction || 0}</Data></Cell>
    <Cell ss:StyleID="SubTitle"><Data ss:Type="String">Rata-rata belanja per pesanan</Data></Cell>
   </Row>
  </Table>
 </Worksheet>
 <Worksheet ss:Name="Performa Menu">
  <Table ss:DefaultColumnWidth="120">
   <Column ss:Width="60"/><Column ss:Width="220"/><Column ss:Width="120"/><Column ss:Width="120"/><Column ss:Width="160"/>
   <Row>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Rank</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Nama Menu / Produk</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Porsi Terjual</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Jumlah Pesanan</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Total Omset (Rp)</Data></Cell>
   </Row>
   ${(productsData.products || []).map((p, i) => `
   <Row>
    <Cell><Data ss:Type="Number">${i + 1}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(p.product_name)}</Data></Cell>
    <Cell><Data ss:Type="Number">${p.quantity_sold}</Data></Cell>
    <Cell><Data ss:Type="Number">${p.order_count}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${p.revenue}</Data></Cell>
   </Row>`).join('')}
  </Table>
 </Worksheet>
 <Worksheet ss:Name="Rincian Pengeluaran">
  <Table ss:DefaultColumnWidth="140">
   <Column ss:Width="60"/><Column ss:Width="220"/><Column ss:Width="140"/><Column ss:Width="160"/>
   <Row>
    <Cell ss:StyleID="HeaderRed"><Data ss:Type="String">No</Data></Cell>
    <Cell ss:StyleID="HeaderRed"><Data ss:Type="String">Kategori Pengeluaran</Data></Cell>
    <Cell ss:StyleID="HeaderRed"><Data ss:Type="String">Jumlah Catatan</Data></Cell>
    <Cell ss:StyleID="HeaderRed"><Data ss:Type="String">Total Biaya (Rp)</Data></Cell>
   </Row>
   ${(expenseData.categories || []).map((c, i) => `
   <Row>
    <Cell><Data ss:Type="Number">${i + 1}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(c.category_name)}</Data></Cell>
    <Cell><Data ss:Type="Number">${c.expense_count}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${c.total_expense}</Data></Cell>
   </Row>`).join('')}
  </Table>
 </Worksheet>
</Workbook>`;

  res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="Laporan_Keuangan_${preset}_${timestamp}.xls"`);
  return res.send(xml);
});

/**
 * Export sales & financial report as CSV
 */
const exportCsvReport = asyncHandler(async (req, res) => {
  const businessId = req.business.id;
  const userId = req.user.id;
  const isOwner = req.business.isOwner;
  const query = req.query;

  const [dashboard, sales, productsData, outletsData, expenseData] = await Promise.all([
    reportService.getDashboardSummary(businessId, userId, isOwner, query),
    reportService.getSalesReport(businessId, userId, isOwner, query),
    reportService.getProductSalesReport(businessId, userId, isOwner, query),
    reportService.getOutletReport(businessId, userId, isOwner, query),
    reportService.getExpenseReport(businessId, userId, isOwner, query)
  ]);

  const businessName = req.business.name || 'UsahaKu';
  const preset = query.date_preset || 'this_month';
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);

  let csv = '\uFEFF'; // UTF-8 BOM
  csv += `"LAPORAN PENJUALAN & KEUANGAN"\n`;
  csv += `"Bisnis","${escapeCsv(businessName)}"\n`;
  csv += `"Periode","${escapeCsv(preset)}"\n`;
  csv += `"Waktu Cetak","${new Date().toLocaleString('id-ID')}"\n\n`;

  csv += `"RINGKASAN EKSEKUTIF"\n`;
  csv += `"Total Omset Penjualan",${sales.total_sales || dashboard.sales_today || 0}\n`;
  csv += `"Total Transaksi Nota",${sales.transaction_count || dashboard.transactions_today || 0}\n`;
  csv += `"Total Biaya Pengeluaran",${expenseData.total_expense || dashboard.expenses_today || 0}\n`;
  csv += `"Laba Bersih",${(sales.total_sales || 0) - (expenseData.total_expense || 0)}\n\n`;

  csv += `"PERFORMA PENJUALAN MENU PRODUK"\n`;
  csv += `"Rank","Nama Menu / Produk","Porsi Terjual","Pesanan","Total Omset"\n`;
  (productsData.products || []).forEach((p, i) => {
    csv += `${i + 1},"${escapeCsv(p.product_name)}",${p.quantity_sold},${p.order_count},${p.revenue}\n`;
  });
  csv += '\n';

  csv += `"RINCIAN BIAYA PENGELUARAN"\n`;
  csv += `"No","Kategori Pengeluaran","Jumlah Catatan","Total Biaya"\n`;
  (expenseData.categories || []).forEach((c, i) => {
    csv += `${i + 1},"${escapeCsv(c.category_name)}",${c.expense_count},${c.total_expense}\n`;
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="Laporan_Keuangan_${preset}_${timestamp}.csv"`);
  return res.send(csv);
});

module.exports = {
  getDashboard,
  getSalesReport,
  getProductSalesReport,
  getOutletReport,
  getExpenseReport,
  getStockReport,
  exportExcelReport,
  exportCsvReport
};
