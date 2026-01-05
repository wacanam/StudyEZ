import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { searchSimilarDocuments, initializeDatabase } from "@/lib/db";
import { generateEmbedding, generateResponse } from "@/lib/rag";

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

    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // Initialize database if needed
    await initializeDatabase();

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Search for similar documents (filtered by userId)
    const similarDocs = await searchSimilarDocuments(queryEmbedding, userId, 5);

    if (similarDocs.length === 0) {
      return NextResponse.json({
        answer: "No relevant study materials found. Please upload some documents first.",
        sources: [],
      });
    }

    // Extract context from similar documents
    const context = similarDocs.map((doc) => doc.content);

    // Generate response using LLM
    const answer = await generateResponse(query, context);

    // Return response with sources
    return NextResponse.json({
      answer,
      sources: similarDocs.map((doc) => ({
        text: doc.content.substring(0, 200) + (doc.content.length > 200 ? "..." : ""),
        score: doc.score,
        metadata: doc.metadata,
      })),
    });
  } catch (error) {
    console.error("Query error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to process query: ${errorMessage}` },
      { status: 500 }
    );
  }
}
