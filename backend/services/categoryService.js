const { Category, Product, sequelize } = require('../models');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/customErrors');
const { Op } = require('sequelize');

/**
 * List categories in active business
 * @param {number|string} businessId 
 * @param {Object} query 
 */
const listCategories = async (businessId, query = {}) => {
  const { search, is_active } = query;

  const where = { business_id: businessId };

  if (is_active !== undefined) {
    where.is_active = is_active === 'true' || is_active === true;
  }

  if (search) {
    where.name = { [Op.like]: `%${search}%` };
  }

  const categories = await Category.findAll({
    where,
    order: [['name', 'ASC']],
    include: [
      {
        model: Product,
        as: 'products',
        attributes: ['id', 'name', 'is_active']
      }
    ]
  });

  return categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    image: cat.image,
    is_active: cat.is_active,
    total_products: cat.products ? cat.products.length : 0,
    created_at: cat.createdAt || cat.created_at,
    updated_at: cat.updatedAt || cat.updated_at
  }));
};

/**
 * Get category detail by ID
 * @param {number|string} businessId 
 * @param {number|string} categoryId 
 */
const getCategoryById = async (businessId, categoryId) => {
  const category = await Category.findOne({
    where: {
      id: categoryId,
      business_id: businessId
    },
    include: [
      {
        model: Product,
        as: 'products',
        attributes: ['id', 'name', 'selling_price', 'is_active']
      }
    ]
  });

  if (!category) {
    throw new NotFoundError('Category not found in this business', 'CATEGORY_NOT_FOUND');
  }

  return category;
};

/**
 * Create a new category in active business
 * @param {number|string} businessId 
 * @param {Object} payload 
 */
const createCategory = async (businessId, payload) => {
  const { name, description, image } = payload;

  // Check unique name per business
  const existing = await Category.findOne({
    where: {
      business_id: businessId,
      name
    }
  });

  if (existing) {
    throw new ConflictError(`Category with name "${name}" already exists in this business`, 'CATEGORY_EXISTS');
  }

  const category = await Category.create({
    business_id: businessId,
    name,
    description: description || null,
    image: image || null,
    is_active: true
  });

  return category;
};

/**
 * Update an existing category in active business
 * @param {number|string} businessId 
 * @param {number|string} categoryId 
 * @param {Object} payload 
 */
const updateCategory = async (businessId, categoryId, payload) => {
  const { name, description, image, is_active } = payload;

  const category = await Category.findOne({
    where: {
      id: categoryId,
      business_id: businessId
    }
  });

  if (!category) {
    throw new NotFoundError('Category not found in this business', 'CATEGORY_NOT_FOUND');
  }

  // Check unique name if changing name
  if (name && name !== category.name) {
    const existing = await Category.findOne({
      where: {
        business_id: businessId,
        name,
        id: { [Op.ne]: categoryId }
      }
    });

    if (existing) {
      throw new ConflictError(`Category with name "${name}" already exists in this business`, 'CATEGORY_EXISTS');
    }
  }

  await category.update({
    name: name !== undefined ? name : category.name,
    description: description !== undefined ? description : category.description,
    image: image !== undefined ? image : category.image,
    is_active: is_active !== undefined ? is_active : category.is_active
  });

  return category;
};

/**
 * Delete / Deactivate a category
 * @param {number|string} businessId 
 * @param {number|string} categoryId 
 */
const deleteCategory = async (businessId, categoryId) => {
  const category = await Category.findOne({
    where: {
      id: categoryId,
      business_id: businessId
    }
  });

  if (!category) {
    throw new NotFoundError('Category not found in this business', 'CATEGORY_NOT_FOUND');
  }

  // Soft deactivate
  await category.update({ is_active: false });

  return true;
};

module.exports = {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};
