import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthSuccess } from "@/lib/middleware/auth-middleware";
import { ErrorHandler } from "@/lib/utils/error-handler";
import { getPrisma } from "@/lib/db";

// GET messages for a specific chat session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user using middleware
    const authResult = await requireAuth();
    if (!isAuthSuccess(authResult)) {
      return authResult.error;
    }
    const { userId } = authResult;

    const { id } = await params;
    const sessionId = parseInt(id, 10);

    if (isNaN(sessionId)) {
      return ErrorHandler.badRequest("Invalid session ID");
    }

    const db = getPrisma();

    // Verify that the session belongs to the user
    const session = await db.chatSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!session) {
      return ErrorHandler.notFound("Session not found");
    }

    return NextResponse.json({ session });
  } catch (error) {
    return ErrorHandler.handleRouteError(error, "Failed to retrieve chat messages");
  }
}
