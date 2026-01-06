import { ApiResponseBuilder } from "./api-response";

/**
 * Standardized error response utility
 * Single Responsibility: Handle error formatting and logging
 * DRY: Centralize error handling across all routes
 */
export class ErrorHandler {
  /**
   * Create a standardized error response
   */
  static createErrorResponse(
    error: unknown,
    context: string,
    status: number = 500
  ) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Log error details (without sensitive information)
    console.error(`[${context}] Error:`, errorMessage);
    
    return ApiResponseBuilder.error(`${context}: ${errorMessage}`, status);
  }

  /**
   * Handle async route errors with consistent formatting
   */
  static async handleRouteError(
    error: unknown,
    context: string
  ) {
    return this.createErrorResponse(error, context, 500);
  }

  /**
   * Create a bad request error response
   */
  static badRequest(message: string) {
    return ApiResponseBuilder.badRequest(message);
  }

  /**
   * Create an unauthorized error response
   */
  static unauthorized(message?: string) {
    return ApiResponseBuilder.unauthorized(message);
  }

  /**
   * Create a not found error response
   */
  static notFound(message: string) {
    return ApiResponseBuilder.notFound(message);
  }

  /**
   * Create an internal server error response
   */
  static internalError(message: string) {
    return ApiResponseBuilder.internalError(message);
  }
}
