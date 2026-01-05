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
    globalForPrisma.pool = new Pool({ connectionString });
  }
  return globalForPrisma.pool;
}

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const pool = getPool();
    const adapter = new PrismaPg(pool);
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }
  return globalForPrisma.prisma;
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

  console.log("Database initialized successfully");
}

export async function storeDocument(
  content: string,
  embedding: number[],
  metadata: Record<string, unknown> = {}
): Promise<number> {
  const db = getPrisma();
  
  // Use raw query to handle vector type
  const result = await db.$queryRaw<{ id: number }[]>`
    INSERT INTO documents (content, embedding, metadata)
    VALUES (${content}, ${embedding}::vector, ${JSON.stringify(metadata)}::jsonb)
    RETURNING id
  `;

  return result[0].id;
}

export async function searchSimilarDocuments(
  embedding: number[],
  limit: number = 5
): Promise<Array<{ id: number; content: string; score: number; metadata: Record<string, unknown> }>> {
  const db = getPrisma();
  
  const results = await db.$queryRaw<
    Array<{ id: number; content: string; score: number; metadata: Record<string, unknown> }>
  >`
    SELECT id, content, metadata,
           1 - (embedding <=> ${embedding}::vector) as score
    FROM documents
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${embedding}::vector
    LIMIT ${limit}
  `;

  return results;
}

export async function getDocumentCount(): Promise<number> {
  const db = getPrisma();
  return db.document.count();
}
