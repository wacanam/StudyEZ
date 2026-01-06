import { NextRequest } from "next/server";
import { requireAuth, isAuthSuccess } from "@/lib/middleware/auth-middleware";
import { ErrorHandler } from "@/lib/utils/error-handler";
import { ApiResponseBuilder } from "@/lib/utils/api-response";
import { getPrisma } from "@/lib/db";

// GET all chat sessions for the authenticated user
export async function GET(request: NextRequest) {
  try {
    // Authenticate user using middleware
    const authResult = await requireAuth();
    if (!isAuthSuccess(authResult)) {
      return authResult.error;
    }
    const { userId } = authResult;

    const db = getPrisma();

    const sessions = await db.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return ApiResponseBuilder.success({ sessions });
  } catch (error) {
    return ErrorHandler.handleRouteError(error, "Failed to retrieve chat sessions");
  }
}

// DELETE all chat sessions for the authenticated user
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user using middleware
    const authResult = await requireAuth();
    if (!isAuthSuccess(authResult)) {
      return authResult.error;
    }
    const { userId } = authResult;

    const db = getPrisma();

    // Delete all sessions for the user (messages will be cascade deleted)
    await db.chatSession.deleteMany({
      where: { userId },
    });

    return ApiResponseBuilder.success({
      message: "Chat history cleared successfully",
    });
  } catch (error) {
    return ErrorHandler.handleRouteError(error, "Failed to clear chat history");
  }
}
