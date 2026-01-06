import { NextResponse } from "next/server";

/**
 * Standard API response structure
 * Ensures consistency across all API endpoints
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  meta?: {
    timestamp: string;
    [key: string]: unknown;
  };
}

/**
 * Standardized API response builder
 * Single Responsibility: Create consistent API responses
 * DRY: Eliminates duplicate response formatting across routes
 */
export class ApiResponseBuilder {
  /**
   * Create a success response
   */
  static success<T>(data: T, meta?: Record<string, unknown>): NextResponse<ApiResponse<T>> {
    return NextResponse.json({
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    });
  }

  /**
   * Create an error response
   */
  static error(
    message: string,
    status: number = 500,
    code?: string
  ): NextResponse<ApiResponse<never>> {
    return NextResponse.json(
      {
        success: false,
        error: {
          message,
          code,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status }
    );
  }

  /**
   * Create a bad request error (400)
   */
  static badRequest(message: string): NextResponse<ApiResponse<never>> {
    return this.error(message, 400, "BAD_REQUEST");
  }

  /**
   * Create an unauthorized error (401)
   */
  static unauthorized(message: string = "Unauthorized"): NextResponse<ApiResponse<never>> {
    return this.error(message, 401, "UNAUTHORIZED");
  }

  /**
   * Create a not found error (404)
   */
  static notFound(message: string): NextResponse<ApiResponse<never>> {
    return this.error(message, 404, "NOT_FOUND");
  }

  /**
   * Create an internal server error (500)
   */
  static internalError(message: string): NextResponse<ApiResponse<never>> {
    return this.error(message, 500, "INTERNAL_ERROR");
  }

  /**
   * Create a paginated response
   */
  static paginated<T>(
    data: T[],
    pagination: {
      page: number;
      perPage: number;
      total: number;
      totalPages: number;
    }
  ): NextResponse<ApiResponse<T[]>> {
    return NextResponse.json({
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        pagination,
      },
    });
  }
}
