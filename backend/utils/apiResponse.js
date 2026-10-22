/**
 * Standardized API Response Utilities
 */

/**
 * Success Response (200 OK)
 */
const successResponse = (res, message = 'Success', data = null, meta = null) => {
  const payload = {
    success: true,
    message,
    data
  };

  if (meta) {
    payload.meta = meta;
  }

  return res.status(200).json(payload);
};

/**
 * Created Response (201 Created)
 */
const createdResponse = (res, message = 'Resource created successfully', data = null) => {
  return res.status(201).json({
    success: true,
    message,
    data
  });
};

/**
 * Paginated Response (200 OK with Pagination Meta)
 */
const paginatedResponse = (res, message = 'Data retrieved successfully', data = [], pagination = {}) => {
  const { page = 1, limit = 20, totalItems = 0 } = pagination;
  const totalPages = Math.ceil(totalItems / limit) || 1;

  return res.status(200).json({
    success: true,
    message,
    data,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total_items: Number(totalItems),
      total_pages: totalPages,
      has_next_page: Number(page) < totalPages,
      has_prev_page: Number(page) > 1
    }
  });
};

/**
 * Error Response (Custom Status Code)
 */
const errorResponse = (res, message = 'An error occurred', statusCode = 500, errorCode = 'SERVER_ERROR', errors = null) => {
  const payload = {
    success: false,
    message,
    error_code: errorCode
  };

  if (errors) {
    payload.errors = errors;
  }

  return res.status(statusCode).json(payload);
};

module.exports = {
  successResponse,
  createdResponse,
  paginatedResponse,
  errorResponse
};
