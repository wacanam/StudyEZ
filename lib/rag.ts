import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY environment variable is not set");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: "text-embedding-004" });
  
  const result = await model.embedContent(text);
  return result.embedding.values;
}

export async function generateResponse(
  query: string,
  context: string[]
): Promise<string> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

  const contextText = context.join("\n\n---\n\n");
  
  const prompt = `You are a helpful study assistant. Use the following context from study materials to answer the question. If the context doesn't contain relevant information, say so but try to provide helpful guidance.

Context from study materials:
${contextText}

Question: ${query}

Please provide a clear, concise answer that helps with studying. If referencing specific information from the context, mention it.`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text();
}

export async function chunkText(
  text: string,
  chunkSize: number = 500,
  overlap: number = 50
): Promise<string[]> {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  let currentChunk = "";
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // Keep overlap by starting with part of the previous chunk
      const words = currentChunk.split(" ");
      const overlapWords = words.slice(-Math.ceil(overlap / 5));
      currentChunk = overlapWords.join(" ") + " " + sentence;
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}
