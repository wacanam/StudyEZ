# StudyEZ

<p align="center">
  <img src="public/logo.svg" alt="StudyEZ Logo" width="200" />
</p>

<p align="center">
  <strong>AI-powered RAG platform for effective study skills.</strong>
</p>

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **RAG Framework**: [LlamaIndex](https://www.llamaindex.ai/)
- **Vector Database**: [PGVector](https://github.com/pgvector/pgvector) (PostgreSQL)
- **LLM**: [Gemini 2.5 Flash](https://ai.google.dev/)
- **ORM**: [Prisma 7](https://www.prisma.io/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with Inter font

## Features

- 📚 **Document Upload**: Upload PDF or TXT study materials
- 🔍 **RAG Queries**: Ask questions and get AI-powered answers from your materials
- 📄 **Source References**: View relevant source snippets with relevance scores
- 📋 **Activity Log**: Track upload and query activity in real-time

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

- **Font**: Inter
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
| `pnpm lint` | Run ESLint |
| `pnpm db:push` | Push Prisma schema to database |
| `pnpm db:studio` | Open Prisma Studio |

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── query/route.ts    # RAG query endpoint
│   │   └── upload/route.ts   # Document upload endpoint
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Landing page
├── lib/
│   ├── db.ts                 # Database utilities (Prisma)
│   └── rag.ts                # RAG utilities (Gemini)
├── prisma/
│   └── schema.prisma         # Database schema
├── public/
│   └── logo.svg              # StudyEZ logo
└── prisma.config.ts          # Prisma configuration
```

## License

MIT