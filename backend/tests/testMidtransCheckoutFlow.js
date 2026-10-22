'use strict';

const crypto = require('crypto');
const env = require('../config/env');
const {
  User,
  Business,
  BusinessUser,
  SubscriptionPlan,
  Subscription,
  SubscriptionInvoice,
  sequelize
} = require('../models');
const subscriptionService = require('../services/subscriptionService');

const runIntegrationTest = async () => {
  console.log('--- Starting Midtrans Checkout & Webhook Integration Test ---');

  const t = await sequelize.transaction();
  try {
    // 1. Create a mock owner & business for testing
    const testUser = await User.create({
      name: 'Midtrans Test Owner',
      email: `midtrans_tester_${Date.now()}@example.com`,
      password: 'HashedPassword123!',
      phone: '081299998888',
      is_active: true
    }, { transaction: t });

    const testBusiness = await Business.create({
      owner_id: testUser.id,
      name: 'Kedai Es Teh Uji Midtrans',
      is_active: true
    }, { transaction: t });

    await BusinessUser.create({
      business_id: testBusiness.id,
      user_id: testUser.id,
      is_owner: true,
      is_active: true
    }, { transaction: t });

    // 2. Fetch the Paid Subscription Plan (30.000)
    let plan = await SubscriptionPlan.findOne({
      where: { price: 30000, is_active: true },
      transaction: t
    });

    if (!plan) {
      plan = await SubscriptionPlan.findOne({
        where: { is_active: true },
        order: [['price', 'DESC']],
        transaction: t
      });
    }

    console.log(`Target SaaS Plan: ${plan.name} (Rp ${plan.price})`);

    // Commit setup transaction so service methods can query records
    await t.commit();

    // 3. Test createCheckoutSession
    console.log('Testing createCheckoutSession...');
    const checkoutResult = await subscriptionService.createCheckoutSession(
      testBusiness.id,
      plan.id,
      testUser
    );

    console.log('Checkout Result:');
    console.log('- Order ID:', checkoutResult.order_id);
    console.log('- Token Generated:', checkoutResult.token ? 'YES ✅' : 'NO ❌');
    console.log('- Redirect URL:', checkoutResult.redirect_url ? checkoutResult.redirect_url.substring(0, 45) + '...' : 'NONE ❌');
    console.log('- Amount:', checkoutResult.amount);

    if (!checkoutResult.order_id || !checkoutResult.token) {
      throw new Error('Checkout failed to generate Order ID or Snap Token');
    }

    // 4. Verify Invoice in Database
    const invoice = await SubscriptionInvoice.findOne({
      where: { order_id: checkoutResult.order_id }
    });

    if (!invoice || invoice.status !== 'PENDING') {
      throw new Error('Subscription invoice was not recorded properly as PENDING');
    }
    console.log('Invoice verified in DB with status PENDING ✅');

    // 5. Simulate Midtrans Webhook Notification with valid SHA512 signature
    console.log('Simulating Midtrans Webhook settlement notification...');
    const orderId = checkoutResult.order_id;
    const statusCode = '200';
    const grossAmount = `${Number(checkoutResult.amount).toFixed(2)}`;
    const payload = `${orderId}${statusCode}${grossAmount}${env.MIDTRANS.SERVER_KEY}`;
    const signatureKey = crypto.createHash('sha512').update(payload).digest('hex');

    const webhookPayload = {
      order_id: orderId,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: signatureKey,
      transaction_status: 'settlement',
      payment_type: 'qris',
      fraud_status: 'accept'
    };

    const webhookResult = await subscriptionService.handleMidtransNotification(webhookPayload);
    console.log('Webhook Handler Result:', webhookResult);

    // 6. Verify Invoice and Subscription Status in Database
    await invoice.reload();
    console.log('Invoice Status After Webhook:', invoice.status);

    if (invoice.status !== 'PAID') {
      throw new Error(`Expected invoice status PAID but got ${invoice.status}`);
    }

    const activeSub = await Subscription.findOne({
      where: { business_id: testBusiness.id, status: 'ACTIVE' },
      order: [['id', 'DESC']]
    });

    if (!activeSub) {
      throw new Error('Active subscription was not activated for business');
    }

    console.log('Subscription Activated Successfully ✅');
    console.log('- Sub ID:', activeSub.id);
    console.log('- Status:', activeSub.status);
    console.log('- Ends At:', activeSub.ends_at);

    // 7. Cleanup test data
    console.log('Cleaning up test data...');
    await SubscriptionInvoice.destroy({ where: { business_id: testBusiness.id } });
    await Subscription.destroy({ where: { business_id: testBusiness.id } });
    await BusinessUser.destroy({ where: { business_id: testBusiness.id } });
    await Business.destroy({ where: { id: testBusiness.id } });
    await User.destroy({ where: { id: testUser.id } });

    console.log('--- ALL MIDTRANS INTEGRATION TESTS PASSED 100% SUCCESSFUL! 🎉 ---');
    process.exit(0);

  } catch (error) {
    console.error('Integration Test Error:', error.message || error);
    try { await t.rollback(); } catch (_) {}
    process.exit(1);
  }
};

runIntegrationTest();
