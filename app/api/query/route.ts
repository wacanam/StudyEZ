import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { hybridSearch, initializeDatabase, getPrisma } from "@/lib/db";
import { generateEmbedding, generateResponse, rerankDocuments } from "@/lib/rag";

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
    const { query, sessionId } = body;

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

    // Hybrid search: retrieve top 10 candidates using vector + FTS
    const candidateDocs = await hybridSearch(query, queryEmbedding, userId, 10);

    if (candidateDocs.length === 0) {
      return NextResponse.json({
        answer: "No relevant study materials found. Please upload some documents first.",
        sources: [],
        confidenceScore: 0,
      });
    }

    // Re-rank: use Gemini to select top 3 most relevant documents
    const reranked = await rerankDocuments(
      query, 
      candidateDocs.map(doc => ({ content: doc.content, score: doc.score })),
      3
    );

    // Get the re-ranked documents in order, with fallback to original candidates
    let topDocs = reranked.map(r => ({
      ...candidateDocs[r.index],
      relevanceScore: r.relevanceScore,
    }));

    // Safety check: if re-ranking failed to return results, fall back to original candidates
    if (topDocs.length === 0) {
      topDocs = candidateDocs.slice(0, 3).map(doc => ({
        ...doc,
        relevanceScore: Math.min(doc.score * 100, 100),
      }));
    }

    // Extract context from top documents
    const context = topDocs.map((doc) => doc.content);

    // Generate response using LLM
    const answer = await generateResponse(query, context);

    // Calculate confidence score based on re-ranking scores (average of top 3)
    const avgRelevance = topDocs.length > 0 
      ? topDocs.reduce((sum, doc) => sum + doc.relevanceScore, 0) / topDocs.length 
      : 0;
    const confidenceScore = Math.round(avgRelevance);

    // Prepare sources for response
    const sources = topDocs.map((doc) => ({
      text: doc.content.substring(0, 200) + (doc.content.length > 200 ? "..." : ""),
      score: doc.score,
      relevanceScore: doc.relevanceScore,
      metadata: doc.metadata,
      isVisual: doc.metadata?.chunkType === "visual",
    }));

    // Save to database
    const db = getPrisma();
    let currentSessionId = sessionId;

    // Create or retrieve session
    if (!currentSessionId) {
      // Create a new session with first question as title (truncated)
      const title = query.substring(0, 50) + (query.length > 50 ? "..." : "");
      const session = await db.chatSession.create({
        data: {
          userId,
          title,
        },
      });
      currentSessionId = session.id;
    }

    // Save user's question
    await db.chatMessage.create({
      data: {
        sessionId: currentSessionId,
        role: "user",
        content: query,
        sources: [],
      },
    });

    // Save assistant's answer
    await db.chatMessage.create({
      data: {
        sessionId: currentSessionId,
        role: "assistant",
        content: answer,
        sources: sources as any,
      },
    });

    // Return response with sources, sessionId, and confidence score
    return NextResponse.json({
      answer,
      sources,
      sessionId: currentSessionId,
      confidenceScore,
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
