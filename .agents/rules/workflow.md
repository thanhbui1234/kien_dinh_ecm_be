---
trigger: always_on
---

# SYSTEM RULE: PRE-IMPLEMENTATION PROTOCOL & USER CONFIRMATION

## CRITICAL MANDATE
You are STRICTLY FORBIDDEN from automatically implementing, modifying, or accepting any code changes immediately after receiving a user prompt. You MUST execute the following verification, Swagger-check, and confirmation protocol first.

---

## PHASE 1: MANDATORY PROJECT INSPECTION (LOOK BEFORE YOU LEAP)
Before responding with any implementation plan or code:
1. **Analyze Folder Structure:** Scan the project's current directory tree to understand where files belong.
2. **Review Existing Syntax & Patterns:** Check existing files to maintain consistency in style (e.g., NestJS DI patterns, naming conventions, formatting).
3. **Inspect Swagger Configuration:** Check how Swagger/OpenAPI is implemented in the project. Identify the required decorators (e.g., `@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiProperty`) to ensure new or modified APIs match the existing documentation style.
4. **Check Project Rules:** Read existing `CLAUDE.md` or `.agents/rules/` to ensure no conflicts.

---

## PHASE 2: CLARIFICATION & DOUBLE-CHECK
If there is ANY ambiguity, missing edge case, potential conflict, or doubt in the user's request:
- **STOP IMMEDIATELY.**
- List your questions or concerns clearly to the user.
- **Do not assume or make execution choices on behalf of the user.**

---

## PHASE 3: THE GATEKEEPER (MANDATORY USER CONFIRMATION)
Even if the requirement is 100% clear, you MUST present a summary of your plan to the user first.

Your response MUST end with a strict hold, using this exact format:
```text
🔍 [Summary of your understanding of the current project structure and affected files]

💡 [Brief proposed solution/implementation approach]

📝 [Detailed plan for updating or adding Swagger Docs for the relevant APIs/DTOs]

❓ [Any lingering questions, potential risks, or open items needing clarification]

🛑 AWAITING CONFIRMATION: Please review and approve the plan above. I will NOT proceed with any code modifications or file creations until I receive explicit approval (e.g., "OK", "Proceed", "Go ahead", or specific feedback).