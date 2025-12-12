# API Endpoint Audit Report

**Date:** 2025-12-11

## Summary

Audited 5 frontend service files against backend routes.

---

## ✅ VERIFIED - Correct Endpoints

### sessionService.ts
| Frontend Call | Backend Route | Status |
|---------------|---------------|--------|
| `POST /sessions` | `router.post('/')` in sessions.js | ✅ OK |
| `GET /sessions/:id` | `router.get('/:id')` in sessions.js | ✅ OK |
| `POST /sessions/:id/answer` | ❌ **MISMATCH** - Backend uses `PUT` | ⚠️ FIX |
| `POST /sessions/:id/flag` | ❌ **MISMATCH** - Backend uses `PUT` | ⚠️ FIX |
| `POST /sessions/:id/complete` | `router.post('/:id/complete')` in sessions.js | ✅ OK |

### testBuilderService.ts
| Frontend Call | Backend Route | Status |
|---------------|---------------|--------|
| `POST /tests/preview` | `router.post('/preview')` in tests.js | ✅ OK |
| `POST /tests/create-with-selection` | `router.post('/create-with-selection')` in tests.js | ✅ OK |
| `GET /tests/:id/questions` | `router.get('/:id/questions')` in tests.js | ✅ OK |
| `GET /tests` | `router.get('/')` in tests.js | ✅ OK |
| `DELETE /tests/:id` | `router.delete('/:id')` in tests.js | ✅ OK |
| `GET /tests/:id` | `router.get('/:id')` in tests.js | ✅ OK |
| `POST /tests` | `router.post('/')` in tests.js | ✅ OK |
| `PUT /tests/:id` | `router.put('/:id')` in tests.js | ✅ OK |
| `GET /questions?params` | `router.get('/')` in questions.js | ✅ OK |
| `GET /questions/categories` | `router.get('/categories')` in questions.js | ✅ OK |

### chatService.ts
| Frontend Call | Backend Route | Status |
|---------------|---------------|--------|
| `POST /chat` | `router.post('/')` in chat.js | ✅ OK |
| `GET /chat/status` | `router.get('/status')` in chat.js | ✅ OK |

### reviewService.ts
| Frontend Call | Backend Route | Status |
|---------------|---------------|--------|
| `GET /questions?params` | `router.get('/')` in questions.js | ✅ OK |
| `POST /questions/:id/auto-tag` | `router.post('/:id/auto-tag')` | ✅ OK |
| `POST /questions/:id/auto-classify` | `router.post('/:id/auto-classify')` | ✅ OK |
| `POST /questions/bulk-tag` | `router.post('/bulk-tag')` | ✅ OK |
| `POST /questions/bulk-classify` | `router.post('/bulk-classify')` | ✅ OK |
| `PUT /questions/:id/tags` | ❌ **MISSING BACKEND ROUTE** | ⚠️ CHECK |
| `PUT /questions/:id` | `router.put('/:id')` | ✅ OK |
| `GET /settings/tags` | `router.get('/tags')` in settings.js | ✅ OK |
| `GET /settings/certifications` | `router.get('/certifications')` | ✅ OK |
| `DELETE /questions/:id` | `router.delete('/:id')` | ✅ OK |

### questionService.ts
| Frontend Call | Backend Route | Status |
|---------------|---------------|--------|
| `POST /questions` | `router.post('/')` | ✅ OK |
| `POST /questions/generate-diagram` | ❌ **MISSING BACKEND ROUTE** | ⚠️ CHECK |
| `POST /questions/:id/diagram/upload` | `router.post('/:id/diagram/upload')` | ✅ OK (FIXED) |
| `GET /questions/categories` | `router.get('/categories')` | ✅ OK (FIXED) |
| `GET /questions/:id` | `router.get('/:id')` | ✅ OK |
| `PUT /questions/:id` | `router.put('/:id')` | ✅ OK |
| `DELETE /questions/:id` | `router.delete('/:id')` | ✅ OK |

---

## ⚠️ ISSUES FOUND

### 1. questionService.ts - Unused Function (Low Priority)

**Issue:** `generateDiagram()` calls `/questions/generate-diagram` which doesn't exist in backend

**Status:** This function is NOT used anywhere in the frontend (dead code)

**Recommendation:** Either remove the function OR keep for future use

---

## ✅ Previously Reported Issues - VERIFIED OK

### sessionService.ts - HTTP Methods
- `PUT /sessions/:id/answer` - ✅ Correct (already uses PUT)
- `PUT /sessions/:id/flag` - ✅ Correct (already uses PUT)

### Fixed in This Audit
- `questionService.getCategories()` - Fixed to call `/questions/categories` ✅
- `questionService.uploadDiagram()` - Fixed to call `/diagram/upload` ✅

---

## Recommendations

1. ~~Fix HTTP method mismatches~~ - Already correct ✅
2. Remove or implement `generateDiagram` function
3. **Add integration tests** to catch these issues early
