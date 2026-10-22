const subscriptionService = require('../services/subscriptionService');
const { successResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get current business subscription status and usage limits
 */
const getCurrentSubscription = asyncHandler(async (req, res) => {
  const data = await subscriptionService.getSubscriptionOverview(req.business.id);
  return successResponse(res, 'Subscription details retrieved successfully', data);
});

/**
 * List all available subscription plans
 */
const getPlans = asyncHandler(async (req, res) => {
  const plans = await subscriptionService.listPlans();
  return successResponse(res, 'Subscription plans retrieved successfully', plans);
});

/**
 * Upgrade business subscription plan (Simulated upgrade for testing)
 */
const upgradePlan = asyncHandler(async (req, res) => {
  const data = await subscriptionService.upgradeSubscription(
    req.business.id,
    req.body.plan_id,
    req.body.status || 'ACTIVE'
  );
  return successResponse(res, 'Subscription upgraded successfully', data);
});

/**
 * Create Midtrans Snap Checkout Session
 */
const checkout = asyncHandler(async (req, res) => {
  const data = await subscriptionService.createCheckoutSession(
    req.business.id,
    req.body.plan_id,
    req.user
  );
  return successResponse(res, 'Sesi checkout Midtrans berhasil dibuat', data);
});

/**
 * Webhook endpoint for Midtrans notifications
 */
const handleWebhook = asyncHandler(async (req, res) => {
  const result = await subscriptionService.handleMidtransNotification(req.body);
  return successResponse(res, 'Notifikasi Midtrans berhasil diproses', result);
});

/**
 * Check and Synchronize Payment Status directly with Midtrans
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const orderId = req.params.orderId || req.query.order_id || req.body.order_id;
  const data = await subscriptionService.checkPaymentStatus(orderId, req.business.id);
  return successResponse(res, 'Status pembayaran berhasil diverifikasi', data);
});

/**
 * List all subscription invoices for current business
 */
const getInvoices = asyncHandler(async (req, res) => {
  const invoices = await subscriptionService.listInvoices(req.business.id);
  return successResponse(res, 'Daftar invoice langganan berhasil diambil', invoices);
});

/**
 * Landing Page: Payment Finish (Redirect from Midtrans Snap)
 */
const paymentFinish = (req, res) => {
  const orderId = req.query.order_id || '';
  res.status(200).send(`
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pembayaran Berhasil - BizManage POS</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 flex items-center justify-center min-h-screen p-4 font-sans">
  <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
    <div class="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400">
      <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
      </svg>
    </div>
    <h1 class="text-2xl font-black text-white tracking-tight mb-2">Pembayaran Berhasil!</h1>
    <p class="text-sm text-slate-400 mb-6">
      Terima kasih. Transaksi langganan BizManage POS Anda telah berhasil diverifikasi oleh gateway Midtrans.
    </p>
    ${orderId ? `
    <div class="bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-6 text-xs text-left">
      <span class="text-slate-500 block mb-1">Nomor Tagihan:</span>
      <span class="font-mono font-bold text-indigo-400 text-sm break-all">${orderId}</span>
    </div>` : ''}
    <div class="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mb-6 text-xs text-emerald-300 font-medium">
      🎉 Langganan Anda telah aktif dan dapat langsung menikmati seluruh fitur kasir, cabang, & laporan.
    </div>
    <p class="text-xs text-slate-500">
      Silakan tutup halaman ini dan kembali ke aplikasi <strong>BizManage POS</strong> Anda.
    </p>
  </div>
</body>
</html>
  `);
};

/**
 * Landing Page: Payment Unfinish (Pending / User closed before paying)
 */
const paymentUnfinish = (req, res) => {
  const orderId = req.query.order_id || '';
  res.status(200).send(`
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pembayaran Belum Selesai - BizManage POS</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 flex items-center justify-center min-h-screen p-4 font-sans">
  <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
    <div class="w-20 h-20 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-400">
      <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    </div>
    <h1 class="text-2xl font-black text-white tracking-tight mb-2">Menunggu Pembayaran</h1>
    <p class="text-sm text-slate-400 mb-6">
      Pembayaran Anda belum diselesaikan. Silakan selesaikan pembayaran Anda sebelum batas waktu habis.
    </p>
    ${orderId ? `
    <div class="bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-6 text-xs text-left">
      <span class="text-slate-500 block mb-1">Nomor Tagihan:</span>
      <span class="font-mono font-bold text-amber-400 text-sm break-all">${orderId}</span>
    </div>` : ''}
    <p class="text-xs text-slate-500">
      Setelah menyelesaikan pembayaran, buka aplikasi <strong>BizManage POS</strong> dan klik <strong>Cek Status Pembayaran</strong>.
    </p>
  </div>
</body>
</html>
  `);
};

/**
 * Landing Page: Payment Error / Cancelled
 */
const paymentError = (req, res) => {
  const orderId = req.query.order_id || '';
  res.status(200).send(`
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pembayaran Gagal - BizManage POS</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 flex items-center justify-center min-h-screen p-4 font-sans">
  <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
    <div class="w-20 h-20 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-400">
      <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    </div>
    <h1 class="text-2xl font-black text-white tracking-tight mb-2">Pembayaran Gagal</h1>
    <p class="text-sm text-slate-400 mb-6">
      Transaksi pembayaran dibatalkan atau tidak berhasil diproses oleh bank/gateway.
    </p>
    ${orderId ? `
    <div class="bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-6 text-xs text-left">
      <span class="text-slate-500 block mb-1">Nomor Tagihan:</span>
      <span class="font-mono font-bold text-rose-400 text-sm break-all">${orderId}</span>
    </div>` : ''}
    <p class="text-xs text-slate-500">
      Silakan buka kembali aplikasi <strong>BizManage POS</strong> untuk mencoba metode pembayaran lainnya.
    </p>
  </div>
</body>
</html>
  `);
};

module.exports = {
  getCurrentSubscription,
  getPlans,
  upgradePlan,
  checkout,
  handleWebhook,
  verifyPayment,
  getInvoices,
  paymentFinish,
  paymentUnfinish,
  paymentError
};
