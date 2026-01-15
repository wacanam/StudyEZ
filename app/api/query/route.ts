import { NextRequest } from "next/server";
import { requireAuth, isAuthSuccess } from "@/lib/middleware/auth-middleware";
import { ErrorHandler } from "@/lib/utils/error-handler";
import { ApiResponseBuilder } from "@/lib/utils/api-response";
import { sourcesToJson, SourceDocument } from "@/lib/types/api-types";
import { hybridSearch, initializeDatabase, getPrisma, validateDocumentOwnership } from "@/lib/db";
import { generateEmbedding, generateResponse, rerankDocuments } from "@/lib/rag";

export async function POST(request: NextRequest) {
  try {
    // Authenticate user using middleware
    const authResult = await requireAuth();
    if (!isAuthSuccess(authResult)) {
      return authResult.error;
    }
    const { userId } = authResult;

    const body = await request.json();
    const { query, sessionId, selectedDocumentIds } = body;

    if (!query || typeof query !== "string") {
      return ErrorHandler.badRequest("Query is required");
    }

    // Validate selectedDocumentIds if provided
    let validatedDocumentIds: number[] | undefined;
    if (selectedDocumentIds !== undefined) {
      // Ensure it's an array
      if (!Array.isArray(selectedDocumentIds)) {
        return ErrorHandler.badRequest("selectedDocumentIds must be an array");
      }

      // Ensure all elements are numbers
      const allNumbers = selectedDocumentIds.every((id) => typeof id === "number" && Number.isInteger(id));
      if (!allNumbers) {
        return ErrorHandler.badRequest("All selectedDocumentIds must be integers");
      }

      // Validate ownership - ensure all provided IDs belong to the user
      if (selectedDocumentIds.length > 0) {
        validatedDocumentIds = await validateDocumentOwnership(selectedDocumentIds, userId);
        
        // If no valid documents found, return error
        if (validatedDocumentIds.length === 0) {
          return ErrorHandler.badRequest("No valid documents found for the provided IDs");
        }

        // If some IDs were invalid, we still proceed with valid ones
        // but could optionally warn the user
        if (validatedDocumentIds.length < selectedDocumentIds.length) {
          console.warn(
            `Some document IDs were invalid or don't belong to user ${userId}. ` +
            `Requested: ${selectedDocumentIds.length}, Valid: ${validatedDocumentIds.length}`
          );
        }
      }
    }

    // Initialize database if needed
    await initializeDatabase();

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Hybrid search: retrieve top 10 candidates using vector + FTS
    // If validatedDocumentIds is provided, restrict search to those documents
    const candidateDocs = await hybridSearch(
      query, 
      queryEmbedding, 
      userId, 
      10,
      validatedDocumentIds
    );

    if (candidateDocs.length === 0) {
      return ApiResponseBuilder.success({
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

    // Prepare sources for response with proper typing
    const sources: SourceDocument[] = topDocs.map((doc) => ({
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

    // Save assistant's answer with properly typed sources
    await db.chatMessage.create({
      data: {
        sessionId: currentSessionId,
        role: "assistant",
        content: answer,
        sources: sourcesToJson(sources),
      },
    });

    // Return response with sources, sessionId, and confidence score
    return ApiResponseBuilder.success({
      answer,
      sources,
      sessionId: currentSessionId,
      confidenceScore,
    });
  } catch (error) {
    return ErrorHandler.handleRouteError(error, "Failed to process query");
  }
}
