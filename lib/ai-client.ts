import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Centralized AI client management following the Singleton pattern
 * Single Responsibility: Manage GoogleGenerativeAI client lifecycle
 */
class AIClientManager {
  private static instance: AIClientManager;
  private client: GoogleGenerativeAI | null = null;

  private constructor() {}

  public static getInstance(): AIClientManager {
    if (!AIClientManager.instance) {
      AIClientManager.instance = new AIClientManager();
    }
    return AIClientManager.instance;
  }

  public getClient(): GoogleGenerativeAI {
    if (!this.client) {
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error("GOOGLE_API_KEY environment variable is not set");
      }
      this.client = new GoogleGenerativeAI(apiKey);
    }
    return this.client;
  }
}

/**
 * Get the Gemini AI client instance
 * Single point of access for AI client throughout the application
 */
export function getAIClient(): GoogleGenerativeAI {
  return AIClientManager.getInstance().getClient();
}
