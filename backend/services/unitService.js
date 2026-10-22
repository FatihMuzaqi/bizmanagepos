const { Unit, Ingredient, sequelize } = require('../models');
const { Op } = require('sequelize');
const { NotFoundError, ConflictError, ValidationError } = require('../utils/errors');

/**
 * List units for a business
 */
const listUnits = async (businessId, query = {}) => {
  const { search, is_active } = query;
  const where = { business_id: businessId };

  if (is_active !== undefined) {
    where.is_active = is_active === 'true' || is_active === true;
  }

  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { symbol: { [Op.like]: `%${search}%` } }
    ];
  }

  const units = await Unit.findAll({
    where,
    order: [['name', 'ASC']]
  });

  return units;
};

/**
 * Get unit detail by ID
 */
const getUnitById = async (businessId, unitId) => {
  const unit = await Unit.findOne({
    where: {
      id: unitId,
      business_id: businessId
    }
  });

  if (!unit) {
    throw new NotFoundError('Unit not found');
  }

  return unit;
};

/**
 * Create a new measurement unit
 */
const createUnit = async (businessId, data) => {
  const existingName = await Unit.findOne({
    where: {
      business_id: businessId,
      name: data.name
    }
  });

  if (existingName) {
    throw new ConflictError(`Unit with name '${data.name}' already exists`);
  }

  const unit = await Unit.create({
    business_id: businessId,
    name: data.name.trim(),
    symbol: data.symbol.trim(),
    is_active: data.is_active !== undefined ? data.is_active : true
  });

  return unit;
};

/**
 * Update an existing unit
 */
const updateUnit = async (businessId, unitId, data) => {
  const unit = await getUnitById(businessId, unitId);

  if (data.name && data.name.trim().toLowerCase() !== unit.name.toLowerCase()) {
    const existingName = await Unit.findOne({
      where: {
        business_id: businessId,
        name: data.name.trim(),
        id: { [Op.ne]: unitId }
      }
    });

    if (existingName) {
      throw new ConflictError(`Unit with name '${data.name}' already exists`);
    }
  }

  await unit.update({
    name: data.name !== undefined ? data.name.trim() : unit.name,
    symbol: data.symbol !== undefined ? data.symbol.trim() : unit.symbol,
    is_active: data.is_active !== undefined ? data.is_active : unit.is_active
  });

  return unit;
};

/**
 * Delete a unit (hard delete if unused, otherwise reject)
 */
const deleteUnit = async (businessId, unitId) => {
  const unit = await getUnitById(businessId, unitId);

  const ingredientCount = await Ingredient.count({
    where: {
      unit_id: unitId,
      business_id: businessId
    }
  });

  if (ingredientCount > 0) {
    throw new ValidationError('Cannot delete unit because it is currently used by raw ingredients');
  }

  await unit.destroy();
  return true;
};

module.exports = {
  listUnits,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit
};
