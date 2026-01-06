import { ApiResponseBuilder } from "./api-response";

/**
 * Standardized error response utility
 * Single Responsibility: Handle error formatting and logging
 * DRY: Centralize error handling across all routes
 */
export class ErrorHandler {
  /**
   * Safely extract error message from any error type
   */
  private static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (typeof error === 'object' && error !== null) {
      try {
        return JSON.stringify(error);
      } catch {
        return 'Unknown object error';
      }
    }
    return String(error) || 'Unknown error';
  }

  /**
   * Create a standardized error response
   */
  static createErrorResponse(
    error: unknown,
    context: string,
    status: number = 500
  ) {
    const errorMessage = this.getErrorMessage(error);

    // Log error details (without sensitive information)
    console.error(`[${context}] Error: ${errorMessage}`);

    return ApiResponseBuilder.error(`${context}: ${errorMessage}`, status);
  }

  /**
   * Handle route errors with consistent formatting
   */
  static handleRouteError(
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
