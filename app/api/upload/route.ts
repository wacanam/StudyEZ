import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase, storeDocument } from "@/lib/db";
import { generateEmbedding, chunkText } from "@/lib/rag";

export async function POST(request: NextRequest) {
  try {
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
        // For MVP, we'll extract text from PDF using basic approach
        // In production, use a proper PDF parser like pdf-parse
        const buffer = await file.arrayBuffer();
        content = await extractTextFromPDF(buffer);
      } else {
        // Text file
        content = await file.text();
      }

      if (!content.trim()) {
        continue;
      }

      // Chunk the content
      const chunks = await chunkText(content);

      // Generate embeddings and store each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await generateEmbedding(chunk);
        
        await storeDocument(chunk, embedding, {
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

// Basic PDF text extraction for MVP
// This is a stub - in production, use a proper PDF parser
async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  // Convert ArrayBuffer to string and try to extract readable text
  const uint8Array = new Uint8Array(buffer);
  let text = "";
  
  // Simple extraction - look for text between stream and endstream
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const pdfString = decoder.decode(uint8Array);
  
  // Extract text objects (very basic, works for simple PDFs)
  const textMatches = pdfString.match(/\(([^)]+)\)/g);
  if (textMatches) {
    text = textMatches
      .map((match) => match.slice(1, -1))
      .filter((t) => t.length > 2 && /[a-zA-Z]/.test(t))
      .join(" ");
  }

  // If no text found through parentheses, try to get any readable ASCII
  if (!text.trim()) {
    const readableChars: string[] = [];
    for (let i = 0; i < uint8Array.length; i++) {
      const char = uint8Array[i];
      if ((char >= 32 && char <= 126) || char === 10 || char === 13) {
        readableChars.push(String.fromCharCode(char));
      }
    }
    text = readableChars.join("");
  }

  // Clean up the text
  text = text
    .replace(/[^\x20-\x7E\n\r]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text;
}
