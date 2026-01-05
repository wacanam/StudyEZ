# StudyEZ

<p align="center">
  <img src="public/logo.png" alt="StudyEZ Logo" width="200" />
</p>

<p align="center">
  <strong>AI-powered RAG platform for effective study skills.</strong>
</p>

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **Authentication**: [Clerk](https://clerk.com) for user management and authentication
- **RAG Framework**: [LlamaIndex](https://www.llamaindex.ai/) for document chunking, indexing, and retrieval
- **Vector Database**: [PGVector](https://github.com/pgvector/pgvector) (PostgreSQL)
- **LLM**: [Gemini 2.5 Flash](https://ai.google.dev/) via Google Generative AI SDK
- **ORM**: [Prisma 7](https://www.prisma.io/)
- **Frontend**: [React 19](https://react.dev/) with [Tailwind CSS](https://tailwindcss.com/) and Inter font (via `next/font`)

## Features

- 🔐 **User Authentication**: Secure sign-in with [Clerk](https://clerk.com)
- 📚 **Document Upload**: Upload PDF or TXT study materials (private to your account)
- 🔍 **RAG Queries**: Ask questions and get AI-powered answers from your materials  
- 📄 **Source References**: View relevant source snippets with relevance scores
- 💬 **Chat History**: Persistent chat sessions saved to database
  - View previous conversations in the History sidebar
  - Continue existing chat sessions
  - Clear all chat history with one click
- 🗂️ **Flashcards & Quizzes**: Generate AI-powered study tools from your materials
- 📋 **Activity Log**: Track upload and query activity in real-time
- 🔒 **Private Libraries**: Each user has their own isolated document library

## LlamaIndex Integration

This project uses **LlamaIndex** for the core RAG pipeline:
- **Document Processing**: `Document` class for creating structured documents
- **Text Chunking**: `SentenceSplitter` for intelligent text segmentation with overlap
- **Vector Indexing**: `VectorStoreIndex` for building searchable document indexes
- **Query Engine**: Built-in query engine for semantic search and retrieval

Combined with **Gemini** for:
- **Embeddings**: `text-embedding-004` model for generating vector embeddings
- **LLM Responses**: `gemini-2.0-flash` model for generating study-focused answers

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- PostgreSQL with PGVector extension

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/wacanam/StudyEZ.git
   cd StudyEZ
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment variables**
   
   Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```

   Required variables:
   - `GOOGLE_API_KEY`: Your Google AI API key for Gemini
   - `DATABASE_URL`: PostgreSQL connection string with PGVector
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Your Clerk publishable key (get from [Clerk Dashboard](https://dashboard.clerk.com))
   - `CLERK_SECRET_KEY`: Your Clerk secret key (get from [Clerk Dashboard](https://dashboard.clerk.com))

   > **Note**: If your database password contains `@`, URL-encode it as `%40`.
   > Example: `postgresql://user:p%40ssword@host:5432/db`

4. **Push database schema**
   ```bash
   pnpm db:push
   ```

5. **Run the development server**
   ```bash
   pnpm dev
   ```

6. **Open the app**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## UI Design

- **Font**: Inter (via Next.js font optimization)
- **Color Palette**:
  - Background: `#FAF3E1`
  - Surface: `#F5E7C6`
  - Accent: `#FF6D1F`
  - Ink: `#222222`

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run TypeScript type checking |
| `pnpm db:push` | Push Prisma schema to database |
| `pnpm db:studio` | Open Prisma Studio |

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── chat-sessions/
│   │   │   ├── [id]/route.ts       # Get messages for a specific session
│   │   │   └── route.ts            # List and delete chat sessions
│   │   ├── generate-tools/route.ts # Generate flashcards and quizzes
│   │   ├── query/route.ts          # RAG query endpoint with session tracking
│   │   └── upload/route.ts         # Document upload endpoint
│   ├── components/
│   │   ├── ChatHistory.tsx         # Chat history sidebar component
│   │   ├── FlashcardViewer.tsx     # Flashcard viewer component
│   │   └── QuizViewer.tsx          # Quiz viewer component
│   ├── dashboard/page.tsx          # Main app (upload + query + history)
│   ├── globals.css                 # Global styles
│   ├── layout.tsx                  # Root layout with Inter font
│   └── page.tsx                    # Landing page with CTA
├── lib/
│   ├── db.ts                       # Database utilities (Prisma + PGVector)
│   └── rag.ts                      # LlamaIndex + Gemini RAG utilities
├── prisma/
│   └── schema.prisma               # Database schema with chat sessions
├── public/
│   └── logo.png                    # StudyEZ logo
└── prisma.config.ts                # Prisma configuration
```

## License

MIT