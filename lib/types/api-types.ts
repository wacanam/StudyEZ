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
