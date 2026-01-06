import { NextResponse } from "next/server";

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
  ): NextResponse {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`${context}:`, error);
    
    return NextResponse.json(
      { error: `${context}: ${errorMessage}` },
      { status }
    );
  }

  /**
   * Handle async route errors with consistent formatting
   */
  static async handleRouteError(
    error: unknown,
    context: string
  ): Promise<NextResponse> {
    return this.createErrorResponse(error, context, 500);
  }

  /**
   * Create a bad request error response
   */
  static badRequest(message: string): NextResponse {
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }

  /**
   * Create a not found error response
   */
  static notFound(message: string): NextResponse {
    return NextResponse.json(
      { error: message },
      { status: 404 }
    );
  }
}
