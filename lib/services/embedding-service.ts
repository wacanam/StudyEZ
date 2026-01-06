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
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const client = getAIClient();
    const model = client.getGenerativeModel({ model: this.modelName });
    const result = await model.embedContent(text);
    return result.embedding.values;
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
