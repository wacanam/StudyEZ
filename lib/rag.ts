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
