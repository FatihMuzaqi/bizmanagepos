const productService = require('../services/productService');
const { successResponse, createdResponse, paginatedResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * List products with pagination, search, and category filtering
 */
const getProducts = asyncHandler(async (req, res) => {
  const { products, totalItems, page, limit } = await productService.listProducts(req.business.id, req.query);
  return paginatedResponse(res, 'Products retrieved successfully', products, { page, limit, totalItems });
});

/**
 * Get product detail by ID
 */
const getProductDetail = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.business.id, req.params.id);
  return successResponse(res, 'Product retrieved successfully', product);
});

/**
 * Create a new product
 */
const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.business.id, req.body);
  return createdResponse(res, 'Product created successfully', product);
});

/**
 * Update an existing product
 */
const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.business.id, req.params.id, req.body);
  return successResponse(res, 'Product updated successfully', product);
});

/**
 * Delete / Deactivate a product
 */
const deleteProduct = asyncHandler(async (req, res) => {
  await productService.deleteProduct(req.business.id, req.params.id);
  return successResponse(res, 'Product deactivated successfully');
});

// Product Variant Handlers
const getVariants = asyncHandler(async (req, res) => {
  const variants = await productService.listProductVariants(req.business.id, req.params.productId);
  return successResponse(res, 'Product variants retrieved successfully', variants);
});

const createVariant = asyncHandler(async (req, res) => {
  const variant = await productService.createProductVariant(req.business.id, req.params.productId, req.body);
  return createdResponse(res, 'Product variant created successfully', variant);
});

const updateVariant = asyncHandler(async (req, res) => {
  const variant = await productService.updateProductVariant(
    req.business.id,
    req.params.productId,
    req.params.variantId,
    req.body
  );
  return successResponse(res, 'Product variant updated successfully', variant);
});

const deleteVariant = asyncHandler(async (req, res) => {
  await productService.deleteProductVariant(
    req.business.id,
    req.params.productId,
    req.params.variantId
  );
  return successResponse(res, 'Product variant deleted successfully');
});

// Product Modifier Handlers
const attachModifier = asyncHandler(async (req, res) => {
  const product = await productService.attachModifierToProduct(
    req.business.id,
    req.params.productId,
    req.body.modifier_id
  );
  return successResponse(res, 'Modifier attached to product successfully', product);
});

const detachModifier = asyncHandler(async (req, res) => {
  await productService.detachModifierFromProduct(
    req.business.id,
    req.params.productId,
    req.params.modifierId
  );
  return successResponse(res, 'Modifier detached from product successfully');
});

module.exports = {
  getProducts,
  getProductDetail,
  createProduct,
  updateProduct,
  deleteProduct,
  getVariants,
  createVariant,
  updateVariant,
  deleteVariant,
  attachModifier,
  detachModifier
};
