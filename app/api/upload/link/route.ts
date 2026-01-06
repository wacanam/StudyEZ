import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthSuccess } from "@/lib/middleware/auth-middleware";
import { ErrorHandler } from "@/lib/utils/error-handler";
import { initializeDatabase, storeDocument } from "@/lib/db";
import { generateEmbedding, chunkText } from "@/lib/rag";
import { extractContentFromUrl } from "@/lib/content-extractors";

export async function POST(request: NextRequest) {
  try {
    // Authenticate user using middleware
    const authResult = await requireAuth();
    if (!isAuthSuccess(authResult)) {
      return authResult.error;
    }
    const { userId } = authResult;

    // Initialize database tables if needed
    await initializeDatabase();

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return ErrorHandler.badRequest("URL is required");
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return ErrorHandler.badRequest("Invalid URL format");
    }

    console.log(`Processing URL: ${url}`);

    // Extract content from URL (YouTube or webpage)
    const { content, type } = await extractContentFromUrl(url);

    if (!content.trim()) {
      return ErrorHandler.badRequest("No content extracted from URL");
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
    return ErrorHandler.handleRouteError(error, "Failed to process URL");
  }
}
