const { Expense, ExpenseCategory, Outlet, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const { NotFoundError, ConflictError, ValidationError, ForbiddenError } = require('../utils/customErrors');
const { getUserAllowedOutlets } = require('./rbacService');
const { parseDateRange } = require('../utils/dateHelper');
const { recordAuditLog } = require('./auditLogService');

// Standard include for Expense
const expenseIncludes = [
  {
    model: Outlet,
    as: 'outlet',
    attributes: ['id', 'name', 'code']
  },
  {
    model: ExpenseCategory,
    as: 'category',
    attributes: ['id', 'name']
  },
  {
    model: User,
    as: 'recorder',
    attributes: ['id', 'name', 'email']
  }
];

// ==============================================================
// EXPENSE CATEGORY SERVICES
// ==============================================================

const listExpenseCategories = async (businessId, query = {}) => {
  const where = { business_id: businessId };
  if (query.is_active !== undefined) {
    where.is_active = query.is_active === 'true' || query.is_active === true;
  }

  return await ExpenseCategory.findAll({
    where,
    order: [['name', 'ASC']]
  });
};

const getExpenseCategoryById = async (businessId, categoryId) => {
  const category = await ExpenseCategory.findOne({
    where: { id: categoryId, business_id: businessId }
  });
  if (!category) {
    throw new NotFoundError('Expense category not found');
  }
  return category;
};

const createExpenseCategory = async (businessId, data) => {
  const existing = await ExpenseCategory.findOne({
    where: { business_id: businessId, name: data.name.trim() }
  });
  if (existing) {
    throw new ConflictError(`Expense category '${data.name}' already exists`);
  }

  return await ExpenseCategory.create({
    business_id: businessId,
    name: data.name.trim(),
    description: data.description || null,
    is_active: true
  });
};

const updateExpenseCategory = async (businessId, categoryId, data) => {
  const category = await getExpenseCategoryById(businessId, categoryId);

  if (data.name && data.name.trim().toLowerCase() !== category.name.toLowerCase()) {
    const existing = await ExpenseCategory.findOne({
      where: {
        business_id: businessId,
        name: data.name.trim(),
        id: { [Op.ne]: categoryId }
      }
    });
    if (existing) {
      throw new ConflictError(`Expense category '${data.name}' already exists`);
    }
  }

  await category.update({
    name: data.name !== undefined ? data.name.trim() : category.name,
    description: data.description !== undefined ? data.description : category.description,
    is_active: data.is_active !== undefined ? data.is_active : category.is_active
  });

  return category;
};

const deleteExpenseCategory = async (businessId, categoryId) => {
  const category = await getExpenseCategoryById(businessId, categoryId);

  const usageCount = await Expense.count({
    where: { category_id: categoryId, business_id: businessId }
  });

  if (usageCount > 0) {
    await category.update({ is_active: false });
    return { deactivated: true, message: 'Expense category deactivated because it has linked expense records' };
  }

  await category.destroy();
  return { deleted: true, message: 'Expense category deleted successfully' };
};

// ==============================================================
// EXPENSE SERVICES
// ==============================================================

const listExpenses = async (businessId, userId, isOwner, query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const allowedOutletIds = await getUserAllowedOutlets(userId, businessId, isOwner);
  if (allowedOutletIds.length === 0) {
    return { expenses: [], totalItems: 0, page, limit };
  }

  const where = {
    business_id: businessId,
    outlet_id: { [Op.in]: allowedOutletIds }
  };

  if (query.outlet_id) {
    if (!allowedOutletIds.includes(Number(query.outlet_id))) {
      throw new ForbiddenError('You do not have access to view expenses for this outlet');
    }
    where.outlet_id = query.outlet_id;
  }

  if (query.category_id) {
    where.category_id = query.category_id;
  }

  if (query.status) {
    where.status = query.status.toUpperCase();
  }

  if (query.preset || query.date_preset || query.date_from || query.date_to) {
    const { startDate, endDate } = parseDateRange(query);
    where.created_at = { [Op.between]: [startDate, endDate] };
  }

  const { rows: expenses, count: totalItems } = await Expense.findAndCountAll({
    where,
    include: expenseIncludes,
    order: [['expense_date', 'DESC'], ['created_at', 'DESC']],
    limit,
    offset
  });

  return { expenses, totalItems, page, limit };
};

const getExpenseById = async (businessId, userId, isOwner, expenseId) => {
  const expense = await Expense.findOne({
    where: { id: expenseId, business_id: businessId },
    include: expenseIncludes
  });

  if (!expense) {
    throw new NotFoundError('Expense record not found in this business');
  }

  const allowedOutletIds = await getUserAllowedOutlets(userId, businessId, isOwner);
  if (!allowedOutletIds.includes(Number(expense.outlet_id))) {
    throw new ForbiddenError('You do not have access to view this expense');
  }

  return expense;
};

const createExpense = async (businessId, userId, isOwner, data) => {
  const { outlet_id, category_id, amount, expense_date, description } = data;

  // 1. Verify outlet
  const outlet = await Outlet.findOne({
    where: { id: outlet_id, business_id: businessId, is_active: true }
  });
  if (!outlet) {
    throw new NotFoundError('Outlet not found or inactive');
  }

  const allowedOutletIds = await getUserAllowedOutlets(userId, businessId, isOwner);
  if (!allowedOutletIds.includes(Number(outlet_id))) {
    throw new ForbiddenError('You do not have access to record expenses for this outlet');
  }

  // 2. Verify category
  const category = await ExpenseCategory.findOne({
    where: { id: category_id, business_id: businessId, is_active: true }
  });
  if (!category) {
    throw new NotFoundError('Expense category not found or inactive in this business');
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const expenseDate = expense_date || todayStr;

  const expense = await Expense.create({
    business_id: businessId,
    outlet_id,
    category_id,
    user_id: userId,
    amount: parseFloat(Number(amount).toFixed(2)),
    expense_date: expenseDate,
    description: description || null,
    status: 'RECORDED'
  });

  await recordAuditLog({
    business_id: businessId,
    user_id: userId,
    action: 'EXPENSE_RECORDED',
    entity_type: 'EXPENSE',
    entity_id: expense.id,
    metadata: { amount: expense.amount, outlet_id, category_id }
  });

  return await getExpenseById(businessId, userId, isOwner, expense.id);
};

const updateExpense = async (businessId, userId, isOwner, expenseId, data) => {
  const expense = await getExpenseById(businessId, userId, isOwner, expenseId);

  if (expense.status === 'CANCELLED') {
    throw new ValidationError('Cannot update a cancelled expense record');
  }

  if (data.outlet_id && data.outlet_id !== expense.outlet_id) {
    const outlet = await Outlet.findOne({
      where: { id: data.outlet_id, business_id: businessId, is_active: true }
    });
    if (!outlet) {
      throw new NotFoundError('Target outlet not found or inactive');
    }
    const allowedOutletIds = await getUserAllowedOutlets(userId, businessId, isOwner);
    if (!allowedOutletIds.includes(Number(data.outlet_id))) {
      throw new ForbiddenError('You do not have access to assign expenses to this outlet');
    }
  }

  if (data.category_id && data.category_id !== expense.category_id) {
    const category = await ExpenseCategory.findOne({
      where: { id: data.category_id, business_id: businessId, is_active: true }
    });
    if (!category) {
      throw new NotFoundError('Expense category not found in this business');
    }
  }

  await expense.update({
    outlet_id: data.outlet_id !== undefined ? data.outlet_id : expense.outlet_id,
    category_id: data.category_id !== undefined ? data.category_id : expense.category_id,
    amount: data.amount !== undefined ? parseFloat(Number(data.amount).toFixed(2)) : expense.amount,
    expense_date: data.expense_date !== undefined ? data.expense_date : expense.expense_date,
    description: data.description !== undefined ? data.description : expense.description,
    status: data.status !== undefined ? data.status : expense.status
  });

  await recordAuditLog({
    business_id: businessId,
    user_id: userId,
    action: 'EXPENSE_UPDATED',
    entity_type: 'EXPENSE',
    entity_id: expense.id,
    metadata: { amount: expense.amount, outlet_id: expense.outlet_id }
  });

  return await getExpenseById(businessId, userId, isOwner, expense.id);
};

const cancelExpense = async (businessId, userId, isOwner, expenseId, reason) => {
  const expense = await getExpenseById(businessId, userId, isOwner, expenseId);

  if (expense.status === 'CANCELLED') {
    throw new ValidationError('Expense is already cancelled');
  }

  const cancelNote = reason ? `Cancelled: ${reason}` : 'Cancelled';
  const updatedDesc = expense.description ? `${expense.description} | ${cancelNote}` : cancelNote;

  await expense.update({
    status: 'CANCELLED',
    description: updatedDesc
  });

  await recordAuditLog({
    business_id: businessId,
    user_id: userId,
    action: 'EXPENSE_CANCELLED',
    entity_type: 'EXPENSE',
    entity_id: expense.id,
    metadata: { reason }
  });

  return await getExpenseById(businessId, userId, isOwner, expense.id);
};

const deleteExpense = async (businessId, userId, isOwner, expenseId) => {
  const expense = await getExpenseById(businessId, userId, isOwner, expenseId);
  await expense.destroy();
  return true;
};

module.exports = {
  listExpenseCategories,
  getExpenseCategoryById,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  listExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  cancelExpense,
  deleteExpense
};
