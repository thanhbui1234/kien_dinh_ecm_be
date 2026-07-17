---
trigger: always_on
---

SYSTEM RULE: PRISMA DATABASE MIGRATION MANDATE
- **CRITICAL CONSTRAINT**: NEVER run `prisma db push` under any circumstances to sync database schema changes.
- **REQUIRED ACTION**: ALWAYS create and run database migrations using `prisma migrate dev` (for development) or `prisma migrate deploy` (for production) whenever there are updates to `schema.prisma`.

SYSTEM RULE: PRE-IMPLEMENTATION PROTOCOL & USER CONFIRMATION
CRITICAL MANDATE
You are STRICTLY FORBIDDEN from automatically implementing, modifying, or accepting any code changes immediately after receiving a user prompt. You MUST execute the following verification, Swagger-check, performance evaluation, logic breakdown, and confirmation protocol first.

⚡ THE FAST-TRACK EXCEPTION
Applicable Conditions: If the user's request qualifies as a Trivial Task (e.g., fixing typos/spelling in text, changing display formats, updating simple configuration files without logic, adjusting HTTP status codes, or when the total lines of code changed is < 10 lines and carries zero risk of impacting existing core workflows).

Action: The AI is permitted to BYPASS Phase 3 (no confirmation required) and proceed with execution immediately to optimize workflow speed. For all other cases, the protocol below must be strictly followed.

PHASE 1: MANDATORY PROJECT INSPECTION (LOOK BEFORE YOU LEAP)
Before responding with any implementation plan or code:

Analyze Folder Structure: Scan the project's current directory tree to understand where files belong.

Review Existing Syntax & Patterns: Check existing files to maintain consistency in coding style (e.g., NestJS DI patterns, naming conventions, formatting).

Inspect Swagger Configuration: Check how Swagger/OpenAPI is implemented in the project. Identify the required decorators (e.g., @ApiTags, @ApiOperation, @ApiResponse, @ApiProperty) to ensure new or modified APIs feature comprehensive documentation, clearly describing every field, query parameter, and response status.

Check Project Rules: Read existing CLAUDE.md or .agents/rules/ to ensure no conflicts.

Scalability & Performance Audit: Evaluate the proposed solution to ensure maximum Backend (BE) optimization. Carefully inspect scalability, database query efficiency (actively avoiding N+1 problems and missing indexes), memory consumption (preventing memory leaks), and asynchronous execution patterns to maximize throughput and performance.

Complex Logic Dissection: Identify tricky data transformations, complex conditional branching, or sensitive edge cases prone to bugs to prepare a thorough structural explanation.

PHASE 2: CLARIFICATION & DOUBLE-CHECK
If there is ANY ambiguity, missing edge case, potential conflict, or doubt in the user's request:

STOP IMMEDIATELY.

List your questions or concerns clearly to the user.

Do not assume or make execution choices on behalf of the user.

PHASE 3: THE GATEKEEPER (MANDATORY USER CONFIRMATION)
Even if the requirement is 100% clear, you MUST present a summary of your plan to the user first.

Your response MUST end with a strict hold, using this exact format:

🔍 [Summary of your understanding of the current project structure and affected files]

💡 [Brief proposed solution/implementation approach]

🧠 [Complex Logic Breakdown: Detailed, step-by-step explanation of convoluted logic, intricate algorithms, complex data flows, or special edge cases. For standard CRUD features, simply state: "Standard CRUD - No complex logic"]

🚀 [Scalability & Performance Confirmation: Detailed breakdown of BE optimization strategies, data structures, algorithms, or queries used to ensure peak performance and scalability under high concurrent user loads]

📝 [Detailed plan for updating or adding Swagger Docs for the relevant APIs/DTOs - Specific plan to update/add Swagger documentation, clearly defining requests/responses, validation rules, and error codes]

🧪 [Verification & Testing Plan: List of test scenarios, Unit Test strategies, or specific cURL/Postman commands that will be used to verify and validate edge cases immediately after the code is written]

❓ [Any lingering questions, potential risks, or open items needing clarification]

🛑 AWAITING CONFIRMATION: Please review and approve the plan above. I will NOT proceed with any code modifications or file creations until I receive explicit approval (e.g., "OK", "Proceed", "Go ahead", or specific feedback).