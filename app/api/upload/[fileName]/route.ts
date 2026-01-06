import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthSuccess } from "@/lib/middleware/auth-middleware";
import { ErrorHandler } from "@/lib/utils/error-handler";
import { getPrisma } from "@/lib/db";

// DELETE /api/upload/[fileName] - Delete all chunks of a file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileName: string }> }
) {
  try {
    // Authenticate user using middleware
    const authResult = await requireAuth();
    if (!isAuthSuccess(authResult)) {
      return authResult.error;
    }
    const { userId } = authResult;

    const { fileName: encodedFileName } = await params;
    const fileName = decodeURIComponent(encodedFileName);
    const db = getPrisma();

    // Delete all document chunks with this fileName in metadata
    // Using raw query to handle JSONB operations
    const result = await db.$executeRaw`
      DELETE FROM documents
      WHERE user_id = ${userId}
      AND metadata->>'fileName' = ${fileName}
    `;

    if (result === 0) {
      return ErrorHandler.notFound("Document not found");
    }

    return NextResponse.json({
      message: `Successfully deleted ${result} chunk(s) of ${fileName}`,
      deletedChunks: result,
    });
  } catch (error) {
    return ErrorHandler.handleRouteError(error, "Failed to delete document");
  }
}

// PATCH /api/upload/[fileName] - Rename a file
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ fileName: string }> }
) {
  try {
    // Authenticate user using middleware
    const authResult = await requireAuth();
    if (!isAuthSuccess(authResult)) {
      return authResult.error;
    }
    const { userId } = authResult;

    const { fileName: encodedFileName } = await params;
    const oldFileName = decodeURIComponent(encodedFileName);
    const body = await request.json();
    const { newFileName } = body;

    if (!newFileName || !newFileName.trim()) {
      return ErrorHandler.badRequest("New file name is required");
    }

    const db = getPrisma();

    // Update all document chunks with this fileName in metadata
    // Using raw query to handle JSONB operations
    const result = await db.$executeRaw`
      UPDATE documents
      SET metadata = jsonb_set(metadata, '{fileName}', ${JSON.stringify(newFileName.trim())}::jsonb)
      WHERE user_id = ${userId}
      AND metadata->>'fileName' = ${oldFileName}
    `;

    if (result === 0) {
      return ErrorHandler.notFound("Document not found");
    }

    return NextResponse.json({
      message: `Successfully renamed ${oldFileName} to ${newFileName.trim()}`,
      updatedChunks: result,
    });
  } catch (error) {
    return ErrorHandler.handleRouteError(error, "Failed to rename document");
  }
}
