# Backlog

## 🔴 High Priority

### Fix Google AI SDK Integration
**Created:** 2025-12-10
**Status:** Temporarily Disabled

**Issue:**
- Code imports `@google/genai` with `GoogleGenAI` class
- This package doesn't exist on npm
- Correct package is `@google/generative-ai` with `GoogleGenerativeAI` class

**Affected Files:**
- `server/services/llmService.js`
- `server/routes/settings.js`
- `server/package.json`

**Fix Required:**
1. Update `package.json`: Add `"@google/generative-ai": "^0.21.0"`
2. Update imports: `import { GoogleGenerativeAI } from '@google/generative-ai'`
3. Update class usage: `new GoogleGenerativeAI(apiKey)` 
4. Update API calls to match new SDK methods

**Workaround:**
Google AI provider is temporarily disabled. Users can use OpenAI, Anthropic, or OpenRouter instead.

---

## 🟡 Medium Priority

(Empty)

---

## 🟢 Low Priority

(Empty)
