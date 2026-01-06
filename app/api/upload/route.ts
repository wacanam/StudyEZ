import { NextRequest } from "next/server";
import { requireAuth, isAuthSuccess } from "@/lib/middleware/auth-middleware";
import { ErrorHandler } from "@/lib/utils/error-handler";
import { ApiResponseBuilder } from "@/lib/utils/api-response";
import { initializeDatabase, storeDocument } from "@/lib/db";
import { generateEmbedding, chunkText } from "@/lib/rag";
import { getAIClient } from "@/lib/ai-client";

// Constants for visual extraction
const NO_VISUALS_MARKER = "NO_VISUALS_FOUND";
const VISUAL_SEPARATOR = "---";

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

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return ErrorHandler.badRequest("No files provided");
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
          
          // Generate embeddings for all visual descriptions concurrently
          const embeddingPromises = visualDescriptions.map(desc => generateEmbedding(desc));
          const embeddings = await Promise.all(embeddingPromises);
          
          // Store visual descriptions with their embeddings
          for (let i = 0; i < visualDescriptions.length; i++) {
            await storeDocument(visualDescriptions[i], embeddings[i], userId, {
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

    return ApiResponseBuilder.success({
      message: `Successfully processed ${processedFiles.length} file(s)`,
      documentsCount: totalChunks,
      files: processedFiles,
    });
  } catch (error) {
    return ErrorHandler.handleRouteError(error, "Failed to process files");
  }
}

/**
 * Use Gemini's vision capabilities to extract text and visual descriptions from PDF files
 */
async function extractTextWithGemini(
  buffer: ArrayBuffer, 
  mimeType: string
): Promise<{ textContent: string; visualDescriptions: string[] }> {
  const genAI = getAIClient();
  
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
${VISUAL_SEPARATOR}

If there are NO visual elements in the document, respond with exactly: "${NO_VISUALS_MARKER}"

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
  if (visualResponse !== NO_VISUALS_MARKER && visualResponse.length > 0) {
    // Split by the separator and filter empty entries
    const descriptions = visualResponse
      .split(VISUAL_SEPARATOR)
      .map(d => d.trim())
      .filter(d => d.length > 0 && d !== NO_VISUALS_MARKER);
    visualDescriptions.push(...descriptions);
  }
  
  return { textContent, visualDescriptions };
}
