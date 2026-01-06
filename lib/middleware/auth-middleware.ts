import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

/**
 * Authentication result interface
 */
export interface AuthResult {
  userId: string;
  success: true;
}

export interface AuthError {
  error: NextResponse;
  success: false;
}

export type AuthCheckResult = AuthResult | AuthError;

/**
 * Middleware to check user authentication
 * Single Responsibility: Handle authentication verification
 * DRY: Centralize auth logic used across all routes
 */
export async function requireAuth(): Promise<AuthCheckResult> {
  const { userId } = await auth();
  
  if (!userId) {
    return {
      success: false,
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  return {
    success: true,
    userId,
  };
}

/**
 * Type guard to check if auth result is successful
 */
export function isAuthSuccess(result: AuthCheckResult): result is AuthResult {
  return result.success === true;
}
