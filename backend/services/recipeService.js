const { Recipe, RecipeItem, Product, ProductVariant, Ingredient, Unit, sequelize } = require('../models');
const { Op } = require('sequelize');
const { NotFoundError, ConflictError, ValidationError } = require('../utils/errors');

/**
 * Common include options for Recipe queries
 */
const recipeIncludes = [
  {
    model: Product,
    as: 'product',
    attributes: ['id', 'name', 'sku', 'selling_price']
  },
  {
    model: ProductVariant,
    as: 'variant',
    attributes: ['id', 'name', 'sku', 'selling_price']
  },
  {
    model: RecipeItem,
    as: 'items',
    attributes: ['id', 'ingredient_id', 'quantity'],
    include: [
      {
        model: Ingredient,
        as: 'ingredient',
        attributes: ['id', 'name', 'sku', 'cost_per_unit'],
        include: [
          {
            model: Unit,
            as: 'unit',
            attributes: ['id', 'name', 'symbol']
          }
        ]
      }
    ]
  }
];

/**
 * List recipes for a business
 */
const listRecipes = async (businessId, query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const where = { business_id: businessId };

  if (query.product_id) {
    where.product_id = query.product_id;
  }

  if (query.product_variant_id) {
    where.product_variant_id = query.product_variant_id;
  }

  if (query.is_active !== undefined) {
    where.is_active = query.is_active === 'true' || query.is_active === true;
  }

  const { rows: recipes, count: totalItems } = await Recipe.findAndCountAll({
    where,
    include: recipeIncludes,
    order: [['created_at', 'DESC']],
    limit,
    offset
  });

  return { recipes, totalItems, page, limit };
};

/**
 * Get single recipe by ID
 */
const getRecipeById = async (businessId, recipeId, transaction = null) => {
  const recipe = await Recipe.findOne({
    where: {
      id: recipeId,
      business_id: businessId
    },
    include: recipeIncludes,
    transaction
  });

  if (!recipe) {
    throw new NotFoundError('Recipe not found');
  }

  return recipe;
};

/**
 * Get recipe for a specific product and optional variant
 */
const getRecipeByProduct = async (businessId, productId, variantId = null) => {
  const where = {
    business_id: businessId,
    product_id: productId,
    is_active: true
  };

  if (variantId) {
    where.product_variant_id = variantId;
  } else {
    where.product_variant_id = null;
  }

  let recipe = await Recipe.findOne({
    where,
    include: recipeIncludes
  });

  // If specific variant recipe not found, fallback to base product recipe (null variant)
  if (!recipe && variantId) {
    recipe = await Recipe.findOne({
      where: {
        business_id: businessId,
        product_id: productId,
        product_variant_id: null,
        is_active: true
      },
      include: recipeIncludes
    });
  }

  if (!recipe) {
    throw new NotFoundError('No recipe found for this product/variant');
  }

  return recipe;
};

/**
 * Create a new recipe with ingredient composition
 */
const createRecipe = async (businessId, data) => {
  const { product_id, product_variant_id, instructions, items, is_active } = data;

  // 1. Verify product belongs to business
  const product = await Product.findOne({
    where: { id: product_id, business_id: businessId }
  });
  if (!product) {
    throw new NotFoundError('Product not found in this business');
  }

  // 2. Verify variant belongs to product if provided
  if (product_variant_id) {
    const variant = await ProductVariant.findOne({
      where: { id: product_variant_id, product_id }
    });
    if (!variant) {
      throw new NotFoundError('Product variant not found for this product');
    }
  }

  // 3. Check for existing recipe
  const existingRecipe = await Recipe.findOne({
    where: {
      business_id: businessId,
      product_id,
      product_variant_id: product_variant_id || null
    }
  });
  if (existingRecipe) {
    throw new ConflictError(
      `A recipe already exists for this product ${product_variant_id ? 'and variant' : ''}`
    );
  }

  // 4. Validate recipe items and check duplicate ingredients
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ValidationError('Recipe must contain at least one ingredient item');
  }

  const ingredientIds = items.map(item => item.ingredient_id);
  const uniqueIngredientIds = new Set(ingredientIds);
  if (uniqueIngredientIds.size !== ingredientIds.length) {
    throw new ValidationError('Duplicate ingredients found in recipe item list');
  }

  // Verify all ingredients exist in this business
  const foundIngredients = await Ingredient.findAll({
    where: {
      id: { [Op.in]: ingredientIds },
      business_id: businessId,
      is_active: true
    }
  });

  if (foundIngredients.length !== uniqueIngredientIds.size) {
    throw new ValidationError('One or more ingredients are invalid or inactive for this business');
  }

  // 5. Execute transaction to create recipe and items
  return await sequelize.transaction(async (t) => {
    const recipe = await Recipe.create({
      business_id: businessId,
      product_id,
      product_variant_id: product_variant_id || null,
      instructions: instructions || null,
      is_active: is_active !== undefined ? is_active : true
    }, { transaction: t });

    const recipeItemsData = items.map(item => ({
      recipe_id: recipe.id,
      ingredient_id: item.ingredient_id,
      quantity: parseFloat(Number(item.quantity).toFixed(4))
    }));

    await RecipeItem.bulkCreate(recipeItemsData, { transaction: t });

    return await getRecipeById(businessId, recipe.id, t);
  });
};

/**
 * Update an existing recipe and its items
 */
const updateRecipe = async (businessId, recipeId, data) => {
  const recipe = await getRecipeById(businessId, recipeId);
  const { product_id, product_variant_id, instructions, is_active, items } = data;

  // 1. Verify product if updated
  const targetProductId = product_id !== undefined ? product_id : recipe.product_id;
  const targetVariantId = product_variant_id !== undefined ? product_variant_id : recipe.product_variant_id;

  if (product_id && product_id !== recipe.product_id) {
    const product = await Product.findOne({
      where: { id: product_id, business_id: businessId }
    });
    if (!product) {
      throw new NotFoundError('Product not found in this business');
    }
  }

  if (targetVariantId) {
    const variant = await ProductVariant.findOne({
      where: { id: targetVariantId, product_id: targetProductId }
    });
    if (!variant) {
      throw new NotFoundError('Product variant not found for this product');
    }
  }

  // 2. Check conflict if product/variant changed
  if (targetProductId !== recipe.product_id || targetVariantId !== recipe.product_variant_id) {
    const conflict = await Recipe.findOne({
      where: {
        business_id: businessId,
        product_id: targetProductId,
        product_variant_id: targetVariantId || null,
        id: { [Op.ne]: recipeId }
      }
    });

    if (conflict) {
      throw new ConflictError('Another recipe already exists for this product and variant combination');
    }
  }

  // 3. If items provided, validate
  if (items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationError('Recipe must contain at least one ingredient item');
    }

    const ingredientIds = items.map(item => item.ingredient_id);
    const uniqueIngredientIds = new Set(ingredientIds);
    if (uniqueIngredientIds.size !== ingredientIds.length) {
      throw new ValidationError('Duplicate ingredients found in recipe item list');
    }

    const foundIngredients = await Ingredient.findAll({
      where: {
        id: { [Op.in]: ingredientIds },
        business_id: businessId,
        is_active: true
      }
    });

    if (foundIngredients.length !== uniqueIngredientIds.size) {
      throw new ValidationError('One or more ingredients are invalid or inactive for this business');
    }
  }

  // 4. Update in transaction
  return await sequelize.transaction(async (t) => {
    await recipe.update({
      product_id: targetProductId,
      product_variant_id: targetVariantId || null,
      instructions: instructions !== undefined ? instructions : recipe.instructions,
      is_active: is_active !== undefined ? is_active : recipe.is_active
    }, { transaction: t });

    if (items) {
      await RecipeItem.destroy({
        where: { recipe_id: recipeId },
        transaction: t
      });

      const recipeItemsData = items.map(item => ({
        recipe_id: recipe.id,
        ingredient_id: item.ingredient_id,
        quantity: parseFloat(Number(item.quantity).toFixed(4))
      }));

      await RecipeItem.bulkCreate(recipeItemsData, { transaction: t });
    }

    return await getRecipeById(businessId, recipe.id, t);
  });
};

/**
 * Delete a recipe
 */
const deleteRecipe = async (businessId, recipeId) => {
  const recipe = await getRecipeById(businessId, recipeId);
  await recipe.destroy();
  return true;
};

module.exports = {
  listRecipes,
  getRecipeById,
  getRecipeByProduct,
  createRecipe,
  updateRecipe,
  deleteRecipe
};
