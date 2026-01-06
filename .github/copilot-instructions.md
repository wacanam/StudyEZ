# StudyEZ - GitHub Copilot Instructions

## Project Overview
StudyEZ is an AI-powered RAG (Retrieval-Augmented Generation) platform for effective study skills. It's built with Next.js 16, TypeScript, Prisma, and uses Google's Gemini AI for embeddings and LLM operations.

## Architecture Principles

### SOLID Principles
This codebase strictly follows SOLID principles:

1. **Single Responsibility Principle (SRP)**
   - Each class/module has ONE clear responsibility
   - Services handle specific domains (embedding, LLM, documents)
   - Middleware handles specific cross-cutting concerns (auth, errors)

2. **Open/Closed Principle (OCP)**
   - Services are open for extension, closed for modification
   - New content extractors can be added without changing existing code
   - New middleware can be added without changing route handlers

3. **Liskov Substitution Principle (LSP)**
   - Service implementations can be swapped with alternatives
   - Interfaces are honored throughout

4. **Interface Segregation Principle (ISP)**
   - Services provide only the methods clients need
   - No fat interfaces

5. **Dependency Inversion Principle (DIP)**
   - High-level modules depend on abstractions (services), not implementations
   - Routes depend on service interfaces, not concrete AI client implementations

### DRY (Don't Repeat Yourself)
- **NEVER** duplicate code across files
- Use centralized utilities for common patterns
- Extract shared logic into services or utilities

## Code Organization

### Directory Structure
```
lib/
  ├── ai-client.ts              # Singleton AI client (Gemini)
  ├── db.ts                     # Database operations & queries
  ├── rag.ts                    # RAG operations (delegates to services)
  ├── content-extractors.ts    # Content extraction strategies
  ├── middleware/
  │   └── auth-middleware.ts   # Authentication middleware
  ├── services/
  │   ├── embedding-service.ts # Embedding generation
  │   ├── llm-service.ts       # LLM operations
  │   └── document-service.ts  # Document processing
  └── utils/
      ├── error-handler.ts     # Centralized error handling
      └── ai-response-parser.ts # AI response parsing

app/api/                       # Next.js API routes
  ├── query/route.ts          # RAG query endpoint
  ├── upload/route.ts         # File upload
  ├── upload/link/route.ts    # URL upload
  ├── generate-tools/route.ts # Flashcards/quizzes
  ├── chat-sessions/          # Chat history
  └── documents/              # Document management
```

## Coding Standards

### TypeScript
- **Always** use TypeScript, never plain JavaScript
- **Always** define explicit types for function parameters and return values
- Use interfaces for data structures
- Enable strict mode (already configured)

### Services Pattern
When creating new AI-powered features:

1. **Use existing services first**
   ```typescript
   import { embeddingService } from "@/lib/services/embedding-service";
   import { llmService } from "@/lib/services/llm-service";
   import { documentService } from "@/lib/services/document-service";
   ```

2. **If new service needed**, follow this template:
   ```typescript
   import { getAIClient } from "../ai-client";
   
   export class NewService {
     private readonly modelName = "model-name";
     
     async operation(params: ParamType): Promise<ReturnType> {
       const client = getAIClient();
       // Implementation
     }
   }
   
   // Export singleton
   export const newService = new NewService();
   ```

### API Routes Pattern
**ALWAYS** follow this structure for API routes:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthSuccess } from "@/lib/middleware/auth-middleware";
import { ErrorHandler } from "@/lib/utils/error-handler";
import { embeddingService } from "@/lib/services/embedding-service";
// ... other imports

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const authResult = await requireAuth();
    if (!isAuthSuccess(authResult)) {
      return authResult.error;
    }
    const { userId } = authResult;

    // 2. Input validation
    const body = await request.json();
    const { requiredParam } = body;
    
    if (!requiredParam) {
      return ErrorHandler.badRequest("Required parameter missing");
    }

    // 3. Business logic using services
    const result = await embeddingService.generateEmbedding(text);
    
    // 4. Return success response
    return NextResponse.json({ success: true, result });
    
  } catch (error) {
    // 5. Error handling
    return ErrorHandler.handleRouteError(error, "Context description");
  }
}
```

### Authentication
- **NEVER** implement auth checks directly in routes
- **ALWAYS** use the auth middleware:
  ```typescript
  const authResult = await requireAuth();
  if (!isAuthSuccess(authResult)) return authResult.error;
  const { userId } = authResult;
  ```

### Error Handling
- **NEVER** write try-catch with manual error formatting
- **ALWAYS** use ErrorHandler:
  ```typescript
  // For bad requests
  return ErrorHandler.badRequest("Message");
  
  // For not found
  return ErrorHandler.notFound("Message");
  
  // For server errors in catch blocks
  return ErrorHandler.handleRouteError(error, "Context");
  ```

### AI Operations

#### Embeddings
```typescript
import { embeddingService } from "@/lib/services/embedding-service";

// Single embedding
const embedding = await embeddingService.generateEmbedding(text);

// Multiple embeddings (concurrent)
const embeddings = await embeddingService.generateEmbeddings(texts);
```

#### LLM Operations
```typescript
import { llmService } from "@/lib/services/llm-service";

// Generate response with context
const answer = await llmService.generateResponse(query, contextArray);

// Rerank documents
const ranked = await llmService.rerankDocuments(query, documents, topK);

// Structured JSON response
const data = await llmService.generateStructuredResponse<MyType>(
  prompt,
  fallbackValue
);
```

#### Document Processing
```typescript
import { documentService } from "@/lib/services/document-service";

// Chunk text
const chunks = await documentService.chunkText(text);

// Create document
const doc = documentService.createDocument(text, metadata);

// Build index
const index = await documentService.buildIndexFromDocuments(docs);
```

### Database Operations
- Use Prisma for typed database operations
- Use `getPrisma()` to get the client instance
- For vector operations, use functions in `lib/db.ts`:
  - `storeDocument()` - Store document with embedding
  - `searchSimilarDocuments()` - Vector similarity search
  - `hybridSearch()` - Hybrid vector + full-text search

### AI Response Parsing
When parsing JSON from AI responses:
```typescript
import { AIResponseParser } from "@/lib/utils/ai-response-parser";

// Extract JSON (throws on error)
const data = AIResponseParser.extractJSON<MyType>(responseText);

// Safe parse with fallback
const data = AIResponseParser.safeParseJSON<MyType>(responseText, fallback);
```

## Design Patterns Used

### Singleton Pattern
- **AI Client**: Single instance managed by `AIClientManager`
- **Services**: Exported as singletons (`embeddingService`, `llmService`, etc.)
- **Database Client**: Single Prisma client via `getPrisma()`

### Service Layer Pattern
- Business logic is in services, not routes
- Services are reusable across multiple routes
- Services depend on abstractions (AI client), not concrete implementations

### Middleware Pattern
- Cross-cutting concerns (auth, error handling) are in middleware
- Keeps route handlers focused on business logic

### Repository Pattern
- Database operations are abstracted in `lib/db.ts`
- Business logic doesn't know about SQL/database details

### Strategy Pattern
- Content extraction uses different strategies for YouTube, webpages, etc.
- Easy to add new extraction strategies

### Factory Pattern
- `documentService.createDocument()` creates Document objects
- Centralizes creation logic

## Common Tasks

### Adding a New API Endpoint
1. Create route file in `app/api/your-endpoint/route.ts`
2. Import required middleware and services
3. Follow the API route pattern (auth → validation → business logic → response)
4. Use ErrorHandler for all errors
5. Test with TypeScript compilation: `npm run lint`

### Adding a New AI Operation
1. Determine if it fits in existing service (embedding, LLM, document)
2. If yes, add method to existing service
3. If no, create new service following the service pattern
4. Export singleton instance
5. Update `lib/rag.ts` if needed for backward compatibility

### Adding a New Content Extractor
1. Add extraction function to `lib/content-extractors.ts`
2. Add detection function (like `isYouTubeUrl`)
3. Update `extractContentFromUrl` to use new strategy
4. Follow existing pattern for error handling

## Testing Guidelines
- TypeScript linting: `npm run lint`
- Build: `npm run build`
- The app prioritizes type safety and compilation checks
- No unit tests currently; add them following Jest/Vitest conventions if needed

## Environment Variables Required
- `GOOGLE_API_KEY` - For Gemini AI
- `DATABASE_URL` - PostgreSQL with PGVector
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk auth
- `CLERK_SECRET_KEY` - Clerk auth

## Dependencies
- **AI/ML**: `@google/generative-ai`, `llamaindex`
- **Database**: `@prisma/client`, `pg`, `@prisma/adapter-pg`
- **Auth**: `@clerk/nextjs`
- **Framework**: `next`, `react`, `react-dom`
- **Content Extraction**: `cheerio`, `youtube-transcript`

## Anti-Patterns to Avoid

❌ **DON'T**:
- Create new AI client instances in routes or services
- Duplicate auth checks across routes
- Write manual try-catch with custom error formatting
- Put business logic directly in route handlers
- Access environment variables directly (except in client manager)
- Duplicate JSON parsing logic for AI responses
- Create services without exporting singleton instances

✅ **DO**:
- Use `getAIClient()` for AI operations
- Use `requireAuth()` middleware for authentication
- Use `ErrorHandler` for all error responses
- Put business logic in services
- Use existing utilities and services
- Follow the established patterns
- Write clean, typed, maintainable code

## Performance Considerations
- Use `Promise.all()` for concurrent operations when possible
- Services already implement efficient patterns
- Database queries use appropriate indexes (vector, full-text)
- Embeddings are cached at database level

## Security Notes
- All routes MUST use authentication middleware
- Input validation is required before processing
- SQL injection protection via Prisma's parameterized queries
- User data isolation enforced via `userId` checks
- No sensitive data in error messages

## Documentation
- All major design patterns are documented in `docs/DESIGN_PATTERNS.md`
- Code comments should explain "why", not "what"
- Complex algorithms should have explanatory comments
- Public functions should have JSDoc comments

## Future Extensibility
When extending this codebase:
1. Follow SOLID principles strictly
2. Add new services for new domains
3. Keep services focused and single-purpose
4. Maintain backward compatibility in `lib/rag.ts` if needed
5. Document new patterns in `docs/DESIGN_PATTERNS.md`
6. Update this file with new conventions

---

## Quick Reference

**Get AI Client**: `getAIClient()`  
**Get Database**: `getPrisma()`  
**Auth**: `requireAuth()` + `isAuthSuccess()`  
**Errors**: `ErrorHandler.badRequest()`, `.notFound()`, `.handleRouteError()`  
**Embeddings**: `embeddingService.generateEmbedding()`  
**LLM**: `llmService.generateResponse()`  
**Documents**: `documentService.chunkText()`  
**Parse AI JSON**: `AIResponseParser.extractJSON()`  

---

Remember: **Quality over speed, maintainability over shortcuts, SOLID principles over quick fixes.**
