import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPrisma } from "@/lib/db";

// DELETE /api/upload/[fileName] - Delete all chunks of a file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileName: string }> }
) {
  try {
    // Get the authenticated user's ID
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

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
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: `Successfully deleted ${result} chunk(s) of ${fileName}`,
      deletedChunks: result,
    });
  } catch (error) {
    console.error("Delete error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to delete document: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// PATCH /api/upload/[fileName] - Rename a file
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ fileName: string }> }
) {
  try {
    // Get the authenticated user's ID
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { fileName: encodedFileName } = await params;
    const oldFileName = decodeURIComponent(encodedFileName);
    const body = await request.json();
    const { newFileName } = body;

    if (!newFileName || !newFileName.trim()) {
      return NextResponse.json(
        { error: "New file name is required" },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: `Successfully renamed ${oldFileName} to ${newFileName.trim()}`,
      updatedChunks: result,
    });
  } catch (error) {
    console.error("Rename error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to rename document: ${errorMessage}` },
      { status: 500 }
    );
  }
}
