import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPrisma } from "@/lib/db";

// GET all chat sessions for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

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

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Get chat sessions error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to retrieve chat sessions: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// DELETE all chat sessions for the authenticated user
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const db = getPrisma();

    // Delete all sessions for the user (messages will be cascade deleted)
    await db.chatSession.deleteMany({
      where: { userId },
    });

    return NextResponse.json({ message: "Chat history cleared successfully" });
  } catch (error) {
    console.error("Delete chat sessions error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to clear chat history: ${errorMessage}` },
      { status: 500 }
    );
  }
}
