import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initializeDatabase, storeDocument } from "@/lib/db";
import { generateEmbedding, chunkText } from "@/lib/rag";
import { extractContentFromUrl } from "@/lib/content-extractors";

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user's ID
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Initialize database tables if needed
    await initializeDatabase();

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    console.log(`Processing URL: ${url}`);

    // Extract content from URL (YouTube or webpage)
    const { content, type } = await extractContentFromUrl(url);

    if (!content.trim()) {
      return NextResponse.json(
        { error: "No content extracted from URL" },
        { status: 400 }
      );
    }

    console.log(`Extracted ${content.length} characters from ${type}: ${url}`);

    // Chunk the content
    const chunks = await chunkText(content);

    // Generate embeddings and store each chunk
    let totalChunks = 0;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await generateEmbedding(chunk);
      
      await storeDocument(chunk, embedding, userId, {
        sourceUrl: url,
        sourceType: type,
        chunkIndex: i,
        totalChunks: chunks.length,
      });
      
      totalChunks++;
    }

    return NextResponse.json({
      message: `Successfully processed ${type}`,
      documentsCount: totalChunks,
      url,
      type,
    });
  } catch (error) {
    console.error("Link upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to process URL: ${errorMessage}` },
      { status: 500 }
    );
  }
}
