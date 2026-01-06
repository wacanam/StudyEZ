# Quick Reference - Database Timeout Fixes

## What Was Wrong?

Database queries were timing out because:

1. No timeout limits on queries
2. No connection pool configuration
3. Queries could hang indefinitely

## What Got Fixed?

1. ✅ Added 30-second database query timeout
2. ✅ Configured connection pool (max 20 connections)
3. ✅ Added application-level 20-second timeout protection
4. ✅ Created health check endpoint
5. ✅ Added better error messages

## How to Test

### Test 1: Health Check

```bash
curl http://localhost:3000/api/health
```

✅ **Pass**: Returns `"status": "healthy"` with response time
❌ **Fail**: Returns `"status": "unhealthy"` with error message

### Test 2: Load Documents

Visit dashboard and check if documents load within 2 seconds
✅ **Pass**: Documents appear immediately
❌ **Fail**: Still see "Failed to fetch documents" error

### Test 3: Load Chat Sessions

Visit dashboard and check if chat history loads
✅ **Pass**: Chat sessions appear in sidebar
❌ **Fail**: "Failed to retrieve chat sessions" error

### Test 4: Generate Study Tools

Enter a topic and click "Generate"
✅ **Pass**: Flashcards/quizzes generate successfully
❌ **Fail**: "Generation error" appears

## If Still Having Issues

### Check 1: Database Connection

Is your PostgreSQL server running at `pg.dev.nextstep-software.com:5444`?

```bash
# Check if server is reachable
ping pg.dev.nextstep-software.com

# Check credentials in .env
cat .env | grep DATABASE_URL
```

### Check 2: Increase Timeout (Optional)

If database is legitimately slow:

1. Open `lib/db.ts`
2. Change `statement_timeout: 30000` to `60000` (or higher)
3. Change `20000` to `60000` in route timeout wrappers
4. Restart dev server

### Check 3: Use Local Database (Recommended)

For faster development without network issues:

1. Install PostgreSQL locally
2. Create local database
3. Update `DATABASE_URL` in `.env`
4. Run `pnpm db:migrate`

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Health Check | < 200ms | TBD |
| Document Load | < 2s | TBD |
| Chat Sessions | < 2s | TBD |
| Flashcard Gen | < 30s | TBD |

## Key Endpoints

| Endpoint | Purpose | Timeout |
|----------|---------|---------|
| `/api/health` | Check DB connectivity | 5s (connection) + 30s (query) |
| `/api/documents` | List documents | 20s |
| `/api/chat-sessions` | List chat history | 20s |
| `/api/generate-tools` | Generate flashcards/quizzes | 20s |

## Emergency Measures

If database is completely down:

1. **Restart services**

   ```bash
   # Restart Next.js
   pnpm dev
   ```

2. **Clear connection pool**
   - Stop the dev server
   - Wait 30 seconds
   - Restart dev server

3. **Use fallback database**
   - Have a backup PostgreSQL instance ready
   - Quickly update DATABASE_URL
   - Restart dev server

## Monitoring Commands

```bash
# Watch database response times in dev server logs
# Look for slow query warnings

# Monitor connection pool usage
# Check how many connections are active

# Test specific route
curl -X GET http://localhost:3000/api/documents \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Success Criteria

All of these should work:

- [ ] Health check returns `"healthy"` status
- [ ] Documents load in < 2 seconds
- [ ] Chat sessions load in < 2 seconds
- [ ] Flashcards generate without timeout
- [ ] No "Operation has timed out" errors
- [ ] Dashboard loads quickly

---

**See Also:**

- `docs/DATABASE_TIMEOUT_FIX.md` - Detailed troubleshooting
- `TIMEOUT_FIX_SUMMARY.md` - Complete change summary
- `.env` - Database connection configuration
