import {
  Document,
  VectorStoreIndex,
  Settings,
  storageContextFromDefaults,
} from "llamaindex";
import { SentenceSplitter } from "llamaindex";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Google Generative AI client
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

/**
 * Generate embeddings using Google's text-embedding-004 model
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Generate a response using Gemini 2.5 Flash LLM
 */
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

/**
 * Re-rank documents using Gemini to select the most relevant ones
 * Returns the indices of the top N most relevant documents
 */
export async function rerankDocuments(
  query: string,
  documents: Array<{ content: string; score: number }>,
  topK: number = 3
): Promise<Array<{ index: number; relevanceScore: number }>> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

  // Create a numbered list of documents for the LLM to evaluate
  const documentList = documents
    .map((doc, idx) => `Document ${idx + 1}:\n${doc.content}`)
    .join("\n\n---\n\n");

  const prompt = `You are an expert at evaluating document relevance. Given a query and a list of documents, identify the ${topK} most relevant documents that best answer the query.

Query: ${query}

Documents:
${documentList}

Instructions:
1. Carefully evaluate each document's relevance to the query
2. Select the ${topK} most relevant documents
3. For each selected document, provide its number and a relevance score (0-100)
4. Return ONLY a JSON array in this exact format:
[
  {"index": 1, "relevanceScore": 95},
  {"index": 3, "relevanceScore": 87},
  {"index": 2, "relevanceScore": 75}
]

Important: Return ONLY the JSON array, no other text or explanation.`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text().trim();
  
  try {
    // Extract JSON from response (handle potential markdown code blocks)
    let jsonText = responseText;
    if (responseText.includes("```json")) {
      jsonText = responseText.split("```json")[1].split("```")[0].trim();
    } else if (responseText.includes("```")) {
      jsonText = responseText.split("```")[1].split("```")[0].trim();
    }
    
    const rankings = JSON.parse(jsonText) as Array<{ index: number; relevanceScore: number }>;
    
    // Convert 1-based indices to 0-based and validate
    return rankings
      .map(r => ({ index: r.index - 1, relevanceScore: r.relevanceScore }))
      .filter(r => r.index >= 0 && r.index < documents.length)
      .slice(0, topK);
  } catch (error) {
    console.error("Failed to parse re-ranking response:", error, "Response:", responseText);
    // Fallback: return top K based on original scores
    return documents
      .map((_, idx) => ({ index: idx, relevanceScore: Math.min(documents[idx].score * 100, 100) }))
      .slice(0, topK);
  }
}

/**
 * Chunk text using LlamaIndex's SentenceSplitter
 */
export async function chunkText(
  text: string,
  chunkSize: number = 512,
  chunkOverlap: number = 50
): Promise<string[]> {
  // Create a document from the text
  const document = new Document({ text });

  // Use LlamaIndex's SentenceSplitter for chunking
  const splitter = new SentenceSplitter({
    chunkSize,
    chunkOverlap,
  });

  const nodes = splitter.getNodesFromDocuments([document]);
  return nodes.map((node) => node.getText());
}

/**
 * Create a LlamaIndex Document from text content
 */
export function createDocument(
  text: string,
  metadata: Record<string, unknown> = {}
): Document {
  return new Document({
    text,
    metadata,
  });
}

/**
 * Build a vector store index from documents using LlamaIndex
 * Note: This uses in-memory storage for MVP
 */
export async function buildIndexFromDocuments(
  documents: Document[]
): Promise<VectorStoreIndex> {
  const storageContext = await storageContextFromDefaults({});

  const index = await VectorStoreIndex.fromDocuments(documents, {
    storageContext,
  });

  return index;
}

/**
 * Query an index and get response with sources
 */
export async function queryIndex(
  index: VectorStoreIndex,
  query: string
): Promise<{ response: string; sources: string[] }> {
  const queryEngine = index.asQueryEngine();
  const response = await queryEngine.query({ query });

  const sources = response.sourceNodes?.map((node) => {
    // Access the text content from the node using unknown first
    const textNode = node.node as unknown as { text?: string };
    return textNode.text || "";
  }) || [];

  return {
    response: response.toString(),
    sources,
  };
}

// Export Settings for advanced configuration
export { Settings, Document, VectorStoreIndex };
