'use strict';

const crypto = require('crypto');
const env = require('../config/env');
const midtransService = require('../services/midtransService');

console.log('--- Testing Midtrans Service Configuration & Security ---');
console.log('Midtrans Production Mode:', env.MIDTRANS.IS_PRODUCTION);
console.log('Client Key Prefix:', env.MIDTRANS.CLIENT_KEY.substring(0, 10) + '...');
console.log('Server Key Prefix:', env.MIDTRANS.SERVER_KEY.substring(0, 10) + '...');

// Test Signature Verification
const orderId = 'INV-SUB-TEST-001';
const statusCode = '200';
const grossAmount = '30000.00';
const testPayload = `${orderId}${statusCode}${grossAmount}${env.MIDTRANS.SERVER_KEY}`;
const expectedSignature = crypto.createHash('sha512').update(testPayload).digest('hex');

const mockNotification = {
  order_id: orderId,
  status_code: statusCode,
  gross_amount: grossAmount,
  signature_key: expectedSignature
};

const isValid = midtransService.verifyNotificationSignature(mockNotification);
console.log('Signature Verification Test:', isValid ? 'PASSED ✅' : 'FAILED ❌');

if (!isValid) {
  process.exit(1);
}

// Test Signature Tamper Resistance
const tamperedNotification = {
  ...mockNotification,
  gross_amount: '10000.00' // Changed amount
};
const isTamperedValid = midtransService.verifyNotificationSignature(tamperedNotification);
console.log('Tamper Resistance Test:', !isTamperedValid ? 'PASSED ✅' : 'FAILED ❌');

if (isTamperedValid) {
  process.exit(1);
}

console.log('All Midtrans security unit tests passed successfully!');
