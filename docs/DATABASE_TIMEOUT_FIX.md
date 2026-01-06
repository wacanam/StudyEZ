# Database Timeout Troubleshooting Guide

## Issue Summary

The application is experiencing database query timeouts on these endpoints:

- `GET /api/documents` - Fetching documents
- `GET /api/chat-sessions` - Retrieving chat sessions  
- `GET /api/generate-tools` - Fetching flashcards and quizzes

## Root Cause

Your PostgreSQL database connection at `pg.dev.nextstep-software.com:5444` is either:

1. **Unreachable** - Network/firewall blocking the connection
2. **Overloaded** - Database server is under heavy load
3. **Misconfigured** - Connection string or credentials are incorrect
4. **Slow Network** - High latency to the remote server

## Solutions Applied

### 1. **Enhanced Connection Pool Configuration** (`lib/db.ts`)

- Added connection pool size limit: 20 connections
- Set idle connection timeout: 30 seconds
- Added connection acquisition timeout: 5 seconds
- Set query statement timeout: 30 seconds

### 2. **Query Timeout Protection** (All API routes)

- Added 20-second timeout for database queries
- Returns clear error message if queries timeout
- Prevents indefinite hanging requests

### 3. **Health Check Endpoint** (`/api/health`)

- New endpoint to diagnose database connectivity
- Tests connection and measures response times
- Returns detailed diagnostic information

## Troubleshooting Steps

### Step 1: Check Database Connectivity

```bash
# Test the health endpoint
curl http://localhost:3000/api/health
```

**Expected Response (Healthy):**

```json
{
  "status": "healthy",
  "database": {
    "connected": true,
    "responseTime": 150,
    "queryTime": 50,
    "documentCount": 42
  }
}
```

**Expected Response (Unhealthy):**

```json
{
  "status": "unhealthy",
  "database": {
    "connected": false,
    "responseTime": 5000,
    "error": "Failed to connect to database"
  }
}
```

### Step 2: Verify DATABASE_URL

Check your `.env` file:

```
DATABASE_URL="postgresql://team_next:p0stgr3s@2025@pg.dev.nextstep-software.com:5444/StudyEZ_DB"
```

**Issues to check:**

- Special characters in password need URL encoding (e.g., `@` → `%40`)
- Correct hostname and port
- Database name exists
- User credentials are correct

### Step 3: Test Network Connectivity

From your terminal:

```bash
# Test if server is reachable
ping pg.dev.nextstep-software.com

# Test port connectivity (requires telnet or nc)
telnet pg.dev.nextstep-software.com 5444
```

### Step 4: Check Server Logs

Monitor the application logs for patterns:

```bash
# Terminal where Next.js is running
# Look for timeout errors and response times
```

### Step 5: Adjust Timeout Values (if needed)

If your database is naturally slow, you can increase timeouts in `lib/db.ts`:

```typescript
// Increase from 30000ms to 60000ms (60 seconds)
statement_timeout: 60000,

// And in route handlers, change:
new Promise<never>((_, reject) =>
  setTimeout(() => reject(new Error("...")), 20000) // Change 20000 to larger value
)
```

## Quick Fixes to Try

### Option A: Use Local Database (Recommended for Development)

Set up a local PostgreSQL with pgvector:

```bash
# Install PostgreSQL locally
# Create database and enable pgvector
# Update DATABASE_URL to: postgresql://user:password@localhost:5432/StudyEZ_DB
```

### Option B: Increase Connection Pool Limits

Edit `lib/db.ts`:

```typescript
globalForPrisma.pool = new Pool({
  connectionString,
  max: 50,  // Increase from 20
  idleTimeoutMillis: 60000,  // Increase from 30000
  connectionTimeoutMillis: 10000,  // Increase from 5000
  statement_timeout: 60000,  // Increase from 30000
});
```

### Option C: Use Prisma Connection String Directly

Update `prisma.config.ts` to use connection string directly instead of env variable.

## Performance Considerations

**Current Implementation:**

- 20 concurrent connections
- 20-second query timeout
- 30-second idle connection timeout

**For Production:**

- Monitor response times
- Adjust pool size based on concurrent users
- Consider query optimization for slow queries
- Add database query caching layer

## Monitoring

Monitor these metrics:

1. **Connection Pool Usage**: `max(20) - available`
2. **Query Response Time**: Should be < 2 seconds for most queries
3. **Connection Acquisition Time**: Should be < 100ms
4. **Error Rate**: Monitor timeout vs. other errors

## Testing the Fixes

1. Restart your Next.js development server
2. Visit `http://localhost:3000/api/health` to verify connectivity
3. Try accessing the dashboard - documents, chat, and flashcards should load
4. Check browser console for any remaining errors

## Additional Resources

- [Prisma Connection Pool Documentation](https://www.prisma.io/docs/orm/overview/databases/postgresql)
- [pg (Node.js PostgreSQL client) Pool Options](https://node-postgres.com/api/pool)
- [PostgreSQL Connection Troubleshooting](https://www.postgresql.org/docs/current/libpq-envars.html)

## Need Further Help?

Check these logs:

1. **Browser Console** (`F12` → Console tab)
2. **Network Tab** (`F12` → Network tab) - Check the `/api/health` request
3. **Terminal** - Where you ran `pnpm dev`
4. **PostgreSQL Server Logs** - Check the database server logs

---

**Last Updated:** January 6, 2026
**Status:** Fixes applied and ready to test
