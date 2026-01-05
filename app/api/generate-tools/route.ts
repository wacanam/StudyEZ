import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { searchSimilarDocuments } from "@/lib/db";
import { generateEmbedding } from "@/lib/rag";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getPrisma } from "@/lib/db";

function getGenAI(): GoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY environment variable is not set");
  }
  return new GoogleGenerativeAI(apiKey);
}

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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { topic } = body;

    if (!topic || typeof topic !== "string") {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }

    // Generate embedding for the topic
    const topicEmbedding = await generateEmbedding(topic);

    // Search for relevant documents
    const similarDocs = await searchSimilarDocuments(topicEmbedding, userId, 10);

    if (similarDocs.length === 0) {
      return NextResponse.json({
        error: "No relevant study materials found. Please upload some documents first.",
      }, { status: 404 });
    }

    // Combine document content for context
    const context = similarDocs.map((doc) => doc.content).join("\n\n");

    // Generate flashcards and quiz questions using Gemini
    const genAI = getGenAI();
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

    // Parse the JSON response
    let data;
    try {
      // Try to extract JSON from the response if it contains markdown code blocks
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : responseText;
      data = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", responseText);
      return NextResponse.json(
        { error: "Failed to parse generated content. Please try again." },
        { status: 500 }
      );
    }

    // Validate the response structure
    if (!data.flashcards || !data.quizzes || !Array.isArray(data.flashcards) || !Array.isArray(data.quizzes)) {
      return NextResponse.json(
        { error: "Invalid response format from AI. Please try again." },
        { status: 500 }
      );
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

    return NextResponse.json({
      message: "Successfully generated study tools",
      flashcards: data.flashcards,
      quizzes: data.quizzes,
    });
  } catch (error) {
    console.error("Generate tools error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to generate study tools: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve stored flashcards and quizzes
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

    const flashcards = await db.flashcard.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const quizzes = await db.quiz.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      flashcards,
      quizzes,
    });
  } catch (error) {
    console.error("Get tools error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to retrieve study tools: ${errorMessage}` },
      { status: 500 }
    );
  }
}
