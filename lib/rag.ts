import {
  Document,
  VectorStoreIndex,
  Settings,
} from "llamaindex";
import { embeddingService } from "./services/embedding-service";
import { llmService } from "./services/llm-service";
import { documentService } from "./services/document-service";

/**
 * Generate embeddings using Google's text-embedding-004 model
 * Delegates to EmbeddingService
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  return embeddingService.generateEmbedding(text);
}

/**
 * Generate a response using Gemini 2.0 Flash LLM
 * Delegates to LLMService
 */
export async function generateResponse(
  query: string,
  context: string[]
): Promise<string> {
  return llmService.generateResponse(query, context);
}

/**
 * Re-rank documents using Gemini to select the most relevant ones
 * Returns the indices of the top N most relevant documents
 * Delegates to LLMService
 */
export async function rerankDocuments(
  query: string,
  documents: Array<{ content: string; score: number }>,
  topK: number = 3
): Promise<Array<{ index: number; relevanceScore: number }>> {
  return llmService.rerankDocuments(query, documents, topK);
}

/**
 * Chunk text using LlamaIndex's SentenceSplitter
 * Delegates to DocumentService
 */
export async function chunkText(
  text: string,
  chunkSize: number = 512,
  chunkOverlap: number = 50
): Promise<string[]> {
  return documentService.chunkText(text, chunkSize, chunkOverlap);
}

/**
 * Create a LlamaIndex Document from text content
 * Delegates to DocumentService
 */
export function createDocument(
  text: string,
  metadata: Record<string, unknown> = {}
): Document {
  return documentService.createDocument(text, metadata);
}

/**
 * Build a vector store index from documents using LlamaIndex
 * Note: This uses in-memory storage for MVP
 * Delegates to DocumentService
 */
export async function buildIndexFromDocuments(
  documents: Document[]
): Promise<VectorStoreIndex> {
  return documentService.buildIndexFromDocuments(documents);
}

/**
 * Query an index and get response with sources
 * Delegates to DocumentService
 */
export async function queryIndex(
  index: VectorStoreIndex,
  query: string
): Promise<{ response: string; sources: string[] }> {
  return documentService.queryIndex(index, query);
}

// Export Settings for advanced configuration
export { Settings, Document, VectorStoreIndex };
