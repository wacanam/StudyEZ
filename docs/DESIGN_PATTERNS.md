# Design Patterns Documentation

This document describes the design patterns applied during the SOLID and DRY refactoring of the StudyEZ codebase.

## Table of Contents
1. [Singleton Pattern](#singleton-pattern)
2. [Service Layer Pattern](#service-layer-pattern)
3. [Dependency Injection Pattern](#dependency-injection-pattern)
4. [Strategy Pattern](#strategy-pattern)
5. [Repository Pattern](#repository-pattern)
6. [Factory Pattern](#factory-pattern)
7. [Middleware Pattern](#middleware-pattern)
8. [Summary](#summary)

---

## 1. Singleton Pattern

### Purpose
Ensures a class has only one instance and provides a global point of access to it.

### Implementation Location
- **File**: `lib/ai-client.ts`
- **Class**: `AIClientManager`

### Problem Solved
Before refactoring, multiple files created their own instances of `GoogleGenerativeAI` client, duplicating initialization logic across `lib/rag.ts`, `app/api/upload/route.ts`, and `app/api/generate-tools/route.ts`.

### Solution
```typescript
class AIClientManager {
  private static instance: AIClientManager;
  private client: GoogleGenerativeAI | null = null;

  private constructor() {} // Private constructor prevents direct instantiation

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

export function getAIClient(): GoogleGenerativeAI {
  return AIClientManager.getInstance().getClient();
}
```

### Benefits
- ✅ **DRY Principle**: Eliminates code duplication across 3+ files
- ✅ **Single Responsibility**: One class manages the AI client lifecycle
- ✅ **Resource Efficiency**: Only one client instance is created and reused
- ✅ **Consistency**: All parts use the same client instance

### SOLID Principles Applied
- **SRP**: The class has one job - manage the AI client
- **DIP**: Depends on abstraction, not concrete implementation

---

## 2. Service Layer Pattern

### Purpose
Encapsulates business logic in dedicated service classes, separating it from API routes and data access.

### Implementation Locations
- `lib/services/embedding-service.ts` - Embedding generation
- `lib/services/llm-service.ts` - LLM operations
- `lib/services/document-service.ts` - Document processing

### Problem Solved
API routes had mixed responsibilities: authentication, business logic, database operations, and response formatting all in one function.

### Solution

**EmbeddingService**
```typescript
export class EmbeddingService {
  private readonly modelName = "text-embedding-004";

  async generateEmbedding(text: string): Promise<number[]> {
    const client = getAIClient();
    const model = client.getGenerativeModel({ model: this.modelName });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(text => this.generateEmbedding(text)));
  }
}
```

**LLMService**
```typescript
export class LLMService {
  async generateResponse(query: string, context: string[]): Promise<string>
  async rerankDocuments(query: string, documents: any[]): Promise<any[]>
  async generateStructuredResponse<T>(prompt: string): Promise<T>
}
```

**DocumentService**
```typescript
export class DocumentService {
  async chunkText(text: string): Promise<string[]>
  createDocument(text: string, metadata: any): Document
  async buildIndexFromDocuments(documents: Document[]): Promise<VectorStoreIndex>
}
```

### Benefits
- ✅ **Single Responsibility**: Each service has one clear purpose
- ✅ **Reusability**: Services used across multiple routes
- ✅ **Testability**: Services can be unit tested independently
- ✅ **Maintainability**: Business logic changes are isolated

### SOLID Principles Applied
- **SRP**: Each service class has a single responsibility
- **OCP**: Services can be extended without modification
- **DIP**: Services depend on abstractions (AI client interface)
- **ISP**: Each service provides only needed methods

---

## 3. Dependency Injection Pattern

### Purpose
Injects dependencies from outside rather than creating them internally, promoting loose coupling.

### Implementation
All services use the centralized AI client via `getAIClient()` instead of creating their own instances.

**Before (Tight Coupling)**
```typescript
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey); // Creates own client
  // ...
}
```

**After (Dependency Injection)**
```typescript
export class EmbeddingService {
  async generateEmbedding(text: string): Promise<number[]> {
    const client = getAIClient(); // Injected dependency
    // ...
  }
}
```

### Benefits
- ✅ **Loose Coupling**: Services don't depend on concrete implementations
- ✅ **Testability**: Easy to mock dependencies for testing
- ✅ **Flexibility**: Can swap implementations without changing service code

### SOLID Principles Applied
- **DIP**: High-level modules depend on abstractions
- **OCP**: Can change AI client without modifying services

---

## 4. Strategy Pattern

### Purpose
Defines a family of algorithms, encapsulates each one, and makes them interchangeable.

### Implementation Location
- `lib/content-extractors.ts` - Content extraction strategies

### Implementation
```typescript
// YouTube extraction strategy
export async function fetchYouTubeTranscript(url: string): Promise<string> {
  // YouTube-specific extraction
}

// Webpage scraping strategy
export async function scrapeWebPage(url: string): Promise<string> {
  // Webpage-specific extraction
}

// Context that selects strategy
export async function extractContentFromUrl(url: string) {
  if (isYouTubeUrl(url)) {
    return { content: await fetchYouTubeTranscript(url), type: "youtube" };
  }
  return { content: await scrapeWebPage(url), type: "webpage" };
}
```

### Benefits
- ✅ **OCP**: Easy to add new extractors without modifying existing code
- ✅ **SRP**: Each strategy handles one type of content
- ✅ **Flexibility**: Can add PDF, Word doc extractors easily

### SOLID Principles Applied
- **OCP**: Open for extension (new strategies), closed for modification
- **SRP**: Each strategy has one responsibility
- **LSP**: Any strategy can replace another

---

## 5. Repository Pattern

### Purpose
Abstracts data access logic, providing a collection-like interface for domain objects.

### Implementation Location
- `lib/db.ts` - Database operations

### Implementation
```typescript
// Database operations abstracted from business logic
export async function storeDocument(
  content: string,
  embedding: number[],
  userId: string,
  metadata: Record<string, unknown>
): Promise<number>

export async function searchSimilarDocuments(
  embedding: number[],
  userId: string,
  limit: number
): Promise<Array<Document>>

export async function hybridSearch(
  query: string,
  embedding: number[],
  userId: string,
  limit: number
): Promise<Array<Document>>
```

### Benefits
- ✅ **SRP**: Repositories handle only data access
- ✅ **Testability**: Can mock repositories for testing
- ✅ **Flexibility**: Can switch databases without changing business logic
- ✅ **DRY**: Centralized data access patterns

### SOLID Principles Applied
- **SRP**: Repositories have one responsibility - data access
- **DIP**: Business logic depends on repository interfaces
- **OCP**: Can extend with new repositories

---

## 6. Factory Pattern

### Purpose
Creates objects without specifying the exact class of object to be created.

### Implementation Location
- `lib/services/document-service.ts` - `createDocument()` method

### Implementation
```typescript
export class DocumentService {
  createDocument(
    text: string,
    metadata: Record<string, unknown> = {}
  ): Document {
    return new Document({ text, metadata });
  }
}
```

### Benefits
- ✅ **Encapsulation**: Document creation logic is centralized
- ✅ **Flexibility**: Can add validation, transformation, or logging
- ✅ **OCP**: Can extend creation logic without changing consumers
- ✅ **Consistency**: All documents are created the same way

### SOLID Principles Applied
- **SRP**: Factory method has one responsibility
- **OCP**: Can extend creation logic without modifying consumers

---

## 7. Middleware Pattern

### Purpose
Provides a way to filter, process, or handle requests before they reach the main business logic.

### Implementation Location
- `lib/middleware/auth-middleware.ts` - Authentication middleware

### Implementation
```typescript
export interface AuthResult {
  userId: string;
  success: true;
}

export interface AuthError {
  error: NextResponse;
  success: false;
}

export async function requireAuth(): Promise<AuthCheckResult> {
  const { userId } = await auth();
  
  if (!userId) {
    return {
      success: false,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { success: true, userId };
}
```

### Usage in Routes
```typescript
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!isAuthSuccess(authResult)) return authResult.error;
  
  const { userId } = authResult;
  // Business logic...
}
```

### Benefits
- ✅ **DRY**: Eliminates duplicated auth code across 8+ routes
- ✅ **SRP**: Auth logic separated from business logic
- ✅ **Consistency**: All routes use same auth mechanism
- ✅ **Maintainability**: Auth changes made in one place

### SOLID Principles Applied
- **SRP**: Middleware has one responsibility
- **OCP**: Can extend with additional middleware
- **DRY**: Eliminates code duplication

---

## 8. Error Handler Pattern

### Purpose
Centralizes error handling and response formatting.

### Implementation Location
- `lib/utils/error-handler.ts`

### Implementation
```typescript
export class ErrorHandler {
  static createErrorResponse(error: unknown, context: string, status = 500) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`${context}:`, error);
    return NextResponse.json({ error: `${context}: ${errorMessage}` }, { status });
  }

  static badRequest(message: string): NextResponse
  static notFound(message: string): NextResponse
}
```

### Benefits
- ✅ **DRY**: Eliminates duplicated error handling
- ✅ **Consistency**: All errors formatted the same way
- ✅ **Logging**: Centralized error logging
- ✅ **Maintainability**: Error handling changes in one place

---

## Summary

### SOLID Principles Applied

✅ **Single Responsibility Principle (SRP)**
- AIClientManager: Manages only AI client lifecycle
- EmbeddingService: Handles only embedding generation
- LLMService: Handles only LLM operations
- DocumentService: Handles only document processing
- AuthMiddleware: Handles only authentication
- ErrorHandler: Handles only error formatting

✅ **Open/Closed Principle (OCP)**
- Services can be extended without modification
- New content extractors can be added without changing existing code
- New middleware can be added without changing routes

✅ **Liskov Substitution Principle (LSP)**
- Services can be swapped with alternative implementations
- Content extractors are interchangeable

✅ **Interface Segregation Principle (ISP)**
- Each service provides only needed methods
- No client depends on unused methods

✅ **Dependency Inversion Principle (DIP)**
- Services depend on abstractions (getAIClient), not concrete implementations
- Routes depend on services, not direct implementations
- High-level modules don't depend on low-level modules

### DRY Violations Eliminated

1. ✅ AI Client Initialization: Was in 3+ files, now in one place
2. ✅ Authentication Checks: Was in 8+ routes, now in middleware
3. ✅ Error Handling: Was in every route, now centralized
4. ✅ JSON Parsing from AI: Was duplicated, now in utility
5. ✅ Embedding Generation: Was duplicated, now in service
6. ✅ Document Chunking: Logic centralized in service

---

## Migration Guide

To use these patterns in routes:

```typescript
// 1. Import new utilities
import { requireAuth, isAuthSuccess } from "@/lib/middleware/auth-middleware";
import { ErrorHandler } from "@/lib/utils/error-handler";
import { embeddingService } from "@/lib/services/embedding-service";
import { llmService } from "@/lib/services/llm-service";
import { documentService } from "@/lib/services/document-service";

// 2. Apply in route
export async function POST(request: NextRequest) {
  try {
    // Auth
    const authResult = await requireAuth();
    if (!isAuthSuccess(authResult)) return authResult.error;
    const { userId } = authResult;

    // Business logic using services
    const embedding = await embeddingService.generateEmbedding(text);
    const response = await llmService.generateResponse(query, context);
    const chunks = await documentService.chunkText(text);

    return NextResponse.json({ success: true });
  } catch (error) {
    return ErrorHandler.handleRouteError(error, "Failed to process request");
  }
}
```
