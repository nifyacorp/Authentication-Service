/**
 * Standard API response format
 */
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Create a success response
 */
export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    status: 'success',
    data
  };
}

/**
 * Create an error response
 */
export function createErrorResponse(code: string, message: string, details?: any): ApiResponse {
  return {
    status: 'error',
    error: {
      code,
      message,
      details
    }
  };
}

/**
 * Standard pagination response 
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): ApiResponse<PaginatedResponse<T>> {
  const totalPages = Math.ceil(total / limit) || 1;
  
  return createSuccessResponse({
    items,
    total,
    page,
    limit,
    totalPages
  });
}