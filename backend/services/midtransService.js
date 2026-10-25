'use strict';

const midtransClient = require('midtrans-client');
const crypto = require('crypto');
const env = require('../config/env');
const { InternalServerError, BadRequestError } = require('../utils/customErrors');

// Initialize Midtrans Snap client
const snap = new midtransClient.Snap({
  isProduction: env.MIDTRANS.IS_PRODUCTION,
  serverKey: env.MIDTRANS.SERVER_KEY,
  clientKey: env.MIDTRANS.CLIENT_KEY
});

// Initialize Midtrans CoreApi client for direct status queries
const coreApi = new midtransClient.CoreApi({
  isProduction: env.MIDTRANS.IS_PRODUCTION,
  serverKey: env.MIDTRANS.SERVER_KEY,
  clientKey: env.MIDTRANS.CLIENT_KEY
});

/**
 * Create Midtrans Snap Transaction
 * @param {Object} params
 * @param {string} params.orderId
 * @param {number} params.grossAmount
 * @param {Array} params.itemDetails
 * @param {Object} params.customerDetails
 * @returns {Promise<{ token: string, redirect_url: string }>}
 */
const createSnapTransaction = async ({ orderId, grossAmount, itemDetails, customerDetails }) => {
  try {
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: Math.round(Number(grossAmount))
      },
      item_details: itemDetails || [
        {
          id: orderId,
          price: Math.round(Number(grossAmount)),
          quantity: 1,
          name: 'Langganan UsahaKu POS'
        }
      ],
      customer_details: {
        first_name: customerDetails?.name || 'Customer',
        email: customerDetails?.email || 'customer@usahaku.id',
        phone: customerDetails?.phone || '08123456789'
      },
      credit_card: {
        secure: true
      }
    };

    const transaction = await snap.createTransaction(parameter);
    return {
      token: transaction.token,
      redirect_url: transaction.redirect_url
    };
  } catch (error) {
    console.error('Midtrans Snap Error:', error.message || error);
    throw new InternalServerError(
      `Gagal membuat transaksi pembayaran Midtrans: ${error.message || 'Koneksi ke Midtrans gagal'}`,
      'MIDTRANS_CREATE_FAILED'
    );
  }
};

/**
 * Verify Midtrans Webhook Signature
 * Signature format: SHA512(order_id + status_code + gross_amount + server_key)
 * @param {Object} notification
 * @returns {boolean}
 */
const verifyNotificationSignature = (notification) => {
  const { order_id, status_code, gross_amount, signature_key } = notification;

  if (!order_id || !status_code || !gross_amount || !signature_key) {
    return false;
  }

  const payload = `${order_id}${status_code}${gross_amount}${env.MIDTRANS.SERVER_KEY}`;
  const calculatedSignature = crypto.createHash('sha512').update(payload).digest('hex');

  return calculatedSignature.toLowerCase() === signature_key.toLowerCase();
};

/**
 * Check Transaction Status directly with Midtrans
 * @param {string} orderId
 * @returns {Promise<Object>}
 */
const checkTransactionStatus = async (orderId) => {
  try {
    return await coreApi.transaction.status(orderId);
  } catch (error) {
    console.error(`Midtrans status check error for order ${orderId}:`, error.message || error);
    throw new BadRequestError(
      `Gagal memeriksa status pembayaran di Midtrans: ${error.message || 'Order ID tidak ditemukan'}`,
      'MIDTRANS_STATUS_CHECK_FAILED'
    );
  }
};

module.exports = {
  snap,
  coreApi,
  createSnapTransaction,
  verifyNotificationSignature,
  checkTransactionStatus
};
