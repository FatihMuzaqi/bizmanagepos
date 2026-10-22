const { 
  Product, 
  Category, 
  ProductVariant, 
  Modifier, 
  ModifierOption, 
  ProductModifier, 
  sequelize 
} = require('../models');
const { NotFoundError, ConflictError, BadRequestError, ForbiddenError } = require('../utils/customErrors');
const { Op } = require('sequelize');
const { recordAuditLog } = require('./auditLogService');

/**
 * List products with pagination, search, and category filtering
 * @param {number|string} businessId 
 * @param {Object} query 
 */
const listProducts = async (businessId, query = {}) => {
  const { 
    page = 1, 
    limit = 20, 
    search, 
    category_id, 
    is_active 
  } = query;

  const offset = (Number(page) - 1) * Number(limit);
  const where = { business_id: businessId };

  if (is_active !== undefined) {
    where.is_active = is_active === 'true' || is_active === true;
  }

  if (category_id) {
    where.category_id = Number(category_id);
  }

  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { sku: { [Op.like]: `%${search}%` } }
    ];
  }

  const { rows, count } = await Product.findAndCountAll({
    where,
    limit: Number(limit),
    offset,
    distinct: true,
    order: [['name', 'ASC']],
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name']
      },
      {
        model: ProductVariant,
        as: 'variants',
        attributes: ['id', 'name', 'sku', 'cost_price', 'selling_price', 'is_default', 'is_active']
      },
      {
        model: Modifier,
        as: 'modifiers',
        through: { attributes: [] },
        attributes: ['id', 'name', 'type', 'is_required'],
        include: [
          {
            model: ModifierOption,
            as: 'options',
            attributes: ['id', 'name', 'price_adjustment', 'is_default']
          }
        ]
      }
    ]
  });

  return {
    products: rows,
    totalItems: count,
    page: Number(page),
    limit: Number(limit)
  };
};

/**
 * Get product detail by ID with Category, Variants, and Modifiers
 * @param {number|string} businessId 
 * @param {number|string} productId 
 */
const getProductById = async (businessId, productId, transaction = null) => {
  const queryOptions = {
    where: {
      id: productId,
      business_id: businessId
    },
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'description']
      },
      {
        model: ProductVariant,
        as: 'variants',
        attributes: ['id', 'name', 'sku', 'cost_price', 'selling_price', 'is_default', 'is_active']
      },
      {
        model: Modifier,
        as: 'modifiers',
        through: { attributes: [] },
        attributes: ['id', 'name', 'type', 'is_required', 'min_selection', 'max_selection', 'is_active'],
        include: [
          {
            model: ModifierOption,
            as: 'options',
            attributes: ['id', 'name', 'price_adjustment', 'is_default', 'is_active']
          }
        ]
      }
    ]
  };

  if (transaction) {
    queryOptions.transaction = transaction;
  }

  const product = await Product.findOne(queryOptions);

  if (!product) {
    throw new NotFoundError('Product not found in this business', 'PRODUCT_NOT_FOUND');
  }

  return product;
};

/**
 * Create a new product with optional variants and modifiers
 * @param {number|string} businessId 
 * @param {Object} payload 
 */
const createProduct = async (businessId, payload) => {
  const {
    name,
    category_id,
    sku,
    description,
    image,
    cost_price = 0.00,
    selling_price = 0.00,
    track_stock = false,
    variants,
    modifier_ids
  } = payload;

  // 1. Validate Category ownership if provided
  if (category_id) {
    const category = await Category.findOne({
      where: { id: category_id, business_id: businessId }
    });
    if (!category) {
      throw new BadRequestError('Invalid category ID for this business', 'INVALID_CATEGORY');
    }
  }

  // 2. Validate SKU uniqueness within business
  if (sku) {
    const existingSku = await Product.findOne({
      where: { business_id: businessId, sku }
    });
    if (existingSku) {
      throw new ConflictError(`Product with SKU "${sku}" already exists in this business`, 'SKU_ALREADY_EXISTS');
    }
  }

  // 3. Execute atomic transaction
  const result = await sequelize.transaction(async (t) => {
    // Create Product
    const product = await Product.create({
      business_id: businessId,
      category_id: category_id || null,
      name,
      sku: sku || null,
      description: description || null,
      image: image || null,
      cost_price,
      selling_price,
      track_stock,
      is_active: true
    }, { transaction: t });

    // Create Variants if provided
    if (variants && Array.isArray(variants) && variants.length > 0) {
      const variantRecords = variants.map(v => ({
        product_id: product.id,
        name: v.name,
        sku: v.sku || null,
        cost_price: v.cost_price || 0.00,
        selling_price: v.selling_price || 0.00,
        is_default: v.is_default || false,
        is_active: true
      }));

      await ProductVariant.bulkCreate(variantRecords, { transaction: t });
    }

    // Attach Modifiers if provided
    if (modifier_ids && Array.isArray(modifier_ids) && modifier_ids.length > 0) {
      const validModifiers = await Modifier.findAll({
        where: { id: modifier_ids, business_id: businessId },
        transaction: t
      });

      if (validModifiers.length !== modifier_ids.length) {
        throw new BadRequestError('One or more modifier IDs are invalid for this business', 'INVALID_MODIFIERS');
      }

      const prodModRecords = validModifiers.map(m => ({
        product_id: product.id,
        modifier_id: m.id
      }));

      await ProductModifier.bulkCreate(prodModRecords, { transaction: t });
    }

    await recordAuditLog({
      business_id: businessId,
      action: 'PRODUCT_CREATED',
      entity_type: 'PRODUCT',
      entity_id: product.id,
      metadata: { name: product.name, sku: product.sku },
      transaction: t
    });

    return await getProductById(businessId, product.id, t);
  });

  return result;
};

/**
 * Update an existing product
 * @param {number|string} businessId 
 * @param {number|string} productId 
 * @param {Object} payload 
 */
const updateProduct = async (businessId, productId, payload) => {
  const {
    name,
    category_id,
    sku,
    description,
    image,
    cost_price,
    selling_price,
    track_stock,
    is_active
  } = payload;

  const product = await Product.findOne({
    where: { id: productId, business_id: businessId }
  });

  if (!product) {
    throw new NotFoundError('Product not found in this business', 'PRODUCT_NOT_FOUND');
  }

  // Validate category if updating category
  if (category_id !== undefined && category_id !== null) {
    const category = await Category.findOne({
      where: { id: category_id, business_id: businessId }
    });
    if (!category) {
      throw new BadRequestError('Invalid category ID for this business', 'INVALID_CATEGORY');
    }
  }

  // Validate SKU uniqueness if updating SKU
  if (sku && sku !== product.sku) {
    const existingSku = await Product.findOne({
      where: {
        business_id: businessId,
        sku,
        id: { [Op.ne]: productId }
      }
    });
    if (existingSku) {
      throw new ConflictError(`Product with SKU "${sku}" already exists in this business`, 'SKU_ALREADY_EXISTS');
    }
  }

  await product.update({
    name: name !== undefined ? name : product.name,
    category_id: category_id !== undefined ? category_id : product.category_id,
    sku: sku !== undefined ? sku : product.sku,
    description: description !== undefined ? description : product.description,
    image: image !== undefined ? image : product.image,
    cost_price: cost_price !== undefined ? cost_price : product.cost_price,
    selling_price: selling_price !== undefined ? selling_price : product.selling_price,
    track_stock: track_stock !== undefined ? track_stock : product.track_stock,
    is_active: is_active !== undefined ? is_active : product.is_active
  });

  await recordAuditLog({
    business_id: businessId,
    action: 'PRODUCT_UPDATED',
    entity_type: 'PRODUCT',
    entity_id: productId,
    metadata: { updated_fields: Object.keys(payload) }
  });

  return await getProductById(businessId, productId);
};

/**
 * Deactivate / Delete a product
 * @param {number|string} businessId 
 * @param {number|string} productId 
 */
const deleteProduct = async (businessId, productId) => {
  const product = await Product.findOne({
    where: { id: productId, business_id: businessId }
  });

  if (!product) {
    throw new NotFoundError('Product not found in this business', 'PRODUCT_NOT_FOUND');
  }

  await product.update({ is_active: false });

  await recordAuditLog({
    business_id: businessId,
    action: 'PRODUCT_DELETED',
    entity_type: 'PRODUCT',
    entity_id: productId
  });

  return true;
};

/**
 * List all variants for a specific product
 * @param {number|string} businessId 
 * @param {number|string} productId 
 */
const listProductVariants = async (businessId, productId) => {
  const product = await Product.findOne({
    where: { id: productId, business_id: businessId }
  });

  if (!product) {
    throw new NotFoundError('Product not found in this business', 'PRODUCT_NOT_FOUND');
  }

  const variants = await ProductVariant.findAll({
    where: { product_id: productId },
    order: [['is_default', 'DESC'], ['name', 'ASC']]
  });

  return variants;
};

/**
 * Create a new variant for a product
 * @param {number|string} businessId 
 * @param {number|string} productId 
 * @param {Object} payload 
 */
const createProductVariant = async (businessId, productId, payload) => {
  const { name, sku, cost_price = 0.00, selling_price = 0.00, is_default = false } = payload;

  const product = await Product.findOne({
    where: { id: productId, business_id: businessId }
  });

  if (!product) {
    throw new NotFoundError('Product not found in this business', 'PRODUCT_NOT_FOUND');
  }

  // Check unique variant name per product
  const existingName = await ProductVariant.findOne({
    where: { product_id: productId, name }
  });

  if (existingName) {
    throw new ConflictError(`Variant "${name}" already exists for this product`, 'VARIANT_NAME_EXISTS');
  }

  const variant = await ProductVariant.create({
    product_id: productId,
    name,
    sku: sku || null,
    cost_price,
    selling_price,
    is_default,
    is_active: true
  });

  return variant;
};

/**
 * Update an existing variant of a product
 * @param {number|string} businessId 
 * @param {number|string} productId 
 * @param {number|string} variantId 
 * @param {Object} payload 
 */
const updateProductVariant = async (businessId, productId, variantId, payload) => {
  const { name, sku, cost_price, selling_price, is_default, is_active } = payload;

  const product = await Product.findOne({
    where: { id: productId, business_id: businessId }
  });

  if (!product) {
    throw new NotFoundError('Product not found in this business', 'PRODUCT_NOT_FOUND');
  }

  const variant = await ProductVariant.findOne({
    where: { id: variantId, product_id: productId }
  });

  if (!variant) {
    throw new NotFoundError('Variant not found for this product', 'VARIANT_NOT_FOUND');
  }

  // Check name uniqueness if changing
  if (name && name !== variant.name) {
    const existingName = await ProductVariant.findOne({
      where: {
        product_id: productId,
        name,
        id: { [Op.ne]: variantId }
      }
    });

    if (existingName) {
      throw new ConflictError(`Variant "${name}" already exists for this product`, 'VARIANT_NAME_EXISTS');
    }
  }

  await variant.update({
    name: name !== undefined ? name : variant.name,
    sku: sku !== undefined ? sku : variant.sku,
    cost_price: cost_price !== undefined ? cost_price : variant.cost_price,
    selling_price: selling_price !== undefined ? selling_price : variant.selling_price,
    is_default: is_default !== undefined ? is_default : variant.is_default,
    is_active: is_active !== undefined ? is_active : variant.is_active
  });

  return variant;
};

/**
 * Delete / Deactivate a variant
 * @param {number|string} businessId 
 * @param {number|string} productId 
 * @param {number|string} variantId 
 */
const deleteProductVariant = async (businessId, productId, variantId) => {
  const product = await Product.findOne({
    where: { id: productId, business_id: businessId }
  });

  if (!product) {
    throw new NotFoundError('Product not found in this business', 'PRODUCT_NOT_FOUND');
  }

  const variant = await ProductVariant.findOne({
    where: { id: variantId, product_id: productId }
  });

  if (!variant) {
    throw new NotFoundError('Variant not found for this product', 'VARIANT_NOT_FOUND');
  }

  await variant.destroy();
  return true;
};

/**
 * Attach a modifier to a product
 * @param {number|string} businessId 
 * @param {number|string} productId 
 * @param {number|string} modifierId 
 */
const attachModifierToProduct = async (businessId, productId, modifierId) => {
  // Verify product belongs to active business
  const product = await Product.findOne({
    where: { id: productId, business_id: businessId }
  });
  if (!product) {
    throw new NotFoundError('Product not found in this business', 'PRODUCT_NOT_FOUND');
  }

  // Verify modifier belongs to active business
  const modifier = await Modifier.findOne({
    where: { id: modifierId, business_id: businessId }
  });
  if (!modifier) {
    throw new NotFoundError('Modifier not found in this business', 'MODIFIER_NOT_FOUND');
  }

  // Check if already linked
  const existing = await ProductModifier.findOne({
    where: { product_id: productId, modifier_id: modifierId }
  });

  if (existing) {
    throw new ConflictError('Modifier is already attached to this product', 'MODIFIER_ALREADY_ATTACHED');
  }

  await ProductModifier.create({
    product_id: productId,
    modifier_id: modifierId
  });

  return await getProductById(businessId, productId);
};

/**
 * Detach a modifier from a product
 * @param {number|string} businessId 
 * @param {number|string} productId 
 * @param {number|string} modifierId 
 */
const detachModifierFromProduct = async (businessId, productId, modifierId) => {
  const product = await Product.findOne({
    where: { id: productId, business_id: businessId }
  });
  if (!product) {
    throw new NotFoundError('Product not found in this business', 'PRODUCT_NOT_FOUND');
  }

  const link = await ProductModifier.findOne({
    where: { product_id: productId, modifier_id: modifierId }
  });

  if (!link) {
    throw new NotFoundError('Modifier is not attached to this product', 'MODIFIER_NOT_ATTACHED');
  }

  await link.destroy();
  return true;
};

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  listProductVariants,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
  attachModifierToProduct,
  detachModifierFromProduct
};
