---
description: Create a detailed sprint plan with independent agent tasks
---

## Sprint Planning Workflow

When user asks to plan a feature/sprint, follow this structure:

### Step 1: Analyze Requirements

Read and understand the feature requirements from user input or referenced files.

### Step 2: Create Sprint Overview

Create a file at project root: `SPRINT{N}_{NAME}.md` with:
- Sprint goal summary
- High-level task breakdown
- Dependencies between tasks

### Step 3: Create/Update Mockups (REQUIRED FIRST)

**⚠️ CRITICAL: Mockups must be approved BEFORE any implementation work!**

1. **Open the main mockup file:** `mockups/index.html`
2. **Add new section(s)** for the sprint features - DO NOT create separate mockup files
3. **Include all UI elements** that will be built
4. **Request user review** of the mockup section
5. **Wait for approval** before proceeding to agent tasks

**Mockup file location:** `mockups/index.html` (single source of truth)

**Format for new sections:**
```html
<!-- ========== SPRINT {N}: {Feature Name} ========== -->
<section class="mockup-section" id="sprint-{n}-feature">
  <h2>Feature Name</h2>
  <!-- Mockup content here -->
</section>
```

### Step 4: Create Agent Task Files

Split work into 3-4 independent agents. For each agent, create a separate file:

```
SPRINT{N}_AGENT1_BACKEND.md    - Backend API changes
SPRINT{N}_AGENT2_FRONTEND.md   - Frontend/UI changes  
SPRINT{N}_AGENT3_TESTING.md    - E2E testing (runs LAST)
SPRINT{N}_AGENT4_{OTHER}.md    - Optional: Database, DevOps, etc.
```

### Step 5: Agent Task File Format

Each agent file should contain:

```markdown
# Agent {N}: {Role} - Sprint {X}

## Prerequisites
- [ ] List what must be completed before this agent starts
- [ ] e.g., "Agent 1 backend API must be deployed"

## Tasks
- [ ] Task 1 with specific details
- [ ] Task 2 with acceptance criteria
- [ ] Task 3...

## Verification
- Specific commands or tests to verify completion

## Handoff
- What to do when complete (mark file as done, notify user, etc.)
```

### Step 6: Testing Agent (ALWAYS LAST)

Agent 3 (Testing) should:
1. Wait for all other agents to complete
2. Run E2E tests on ALL features from the sprint
3. Document test results in a test report file
4. Flag any issues found for other agents to fix

### Step 7: Context Files

Before planning, read these files:
- `API_REFERENCE.md` - Current API structure
- `DEVELOPMENT_GOTCHAS.md` - Known issues to avoid
- Recent sprint files for patterns

### Example Output Structure

```
aws-exam-app/
├── SPRINT6_ANALYTICS.md           # Overview
├── SPRINT6_AGENT1_BACKEND.md      # Backend agent tasks
├── SPRINT6_AGENT2_FRONTEND.md     # Frontend agent tasks
└── SPRINT6_AGENT3_TESTING.md      # E2E testing agent tasks
```

### Key Rules

1. **Mockup first:** Create/update `mockups/index.html` and get approval BEFORE implementation
2. **Independence:** Each agent should be able to work in parallel
3. **Clear boundaries:** No overlapping responsibilities
4. **Testing last:** Testing agent waits for implementation agents
5. **Specific tasks:** Each task should be actionable and verifiable
6. **Check context:** Always read API_REFERENCE.md and DEVELOPMENT_GOTCHAS.md first
7. **Single mockup file:** All mockups go in `mockups/index.html` - NO separate files
