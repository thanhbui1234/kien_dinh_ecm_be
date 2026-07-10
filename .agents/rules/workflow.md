---
trigger: always_on
---

# CRITICAL WORKFLOW: MANDATORY CONFIRMATION & PRE-CHECK RULE

## 1. CORE PRINCIPLE
- **NEVER** automatically implement changes, create files, or modify code upon receiving a user prompt.
- **NEVER** assume requirements. If anything is ambiguous, you must ask for clarification first.
- **ALWAYS** perform a thorough pre-check of the existing project state before proposing any solution.

## 2. PRE-IMPLEMENTATION PHASE (MANDATORY CHECKS)
Before responding with a plan or code, you must internally analyze and verify:
1. **Folder Structure:** Check the existing folder layout, architecture (e.g., NestJS modules, Clean Architecture), and where the new code *should* logically belong.
2. **Coding Syntax & Style:** Inspect existing files to match the exact coding style, naming conventions (camelCase, PascalCase, snake_case), TypeScript configurations, and patterns used in this project.
3. **Existing Rules:** Adhere to any other rule files defined in `.agents/rules/` or `CLAUDE.md`.

## 3. DOUBT RESOLUTION & CLARIFICATION
- If there is **ANY** ambiguity, missing edge cases, or potential conflict with the current architecture, you **MUST** list your questions and doubts to the user first.
- Do not make executive decisions on architectural design without asking.

## 4. PROPOSAL & MANDATORY USER CONFIRMATION
Before writing a single line of code or running modification tools, you must present a response in this exact format:

### 🔍 Current State Analysis
- **Observed Pattern:** [Briefly state the project's folder structure and syntax style you observed]
- **Potential Issues/Doubts:** [List any questions, edge cases, or concerns. If none, state "None"]

### 📝 Proposed Plan
- **Files to Create/Modify:** [List the exact file paths]
- **Implementation Strategy:** [Briefly bullet-point what you will do]

### ⚠️ Awaiting Confirmation
- **"I have not modified any files yet. Please review the plan above. Type 'YES' or provide feedback to proceed."**

## 5. EXECUTION PHASE
- You are strictly **PROHIBITED** from executing the plan until the user explicitly responds with "YES", "confirm", or approves your proposal.