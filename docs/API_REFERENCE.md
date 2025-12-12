# API Endpoints Reference

## Questions API (`/api/questions`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/questions` | Get all questions with filters |
| GET | `/api/questions/:id` | Get single question by ID |
| POST | `/api/questions` | Create new question |
| PUT | `/api/questions/:id` | Update question |
| DELETE | `/api/questions/:id` | Delete question |
| GET | `/api/questions/categories` | Get all categories |
| GET | `/api/questions/tags` | Get all tags |
| POST | `/api/questions/:id/auto-tag` | Auto-tag question with LLM |
| POST | `/api/questions/:id/auto-classify` | Auto-classify question with LLM |
| POST | `/api/questions/:id/diagram/upload` | Upload diagram file |
| POST | `/api/questions/:id/diagram/generate` | Generate diagram with LLM |

## Tests API (`/api/tests`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tests` | Get all tests |
| GET | `/api/tests/:id` | Get test details |
| GET | `/api/tests/:id/questions` | Get test questions |
| POST | `/api/tests` | Create test with question IDs |
| PUT | `/api/tests/:id` | Update test |
| DELETE | `/api/tests/:id` | Delete test |

## Settings API (`/api/settings`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Get all settings |
| PUT | `/api/settings` | Update settings |
| GET | `/api/settings/certifications` | Get certifications + nested categories |
| POST | `/api/settings/test-llm` | Test LLM connection |

## Sessions API (`/api/sessions`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sessions/start` | Start practice session |
| POST | `/api/sessions/:id/answer` | Submit answer |
| POST | `/api/sessions/:id/complete` | Complete session |
| GET | `/api/sessions/history` | Get session history |

## Data API (`/api/data`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/data/export` | Export database |
| POST | `/api/data/import` | Import database |

---

## Important Notes

### Categories vs Certifications
- **Certifications**: SAA-C03, SAP-C02, DVA-C02 (exam types)
- **Categories**: Design Secure, Design Resilient, etc. (exam domains within a certification)

### File Upload
- Use `/diagram/upload` NOT `/diagram`
- FormData with field name `diagram`
