import { Prisma } from "@prisma/client";

/**
 * Type definitions for API data structures
 * Eliminates the use of 'any' type throughout the codebase
 */

/**
 * Source document reference returned in query responses
 */
export interface SourceDocument {
  text: string;
  score: number;
  relevanceScore: number;
  metadata: Record<string, unknown>;
  isVisual: boolean;
}

/**
 * Type guard to check if an object is a valid SourceDocument
 * Exported for reusability across modules
 */
export function isSourceDocument(obj: unknown): obj is SourceDocument {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'text' in obj &&
    'score' in obj &&
    'relevanceScore' in obj &&
    'metadata' in obj &&
    'isVisual' in obj
  );
}

/**
 * Helper to convert SourceDocument array to Prisma JSON
 * Direct cast is safe as SourceDocument structure is JSON-compatible
 */
export function sourcesToJson(sources: SourceDocument[]): Prisma.InputJsonValue {
  return sources as unknown as Prisma.InputJsonValue;
}

/**
 * Helper to parse sources from Prisma JSON
 */
export function sourcesFromJson(json: Prisma.JsonValue): SourceDocument[] {
  if (Array.isArray(json)) {
    const validSources: SourceDocument[] = [];
    for (const item of json) {
      if (isSourceDocument(item)) {
        validSources.push(item);
      }
    }
    return validSources;
  }
  return [];
}

/**
 * Query request payload with optional document ID filtering
 */
export interface QueryRequest {
  query: string;
  sessionId?: number;
  documentIds?: number[];
}

/**
 * Type guard to validate QueryRequest
 */
export function isQueryRequest(obj: unknown): obj is QueryRequest {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  const request = obj as Record<string, unknown>;
  
  // query is required and must be string
  if (typeof request.query !== 'string') {
    return false;
  }
  
  // sessionId is optional but must be number if present
  if (request.sessionId !== undefined && typeof request.sessionId !== 'number') {
    return false;
  }
  
  // documentIds is optional but must be array of numbers if present
  if (request.documentIds !== undefined) {
    if (!Array.isArray(request.documentIds)) {
      return false;
    }
    // Check each element is a number - early exit on first non-number
    for (const id of request.documentIds) {
      if (typeof id !== 'number') {
        return false;
      }
    }
  }
  
  return true;
}
