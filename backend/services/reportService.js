const {
  Transaction,
  TransactionItem,
  Payment,
  Expense,
  ExpenseCategory,
  Outlet,
  Product,
  Ingredient,
  Unit,
  sequelize
} = require('../models');
const { Op } = require('sequelize');
const { NotFoundError, ForbiddenError } = require('../utils/customErrors');
const { getUserAllowedOutlets } = require('./rbacService');
const { parseDateRange } = require('../utils/dateHelper');
const { getOutletStockList } = require('./inventoryService');

/**
 * 1. Dashboard Overview Summary
 */
const getDashboardSummary = async (businessId, userId, isOwner, query = {}) => {
  const allowedOutletIds = await getUserAllowedOutlets(userId, businessId, isOwner);
  if (allowedOutletIds.length === 0) {
    return {
      sales_today: 0,
      transactions_today: 0,
      expenses_today: 0,
      products_sold_today: 0,
      net_income_today: 0
    };
  }

  const { startDate, endDate, preset } = parseDateRange(query, 'today');

  const outletFilter = query.outlet_id
    ? [Number(query.outlet_id)]
    : allowedOutletIds;

  // 1a. Sales and Transaction Count
  const txSummary = await Transaction.findOne({
    where: {
      business_id: businessId,
      outlet_id: { [Op.in]: outletFilter },
      transaction_status: 'COMPLETED',
      created_at: { [Op.between]: [startDate, endDate] }
    },
    attributes: [
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total')), 0), 'total_sales'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'transaction_count']
    ],
    raw: true
  });

  const salesToday = parseFloat(Number(txSummary?.total_sales || 0).toFixed(2));
  const transactionsToday = parseInt(txSummary?.transaction_count || 0, 10);

  // 1b. Expenses
  const expSummary = await Expense.findOne({
    where: {
      business_id: businessId,
      outlet_id: { [Op.in]: outletFilter },
      status: 'RECORDED',
      created_at: { [Op.between]: [startDate, endDate] }
    },
    attributes: [
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'total_expenses']
    ],
    raw: true
  });

  const expensesToday = parseFloat(Number(expSummary?.total_expenses || 0).toFixed(2));

  // 1c. Products Quantity Sold
  const itemsSummary = await TransactionItem.findOne({
    include: [
      {
        model: Transaction,
        as: 'transaction',
        attributes: [],
        where: {
          business_id: businessId,
          outlet_id: { [Op.in]: outletFilter },
          transaction_status: 'COMPLETED',
          created_at: { [Op.between]: [startDate, endDate] }
        }
      }
    ],
    attributes: [
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('quantity')), 0), 'total_qty']
    ],
    raw: true
  });

  const productsSoldToday = parseFloat(Number(itemsSummary?.total_qty || 0).toFixed(4));
  const netIncomeToday = parseFloat((salesToday - expensesToday).toFixed(2));

  return {
    sales_today: salesToday,
    transactions_today: transactionsToday,
    expenses_today: expensesToday,
    products_sold_today: productsSoldToday,
    net_income_today: netIncomeToday,
    period: {
      preset,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString()
    }
  };
};

/**
 * 2. Sales Report with aggregated metrics and payment breakdown
 */
const getSalesReport = async (businessId, userId, isOwner, query = {}) => {
  const allowedOutletIds = await getUserAllowedOutlets(userId, businessId, isOwner);
  if (allowedOutletIds.length === 0) {
    return { total_sales: 0, transaction_count: 0, average_transaction: 0, payment_methods: [] };
  }

  const { startDate, endDate, preset } = parseDateRange(query, 'this_month');

  const outletFilter = query.outlet_id
    ? [Number(query.outlet_id)]
    : allowedOutletIds;

  if (query.outlet_id && !allowedOutletIds.includes(Number(query.outlet_id))) {
    throw new ForbiddenError('You do not have access to view reports for this outlet');
  }

  // Aggregate Total Sales
  const salesSummary = await Transaction.findOne({
    where: {
      business_id: businessId,
      outlet_id: { [Op.in]: outletFilter },
      transaction_status: 'COMPLETED',
      created_at: { [Op.between]: [startDate, endDate] }
    },
    attributes: [
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total')), 0), 'total_sales'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('subtotal')), 0), 'total_subtotal'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('discount')), 0), 'total_discount'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('tax')), 0), 'total_tax'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'transaction_count']
    ],
    raw: true
  });

  const totalSales = parseFloat(Number(salesSummary?.total_sales || 0).toFixed(2));
  const totalSubtotal = parseFloat(Number(salesSummary?.total_subtotal || 0).toFixed(2));
  const totalDiscount = parseFloat(Number(salesSummary?.total_discount || 0).toFixed(2));
  const totalTax = parseFloat(Number(salesSummary?.total_tax || 0).toFixed(2));
  const transactionCount = parseInt(salesSummary?.transaction_count || 0, 10);
  const averageTransaction = transactionCount > 0 ? parseFloat((totalSales / transactionCount).toFixed(2)) : 0;

  // Breakdown by Payment Method
  const paymentBreakdown = await Payment.findAll({
    include: [
      {
        model: Transaction,
        as: 'transaction',
        attributes: [],
        where: {
          business_id: businessId,
          outlet_id: { [Op.in]: outletFilter },
          transaction_status: 'COMPLETED',
          created_at: { [Op.between]: [startDate, endDate] }
        }
      }
    ],
    attributes: [
      'method',
      [sequelize.fn('COUNT', sequelize.col('Payment.id')), 'count'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('Payment.amount')), 0), 'total_amount']
    ],
    group: ['method'],
    raw: true
  });

  return {
    total_sales: totalSales,
    total_subtotal: totalSubtotal,
    total_discount: totalDiscount,
    total_tax: totalTax,
    transaction_count: transactionCount,
    average_transaction: averageTransaction,
    payment_methods: paymentBreakdown.map(p => ({
      method: p.method,
      count: parseInt(p.count, 10),
      total_amount: parseFloat(Number(p.total_amount).toFixed(2))
    })),
    period: {
      preset,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString()
    }
  };
};

/**
 * 3. Product Sales Performance Report
 */
const getProductSalesReport = async (businessId, userId, isOwner, query = {}) => {
  const allowedOutletIds = await getUserAllowedOutlets(userId, businessId, isOwner);
  if (allowedOutletIds.length === 0) {
    return { products: [], total_revenue: 0, total_quantity_sold: 0 };
  }

  const { startDate, endDate, preset } = parseDateRange(query, 'this_month');

  const outletFilter = query.outlet_id
    ? [Number(query.outlet_id)]
    : allowedOutletIds;

  if (query.outlet_id && !allowedOutletIds.includes(Number(query.outlet_id))) {
    throw new ForbiddenError('You do not have access to view reports for this outlet');
  }

  const productStats = await TransactionItem.findAll({
    include: [
      {
        model: Transaction,
        as: 'transaction',
        attributes: [],
        where: {
          business_id: businessId,
          outlet_id: { [Op.in]: outletFilter },
          transaction_status: 'COMPLETED',
          created_at: { [Op.between]: [startDate, endDate] }
        }
      }
    ],
    attributes: [
      'product_id',
      'product_name',
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('TransactionItem.quantity')), 0), 'quantity_sold'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('TransactionItem.subtotal')), 0), 'revenue'],
      [sequelize.fn('COUNT', sequelize.col('TransactionItem.id')), 'order_count']
    ],
    group: ['product_id', 'product_name'],
    order: [[sequelize.literal('revenue'), 'DESC']],
    raw: true
  });

  let totalRevenue = 0;
  let totalQuantitySold = 0;

  const formattedProducts = productStats.map(p => {
    const rev = parseFloat(Number(p.revenue).toFixed(2));
    const qty = parseFloat(Number(p.quantity_sold).toFixed(4));
    totalRevenue += rev;
    totalQuantitySold += qty;

    return {
      product_id: p.product_id,
      product_name: p.product_name,
      quantity_sold: qty,
      revenue: rev,
      order_count: parseInt(p.order_count, 10)
    };
  });

  return {
    products: formattedProducts,
    total_revenue: parseFloat(totalRevenue.toFixed(2)),
    total_quantity_sold: parseFloat(totalQuantitySold.toFixed(4)),
    period: {
      preset,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString()
    }
  };
};

/**
 * 4. Outlet Comparison Report (Sales, Expenses, Net Profit)
 */
const getOutletReport = async (businessId, userId, isOwner, query = {}) => {
  const allowedOutletIds = await getUserAllowedOutlets(userId, businessId, isOwner);
  if (allowedOutletIds.length === 0) {
    return { outlets: [] };
  }

  const { startDate, endDate, preset } = parseDateRange(query, 'this_month');

  const outlets = await Outlet.findAll({
    where: {
      id: { [Op.in]: allowedOutletIds },
      business_id: businessId,
      is_active: true
    },
    order: [['name', 'ASC']]
  });

  const outletReports = await Promise.all(
    outlets.map(async (outlet) => {
      // Sales
      const salesData = await Transaction.findOne({
        where: {
          business_id: businessId,
          outlet_id: outlet.id,
          transaction_status: 'COMPLETED',
          created_at: { [Op.between]: [startDate, endDate] }
        },
        attributes: [
          [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total')), 0), 'sales'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'transaction_count']
        ],
        raw: true
      });

      // Expenses
      const expenseData = await Expense.findOne({
        where: {
          business_id: businessId,
          outlet_id: outlet.id,
          status: 'RECORDED',
          created_at: { [Op.between]: [startDate, endDate] }
        },
        attributes: [
          [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'expenses']
        ],
        raw: true
      });

      const sales = parseFloat(Number(salesData?.sales || 0).toFixed(2));
      const transactionCount = parseInt(salesData?.transaction_count || 0, 10);
      const expense = parseFloat(Number(expenseData?.expenses || 0).toFixed(2));
      const netProfit = parseFloat((sales - expense).toFixed(2));

      return {
        outlet_id: outlet.id,
        name: outlet.name,
        code: outlet.code,
        transaction_count: transactionCount,
        sales,
        expense,
        net_profit: netProfit
      };
    })
  );

  return {
    outlets: outletReports,
    period: {
      preset,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString()
    }
  };
};

/**
 * 5. Expense Breakdown Report by Category
 */
const getExpenseReport = async (businessId, userId, isOwner, query = {}) => {
  const allowedOutletIds = await getUserAllowedOutlets(userId, businessId, isOwner);
  if (allowedOutletIds.length === 0) {
    return { total_expense: 0, categories: [] };
  }

  const { startDate, endDate, preset } = parseDateRange(query, 'this_month');

  const outletFilter = query.outlet_id
    ? [Number(query.outlet_id)]
    : allowedOutletIds;

  if (query.outlet_id && !allowedOutletIds.includes(Number(query.outlet_id))) {
    throw new ForbiddenError('You do not have access to view reports for this outlet');
  }

  const where = {
    business_id: businessId,
    outlet_id: { [Op.in]: outletFilter },
    status: 'RECORDED',
    created_at: { [Op.between]: [startDate, endDate] }
  };

  if (query.category_id) {
    where.category_id = query.category_id;
  }

  // Category Breakdown
  const categoryStats = await Expense.findAll({
    where,
    include: [
      {
        model: ExpenseCategory,
        as: 'category',
        attributes: ['id', 'name']
      }
    ],
    attributes: [
      'category_id',
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'total_amount'],
      [sequelize.fn('COUNT', sequelize.col('Expense.id')), 'expense_count']
    ],
    group: ['category_id', 'category.id', 'category.name'],
    order: [[sequelize.literal('total_amount'), 'DESC']],
    raw: true,
    nest: true
  });

  let totalExpense = 0;
  const categories = categoryStats.map(c => {
    const amt = parseFloat(Number(c.total_amount).toFixed(2));
    totalExpense += amt;
    return {
      category_id: c.category_id,
      category_name: c.category ? c.category.name : `Category #${c.category_id}`,
      total_expense: amt,
      expense_count: parseInt(c.expense_count, 10)
    };
  });

  return {
    total_expense: parseFloat(totalExpense.toFixed(2)),
    categories,
    period: {
      preset,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString()
    }
  };
};

/**
 * 6. Real-Time Stock Status Report for an Outlet
 */
const getStockReport = async (businessId, userId, isOwner, query = {}) => {
  const allowedOutletIds = await getUserAllowedOutlets(userId, businessId, isOwner);
  if (allowedOutletIds.length === 0) {
    return { stock: [] };
  }

  const outletId = query.outlet_id || allowedOutletIds[0];
  if (!allowedOutletIds.includes(Number(outletId))) {
    throw new ForbiddenError('You do not have access to view inventory for this outlet');
  }

  return await getOutletStockList(businessId, outletId, query);
};

module.exports = {
  getDashboardSummary,
  getSalesReport,
  getProductSalesReport,
  getOutletReport,
  getExpenseReport,
  getStockReport
};
