const { Modifier, ModifierOption, Product, sequelize } = require('../models');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/customErrors');
const { Op } = require('sequelize');

/**
 * List all modifiers in active business
 * @param {number|string} businessId 
 * @param {Object} query 
 */
const listModifiers = async (businessId, query = {}) => {
  const { search, is_active } = query;

  const where = { business_id: businessId };

  if (is_active !== undefined) {
    where.is_active = is_active === 'true' || is_active === true;
  }

  if (search) {
    where.name = { [Op.like]: `%${search}%` };
  }

  const modifiers = await Modifier.findAll({
    where,
    include: [
      {
        model: ModifierOption,
        as: 'options',
        attributes: ['id', 'name', 'price_adjustment', 'is_default', 'is_active']
      }
    ],
    order: [['name', 'ASC']]
  });

  return modifiers;
};

/**
 * Get modifier detail by ID
 * @param {number|string} businessId 
 * @param {number|string} modifierId 
 */
const getModifierById = async (businessId, modifierId) => {
  const modifier = await Modifier.findOne({
    where: {
      id: modifierId,
      business_id: businessId
    },
    include: [
      {
        model: ModifierOption,
        as: 'options',
        attributes: ['id', 'name', 'price_adjustment', 'is_default', 'is_active']
      }
    ]
  });

  if (!modifier) {
    throw new NotFoundError('Modifier not found in this business', 'MODIFIER_NOT_FOUND');
  }

  return modifier;
};

/**
 * Create a new modifier with its options
 * @param {number|string} businessId 
 * @param {Object} payload 
 */
const createModifier = async (businessId, payload) => {
  const { name, type = 'SINGLE', is_required = false, min_selection = 0, max_selection = 1, options } = payload;

  // 1. Check unique modifier name per business
  const existing = await Modifier.findOne({
    where: { business_id: businessId, name }
  });

  if (existing) {
    throw new ConflictError(`Modifier with name "${name}" already exists in this business`, 'MODIFIER_EXISTS');
  }

  // 2. Create modifier and options atomically
  const result = await sequelize.transaction(async (t) => {
    const modifier = await Modifier.create({
      business_id: businessId,
      name,
      type,
      is_required,
      min_selection,
      max_selection,
      is_active: true
    }, { transaction: t });

    if (options && Array.isArray(options) && options.length > 0) {
      const optionRecords = options.map(opt => ({
        modifier_id: modifier.id,
        name: opt.name,
        price_adjustment: opt.price_adjustment !== undefined ? opt.price_adjustment : (opt.price || 0.00),
        is_default: opt.is_default || false,
        is_active: true
      }));

      await ModifierOption.bulkCreate(optionRecords, { transaction: t });
    }

    return await Modifier.findByPk(modifier.id, {
      include: [{ model: ModifierOption, as: 'options' }],
      transaction: t
    });
  });

  return result;
};

/**
 * Update an existing modifier and its options
 * @param {number|string} businessId 
 * @param {number|string} modifierId 
 * @param {Object} payload 
 */
const updateModifier = async (businessId, modifierId, payload) => {
  const { name, type, is_required, min_selection, max_selection, is_active, options } = payload;

  const modifier = await Modifier.findOne({
    where: { id: modifierId, business_id: businessId }
  });

  if (!modifier) {
    throw new NotFoundError('Modifier not found in this business', 'MODIFIER_NOT_FOUND');
  }

  // Check unique name if changing
  if (name && name !== modifier.name) {
    const existing = await Modifier.findOne({
      where: {
        business_id: businessId,
        name,
        id: { [Op.ne]: modifierId }
      }
    });

    if (existing) {
      throw new ConflictError(`Modifier with name "${name}" already exists in this business`, 'MODIFIER_EXISTS');
    }
  }

  const result = await sequelize.transaction(async (t) => {
    await modifier.update({
      name: name !== undefined ? name : modifier.name,
      type: type !== undefined ? type : modifier.type,
      is_required: is_required !== undefined ? is_required : modifier.is_required,
      min_selection: min_selection !== undefined ? min_selection : modifier.min_selection,
      max_selection: max_selection !== undefined ? max_selection : modifier.max_selection,
      is_active: is_active !== undefined ? is_active : modifier.is_active
    }, { transaction: t });

    // If options array is provided, sync options
    if (options && Array.isArray(options)) {
      // Re-create options
      await ModifierOption.destroy({ where: { modifier_id: modifierId }, transaction: t });

      const optionRecords = options.map(opt => ({
        modifier_id: modifierId,
        name: opt.name,
        price_adjustment: opt.price_adjustment !== undefined ? opt.price_adjustment : (opt.price || 0.00),
        is_default: opt.is_default || false,
        is_active: opt.is_active !== undefined ? opt.is_active : true
      }));

      await ModifierOption.bulkCreate(optionRecords, { transaction: t });
    }

    return await Modifier.findByPk(modifierId, {
      include: [{ model: ModifierOption, as: 'options' }],
      transaction: t
    });
  });

  return result;
};

/**
 * Deactivate / Delete a modifier
 * @param {number|string} businessId 
 * @param {number|string} modifierId 
 */
const deleteModifier = async (businessId, modifierId) => {
  const modifier = await Modifier.findOne({
    where: { id: modifierId, business_id: businessId }
  });

  if (!modifier) {
    throw new NotFoundError('Modifier not found in this business', 'MODIFIER_NOT_FOUND');
  }

  await modifier.update({ is_active: false });
  return true;
};

module.exports = {
  listModifiers,
  getModifierById,
  createModifier,
  updateModifier,
  deleteModifier
};
