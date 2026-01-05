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
        // Use Gemini to extract text and visual descriptions from PDF
        const buffer = await file.arrayBuffer();
        const { textContent, visualDescriptions } = await extractTextWithGemini(buffer, fileType);
        content = textContent;
        
        // Process visual descriptions as separate chunks
        if (visualDescriptions && visualDescriptions.length > 0) {
          console.log(`Found ${visualDescriptions.length} visual elements in ${fileName}`);
          
          for (let i = 0; i < visualDescriptions.length; i++) {
            const visualDesc = visualDescriptions[i];
            const embedding = await generateEmbedding(visualDesc);
            
            await storeDocument(visualDesc, embedding, userId, {
              fileName,
              chunkType: "visual",
              visualIndex: i,
            });
            
            totalChunks++;
          }
        }
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
          chunkType: "text",
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
 * Use Gemini's vision capabilities to extract text and visual descriptions from PDF files
 */
async function extractTextWithGemini(
  buffer: ArrayBuffer, 
  mimeType: string
): Promise<{ textContent: string; visualDescriptions: string[] }> {
  const genAI = getGenAI();
  
  // Use Gemini 2.0 Flash which supports document understanding
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  
  // Convert ArrayBuffer to base64
  const base64Data = Buffer.from(buffer).toString("base64");
  
  // First pass: Extract text content
  const textResult = await model.generateContent([
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

  const textContent = textResult.response.text().trim();
  
  // Second pass: Extract visual descriptions
  const visualResult = await model.generateContent([
    {
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    },
    {
      text: `Analyze this PDF document and identify any visual content such as diagrams, charts, tables, graphs, images, or figures.
For EACH visual element you find, provide a detailed description in the following format:

[VISUAL: Type of visual (e.g., diagram, chart, table, graph, image)]
Description: [Detailed description of the visual element, including key data points, labels, trends, or important information it conveys]
Context: [Any surrounding text or captions that provide context for this visual]
---

If there are NO visual elements in the document, respond with exactly: "NO_VISUALS_FOUND"

Focus on visual content that contains important information for studying, such as:
- Diagrams showing processes or relationships
- Charts and graphs with data
- Tables with structured information
- Annotated images
- Flowcharts or mind maps

Provide clear, detailed descriptions that would help someone understand the visual content without seeing it.`,
    },
  ]);

  const visualResponse = visualResult.response.text().trim();
  
  // Parse visual descriptions
  const visualDescriptions: string[] = [];
  if (visualResponse !== "NO_VISUALS_FOUND" && visualResponse.length > 0) {
    // Split by the separator and filter empty entries
    const descriptions = visualResponse.split("---").map(d => d.trim()).filter(d => d.length > 0);
    visualDescriptions.push(...descriptions);
  }
  
  return { textContent, visualDescriptions };
}
