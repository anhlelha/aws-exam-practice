# Agent Task: Backend Verification & Fixes for Multi-Select

## Context
The "Practice Mode" needs to support multi-select questions. The Mockup has been approved with a "Multiple Choice (Select N)" badge. We need to ensure the backend supports this.

## Objectives
1.  **Verify DB Schema:** Ensure `questions` table has `is_multiple_choice` column (boolean).
2.  **Verify Session API (GET):** Ensure `GET /api/sessions/:id` returns questions including the `is_multiple_choice` flag.
3.  **Verify Submit API (POST):** Ensure `POST /api/sessions/:id/answer` can accept an **array** of answer keys (e.g., `["A", "C"]`) and grade them correctly.

## Files to Reference
- `server/db/schema.js`
- `server/routes/sessions.js`
- `server/routes/questions.js`

## Verification Steps
- Run a curl test to create a multiple-choice question (if none exists) or manually check DB.
- Run a curl test to start a session and check the JSON response for `is_multiple_choice`.
- Run a curl test to submit multiple answers and verify the response (correct/incorrect).
