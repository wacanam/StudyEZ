import { NextRequest } from "next/server";
import { requireAuth, isAuthSuccess } from "@/lib/middleware/auth-middleware";
import { ErrorHandler } from "@/lib/utils/error-handler";
import { ApiResponseBuilder } from "@/lib/utils/api-response";
import { AIResponseParser } from "@/lib/utils/ai-response-parser";
import { searchSimilarDocuments } from "@/lib/db";
import { generateEmbedding } from "@/lib/rag";
import { getAIClient } from "@/lib/ai-client";
import { getPrisma } from "@/lib/db";

interface Flashcard {
  question: string;
  answer: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user using middleware
    const authResult = await requireAuth();
    if (!isAuthSuccess(authResult)) {
      return authResult.error;
    }
    const { userId } = authResult;

    const body = await request.json();
    const { topic } = body;

    if (!topic || typeof topic !== "string") {
      return ErrorHandler.badRequest("Topic is required");
    }

    // Generate embedding for the topic
    const topicEmbedding = await generateEmbedding(topic);

    // Search for relevant documents
    const similarDocs = await searchSimilarDocuments(topicEmbedding, userId, 10);

    if (similarDocs.length === 0) {
      return ErrorHandler.notFound("No relevant study materials found. Please upload some documents first.");
    }

    // Combine document content for context
    const context = similarDocs.map((doc) => doc.content).join("\n\n");

    // Generate flashcards and quiz questions using Gemini
    const genAI = getAIClient();
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are a study assistant. Based on the following study material about "${topic}", generate educational tools to help students learn.

Study Material:
${context}

Please generate:
1. 5 flashcards with question and answer pairs
2. 5 multiple-choice quiz questions with 4 options each

Return the response in the following JSON format:
{
  "flashcards": [
    {
      "question": "Question text here",
      "answer": "Answer text here"
    }
  ],
  "quizzes": [
    {
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Explanation of why this is correct"
    }
  ]
}

Important:
- Make questions clear and concise
- Ensure answers are accurate based on the study material
- For quiz questions, make sure only one option is correct
- Provide helpful explanations for quiz questions
- Return ONLY valid JSON, no additional text or formatting`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse the JSON response using AIResponseParser
    let data;
    try {
      data = AIResponseParser.extractJSON<{
        flashcards: Flashcard[];
        quizzes: QuizQuestion[];
      }>(responseText);
    } catch (parseError) {
      const parseErrorMsg = parseError instanceof Error ? parseError.message : "Parse error";
      console.error(`Failed to parse Gemini response: ${parseErrorMsg}`);
      return ErrorHandler.createErrorResponse(
        parseError,
        "Failed to parse generated content. Please try again",
        500
      );
    }

    // Validate the response structure
    if (!data.flashcards || !data.quizzes || !Array.isArray(data.flashcards) || !Array.isArray(data.quizzes)) {
      return ErrorHandler.badRequest("Invalid response format from AI. Please try again.");
    }

    // Store flashcards in database
    const db = getPrisma();
    const flashcardPromises = data.flashcards.map((fc: Flashcard) =>
      db.flashcard.create({
        data: {
          question: fc.question,
          answer: fc.answer,
          userId,
          metadata: { topic },
        },
      })
    );

    // Store quiz questions in database
    const quizPromises = data.quizzes.map((quiz: QuizQuestion) =>
      db.quiz.create({
        data: {
          question: quiz.question,
          options: quiz.options,
          correctAnswer: quiz.correctAnswer,
          explanation: quiz.explanation || null,
          userId,
          metadata: { topic },
        },
      })
    );

    await Promise.all([...flashcardPromises, ...quizPromises]);

    return ApiResponseBuilder.success({
      message: "Successfully generated study tools",
      flashcards: data.flashcards,
      quizzes: data.quizzes,
    });
  } catch (error) {
    return ErrorHandler.handleRouteError(error, "Failed to generate study tools");
  }
}

// GET endpoint to retrieve stored flashcards and quizzes
export async function GET(request: NextRequest) {
  try {
    // Authenticate user using middleware
    const authResult = await requireAuth();
    if (!isAuthSuccess(authResult)) {
      return authResult.error;
    }
    const { userId } = authResult;

    const db = getPrisma();

    // Fetch with timeout handling
    let flashcards, quizzes;
    try {
      [flashcards, quizzes] = await Promise.all([
        Promise.race([
          db.flashcard.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Flashcard query timeout")), 20000)
          ),
        ]),
        Promise.race([
          db.quiz.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Quiz query timeout")), 20000)
          ),
        ]),
      ]);
    } catch (dbError) {
      if (dbError instanceof Error && dbError.message.includes("timeout")) {
        return ErrorHandler.createErrorResponse(
          dbError,
          "Database query timed out. Please check your database connection and try again.",
          503
        );
      }
      throw dbError;
    }

    return ApiResponseBuilder.success({
      flashcards,
      quizzes,
    });
  } catch (error) {
    return ErrorHandler.handleRouteError(error, "Failed to retrieve study tools");
  }
}
