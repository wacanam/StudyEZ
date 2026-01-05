import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initializeDatabase, storeDocument } from "@/lib/db";
import { generateEmbedding, chunkText } from "@/lib/rag";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini client
function getGenAI(): GoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY environment variable is not set");
  }
  return new GoogleGenerativeAI(apiKey);
}

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

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    let totalChunks = 0;
    const processedFiles: string[] = [];

    for (const file of files) {
      const fileName = file.name;
      const fileType = file.type;
      
      // Read file content
      let content: string;
      
      if (fileType === "application/pdf") {
        // Use Gemini to extract text from PDF
        const buffer = await file.arrayBuffer();
        content = await extractTextWithGemini(buffer, fileType);
      } else {
        // Text file - read directly
        content = await file.text();
      }

      if (!content.trim()) {
        console.log(`No content extracted from file: ${fileName}`);
        continue;
      }

      console.log(`Extracted ${content.length} characters from ${fileName}`);

      // Chunk the content
      const chunks = await chunkText(content);

      // Generate embeddings and store each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await generateEmbedding(chunk);
        
        await storeDocument(chunk, embedding, userId, {
          fileName,
          chunkIndex: i,
          totalChunks: chunks.length,
        });
        
        totalChunks++;
      }

      processedFiles.push(fileName);
    }

    return NextResponse.json({
      message: `Successfully processed ${processedFiles.length} file(s)`,
      documentsCount: totalChunks,
      files: processedFiles,
    });
  } catch (error) {
    console.error("Upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to process files: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * Use Gemini's vision capabilities to extract text from PDF files
 */
async function extractTextWithGemini(buffer: ArrayBuffer, mimeType: string): Promise<string> {
  const genAI = getGenAI();
  
  // Use Gemini 2.0 Flash which supports document understanding
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  
  // Convert ArrayBuffer to base64
  const base64Data = Buffer.from(buffer).toString("base64");
  
  // Create the request with inline data (PDF)
  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    },
    {
      text: `Extract ALL the text content from this PDF document. 
Return ONLY the extracted text content, preserving the original structure and formatting as much as possible.
Do not add any commentary, summaries, or explanations - just the raw text from the document.
If there are multiple pages, include all content from all pages.
If there are headers, paragraphs, lists, or other structural elements, preserve them.`,
    },
  ]);

  const response = result.response;
  const extractedText = response.text();
  
  return extractedText.trim();
}
