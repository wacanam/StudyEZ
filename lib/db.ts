import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Singleton pattern for Prisma client with pg adapter
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function getPool(): Pool {
  if (!globalForPrisma.pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    globalForPrisma.pool = new Pool({
      connectionString,
      // Connection pool configuration
      max: 20, // Maximum number of connections
      idleTimeoutMillis: 30000, // Close idle connections after 30s
      connectionTimeoutMillis: 5000, // Timeout for acquiring a connection from the pool
      statement_timeout: 30000, // Query timeout in milliseconds
    });
  }
  return globalForPrisma.pool;
}

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const pool = getPool();
    const adapter = new PrismaPg(pool);
    globalForPrisma.prisma = new PrismaClient({
      adapter,
      // Enable detailed error logging
      errorFormat: 'pretty',
    });
  }
  return globalForPrisma.prisma;
}

/**
 * Test database connectivity
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const db = getPrisma();
    await db.$queryRaw`SELECT 1`;
    console.log("✓ Database connection successful");
    return true;
  } catch (error) {
    console.error("✗ Database connection failed:", error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Convert a number array to PGVector format string: [0.1,0.2,0.3,...]
 */
function toVectorString(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export async function initializeDatabase(): Promise<void> {
  const db = getPrisma();

  // Create pgvector extension if not exists
  await db.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`);

  // Create the index for vector similarity search if it doesn't exist
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS documents_embedding_idx 
    ON documents 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100)
  `);

  // Create GIN index for full-text search if it doesn't exist
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS documents_content_fts_idx 
    ON documents 
    USING gin (to_tsvector('english', content))
  `);

  console.log("Database initialized successfully");
}

export async function storeDocument(
  content: string,
  embedding: number[],
  userId: string,
  metadata: Record<string, unknown> = {}
): Promise<number> {
  const db = getPrisma();

  // Convert embedding array to PGVector format string
  const vectorString = toVectorString(embedding);

  // Use raw query to handle vector type
  // Note: Prisma's $queryRaw with template literals uses parameterized queries, safe from SQL injection
  const result = await db.$queryRaw<{ id: number }[]>`
    INSERT INTO documents (content, embedding, user_id, metadata)
    VALUES (${content}, ${vectorString}::vector, ${userId}, ${JSON.stringify(metadata)}::jsonb)
    RETURNING id
  `;

  return result[0].id;
}

export async function searchSimilarDocuments(
  embedding: number[],
  userId: string,
  limit: number = 5
): Promise<Array<{ id: number; content: string; score: number; metadata: Record<string, unknown> }>> {
  const db = getPrisma();

  // Convert embedding array to PGVector format string
  const vectorString = toVectorString(embedding);

  const results = await db.$queryRaw<
    Array<{ id: number; content: string; score: number; metadata: Record<string, unknown> }>
  >`
    SELECT id, content, metadata,
           1 - (embedding <=> ${vectorString}::vector) as score
    FROM documents
    WHERE embedding IS NOT NULL AND user_id = ${userId}
    ORDER BY embedding <=> ${vectorString}::vector
    LIMIT ${limit}
  `;

  return results;
}

/**
 * Hybrid search combining vector similarity and full-text search
 * Uses Reciprocal Rank Fusion (RRF) to combine rankings from both methods
 * 
 * @param query - The search query string
 * @param embedding - The query embedding vector
 * @param userId - User ID to filter documents
 * @param limit - Maximum number of results to return
 * @param documentIds - Optional array of document IDs to restrict search.
 *   - If undefined: searches all user's documents (default behavior)
 *   - If empty array: returns empty results (no documents to search)
 *   - If non-empty array: only searches within the specified document IDs
 *   - All IDs must be valid integers belonging to the user (validated by caller)
 */
export async function hybridSearch(
  query: string,
  embedding: number[],
  userId: string,
  limit: number = 10,
  documentIds?: number[]
): Promise<Array<{ id: number; content: string; score: number; metadata: Record<string, unknown> }>> {
  const db = getPrisma();
  const vectorString = toVectorString(embedding);

  // Build document ID filter condition
  // If documentIds is provided and not empty, filter by those IDs
  const hasDocumentFilter = documentIds && documentIds.length > 0;

  if (hasDocumentFilter) {
    // Safety check: ensure all IDs are integers (should be validated by caller)
    // This protects against SQL injection via array casting
    if (!documentIds.every(id => Number.isInteger(id))) {
      throw new Error("All document IDs must be integers");
    }

    // Perform hybrid search with document ID filtering
    // k=60 is a common constant for RRF
    const results = await db.$queryRaw<
      Array<{ id: number; content: string; score: number; metadata: Record<string, unknown> }>
    >`
      WITH vector_search AS (
        SELECT 
          id, 
          content, 
          metadata,
          ROW_NUMBER() OVER (ORDER BY embedding <=> ${vectorString}::vector) AS rank
        FROM documents
        WHERE embedding IS NOT NULL AND user_id = ${userId} AND id = ANY(${documentIds}::int[])
        LIMIT 20
      ),
      fts_search AS (
        SELECT 
          id, 
          content, 
          metadata,
          ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('english', content), plainto_tsquery('english', ${query})) DESC) AS rank
        FROM documents
        WHERE user_id = ${userId} AND to_tsvector('english', content) @@ plainto_tsquery('english', ${query}) AND id = ANY(${documentIds}::int[])
        LIMIT 20
      ),
      combined AS (
        SELECT 
          COALESCE(v.id, f.id) AS id,
          COALESCE(v.content, f.content) AS content,
          COALESCE(v.metadata, f.metadata) AS metadata,
          (COALESCE(1.0 / (60 + v.rank), 0.0) + COALESCE(1.0 / (60 + f.rank), 0.0)) AS score
        FROM vector_search v
        FULL OUTER JOIN fts_search f ON v.id = f.id
      )
      SELECT id, content, metadata, score
      FROM combined
      ORDER BY score DESC
      LIMIT ${limit}
    `;
    return results;
  }

  // Original query without document filtering (backward compatibility)
  const results = await db.$queryRaw<
    Array<{ id: number; content: string; score: number; metadata: Record<string, unknown> }>
  >`
    WITH vector_search AS (
      SELECT 
        id, 
        content, 
        metadata,
        ROW_NUMBER() OVER (ORDER BY embedding <=> ${vectorString}::vector) AS rank
      FROM documents
      WHERE embedding IS NOT NULL AND user_id = ${userId}
      LIMIT 20
    ),
    fts_search AS (
      SELECT 
        id, 
        content, 
        metadata,
        ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('english', content), plainto_tsquery('english', ${query})) DESC) AS rank
      FROM documents
      WHERE user_id = ${userId} AND to_tsvector('english', content) @@ plainto_tsquery('english', ${query})
      LIMIT 20
    ),
    combined AS (
      SELECT 
        COALESCE(v.id, f.id) AS id,
        COALESCE(v.content, f.content) AS content,
        COALESCE(v.metadata, f.metadata) AS metadata,
        (COALESCE(1.0 / (60 + v.rank), 0.0) + COALESCE(1.0 / (60 + f.rank), 0.0)) AS score
      FROM vector_search v
      FULL OUTER JOIN fts_search f ON v.id = f.id
    )
    SELECT id, content, metadata, score
    FROM combined
    ORDER BY score DESC
    LIMIT ${limit}
  `;

  return results;
}
