import { getAIClient } from "../ai-client";
import { AIResponseParser } from "../utils/ai-response-parser";

/**
 * Service for LLM operations
 * Single Responsibility: Handle all LLM-based text generation
 * Dependency Inversion: Depends on abstracted AI client
 */
export class LLMService {
  private readonly defaultModel = "gemini-2.0-flash";

  /**
   * Generate a response using the LLM
   * @throws Error if response generation fails
   */
  async generateResponse(
    query: string,
    context: string[],
    systemPrompt?: string
  ): Promise<string> {
    // Sanitize inputs to prevent prompt injection
    const sanitizedQuery = query.trim();
    const sanitizedContext = context.map(c => c.trim()).filter(c => c.length > 0);

    if (!sanitizedQuery) {
      throw new Error("Query cannot be empty");
    }

    const client = getAIClient();
    const model = client.getGenerativeModel({ model: this.defaultModel });

    const contextText = sanitizedContext.join("\n\n---\n\n");

    const prompt = systemPrompt || `You are a helpful study assistant. Use the following context from study materials to answer the question. If the context doesn't contain relevant information, say so but try to provide helpful guidance.

Context from study materials:
${contextText}

Question: ${sanitizedQuery}

Please provide a clear, concise answer that helps with studying. If referencing specific information from the context, mention it.`;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      if (!responseText || !responseText.trim()) {
        throw new Error("AI generated empty response");
      }
      
      return responseText;
    } catch (error) {
      throw new Error(
        `Failed to generate response: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Generate content with custom prompt
   * @throws Error if content generation fails
   */
  async generateContent(prompt: string): Promise<string> {
    if (!prompt || !prompt.trim()) {
      throw new Error("Prompt cannot be empty");
    }

    const client = getAIClient();
    const model = client.getGenerativeModel({ model: this.defaultModel });
    
    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      if (!responseText || !responseText.trim()) {
        throw new Error("AI generated empty response");
      }
      
      return responseText;
    } catch (error) {
      throw new Error(
        `Failed to generate content: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Generate structured JSON response
   */
  async generateStructuredResponse<T>(
    prompt: string,
    fallback: T
  ): Promise<T> {
    const responseText = await this.generateContent(prompt);
    return AIResponseParser.safeParseJSON<T>(responseText, fallback);
  }

  /**
   * Re-rank documents using LLM to select the most relevant ones
   */
  async rerankDocuments(
    query: string,
    documents: Array<{ content: string; score: number }>,
    topK: number = 3
  ): Promise<Array<{ index: number; relevanceScore: number }>> {
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

    const fallback = documents
      .map((_, idx) => ({ 
        index: idx, 
        relevanceScore: Math.min(documents[idx].score * 100, 100) 
      }))
      .slice(0, topK);

    const rankings = await this.generateStructuredResponse<
      Array<{ index: number; relevanceScore: number }>
    >(prompt, fallback);

    // Convert 1-based indices to 0-based and validate
    return rankings
      .map(r => ({ index: r.index - 1, relevanceScore: r.relevanceScore }))
      .filter(r => r.index >= 0 && r.index < documents.length)
      .slice(0, topK);
  }
}

// Export singleton instance
export const llmService = new LLMService();
