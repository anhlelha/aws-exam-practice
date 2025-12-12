# Agent Task: Frontend Multi-Select Implementation

## Context
Mockups updated and approved. We need to implement the Multi-Select UI in `Practice.tsx` matching the logic in `mockups/index.html`.

## Mockup Reference
- **File:** `mockups/index.html` (Sprint 5 Demo section)
- **Header:** Display "Multiple Choice (Select N)" badge next to Question Number.
- **Interaction:** Clicking an answer TOGGLES it (if `is_multiple_choice` is true).

## Objectives
1.  **Update `Question` Interface:** Ensure it has `is_multiple_choice?: boolean`.
2.  **Update `useSession` Hook (or `Practice.tsx` state):**
    - State for `selectedAnswer` should conceptually support array, or change to `selectedAnswers: string[]`.
3.  **Refactor `handleAnswerSelect`:**
    - If `question.is_multiple_choice` is true: Toggle the selected answer ID in the array.
    - Else: Replace the array with `[newAnswerId]`.
4.  **Update UI Rendering:**
    - **Header:** Show Badge if `is_multiple_choice` is true.
    - **Selection State:** Check if answer ID is in `selectedAnswers` array to apply `.selected` class.
    - **Submission:** Pass the full array to `submitAnswer`.

## Files to Edit
- `src/pages/Practice.tsx`
- `src/services/sessionService.ts` (if types need update)

## Verification
- Start a practice session.
- Find a multiple choice question.
- Verify you can select A and C.
- Verify submitting sends both.
