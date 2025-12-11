---
description: Before making backend or deployment changes
---

## Pre-Work Checklist

Before making changes to:
- Backend API routes (`server/routes/`)
- Frontend services (`src/services/`)
- Deployment or sync scripts (`scripts/`)

**MUST read these context files first:**

1. Read `API_REFERENCE.md` - Check endpoint documentation
2. Read `DEVELOPMENT_GOTCHAS.md` - Review common mistakes to avoid

## Key Gotchas to Remember

1. **File paths:** Use `path.join(__dirname, ...)` not relative paths
2. **ES Modules:** `__dirname` not available - use `fileURLToPath(import.meta.url)`
3. **Categories vs Certifications:** Different endpoints
4. **Sync scripts:** Always sync BOTH database AND diagrams
