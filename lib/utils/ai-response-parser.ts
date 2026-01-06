/**
 * Utility for parsing AI responses
 * Single Responsibility: Handle AI response parsing
 * DRY: Centralize JSON extraction logic used across multiple routes
 */
export class AIResponseParser {
  /**
   * Extract JSON from AI response, handling markdown code blocks
   */
  static extractJSON<T = unknown>(responseText: string): T {
    let jsonText = responseText.trim();
    
    // Handle markdown code blocks
    if (jsonText.includes("```json")) {
      jsonText = jsonText.split("```json")[1].split("```")[0].trim();
    } else if (jsonText.includes("```")) {
      jsonText = jsonText.split("```")[1].split("```")[0].trim();
    }
    
    return JSON.parse(jsonText) as T;
  }

  /**
   * Safely parse JSON with fallback
   */
  static safeParseJSON<T = unknown>(
    responseText: string,
    fallback: T
  ): T {
    try {
      return this.extractJSON<T>(responseText);
    } catch (error) {
      // Log error without exposing potentially sensitive response text
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to parse AI response: ${errorMsg}`);
      return fallback;
    }
  }
}
