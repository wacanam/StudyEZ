import { getAIClient } from "../ai-client";

/**
 * Service for generating embeddings
 * Single Responsibility: Handle all embedding generation
 * Dependency Inversion: Depends on abstracted AI client
 */
export class EmbeddingService {
  private readonly modelName = "text-embedding-004";

  /**
   * Generate embeddings for given text
   * @throws Error if text is empty or API call fails
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || !text.trim()) {
      throw new Error("Cannot generate embedding for empty text");
    }

    const client = getAIClient();
    const model = client.getGenerativeModel({ model: this.modelName });
    
    try {
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      throw new Error(
        `Failed to generate embedding: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Generate embeddings for multiple texts concurrently
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const promises = texts.map(text => this.generateEmbedding(text));
    return Promise.all(promises);
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();
