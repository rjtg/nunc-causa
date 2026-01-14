# Causa — Codex Task List

This file contains small, independent tasks that Codex or developers can implement.
Each task should be worked in its own branch and submitted as a pull request.

Check a box when complete.

All code should be written in Kotlin, not Java.
Use src/main/kotlin and src/test/kotlin.

---

## Priority 0 — Correctness and Safety

[ ] Enforce authorization + membership boundaries (View/Act/Admin)
    - Add org/team/project membership tables and entities
    - Add policy service for project membership and role checks
    - Apply `@PreAuthorize` to issue/phase/task endpoints
    - Scope repository queries by project membership
    - Block cross-project list/search filters that bypass membership (ownerId/memberId must be scoped)
[x] Add dev auth/JWT/OAuth2 stub for local API usage
    - Configure a minimal authentication provider
    - Update docs for local auth setup
[x] Add admin endpoints or seed data for org/team/project/membership management
    - Create minimal CRUD endpoints for memberships
    - Add dev seed data or migrations for local use
[x] Make `projectId` required for issue creation or define default project behavior
    - Align API spec with policy enforcement
[x] Replace in-memory issue filtering with repository queries
    - Add repository methods for owner/assignee/member/project filters
    - Add indexes to support those filters
[x] Replace in-memory work/search queries with repository-backed queries
    - Add query methods for per-user work queues
    - Add search queries scoped by project membership
[x] Implement derived issue status (no direct status writes)
    - Add phase kind enum and required phase rules
    - Derive issue status from phase states and required phases
    - Remove direct status setting where possible
    - Add tests covering transitions and required phases
[x] Replace entity-backed API responses with read models
    - Add read-model DTOs for issue list and issue detail
    - Map via repository projections or query models
    - Avoid lazy-loading in controllers
[x] Add action capability metadata to read models
    - Compute allowed actions based on permissions + resource state
    - Include reasons for disabled actions
    - Add tests for capability evaluation
[x] Secure SSE updates and scope them to the authenticated user
    - Require auth for `/stream/updates`
    - Filter update events by membership/visibility
[x] Add `/issues/{id}/history` with activity feed + audit trail
    - Define activity feed storage model
    - Keep audit trail (Envers) separate from feed
    - Add endpoint tests
[x] Persist comments (no in-memory store)
    - Add comment entity + repository
    - Add endpoints for list/create backed by DB
    - Add tests for persistence and permissions
[x] Scope `/me/work` to the authenticated user
    - Read user ID from security context
    - Remove hardcoded fallback user
[x] Implement team/org membership inheritance rules
    - Resolve nested team memberships
    - Apply inheritance to access policy checks

---

## Priority 1 — Core Workflow Coverage

[ ] Add endpoints to update phase status and task status
    - Validate phase/task ownership and required transitions
    - Emit `PHASE_STATUS_CHANGED` and `TASK_STATUS_CHANGED` SSE events
    - Add tests for success and forbidden transitions
[x] Validate workflow actions (`close`, `fail`, `reopen`)
    - Return 409 on invalid transitions
    - Ensure issue status derives from phase state after actions
[ ] Enforce derived issue status consistency
    - Prevent direct writes outside service path
    - Add tests to detect drift
    - Reject phase/task status updates that violate workflow rules
[ ] Add `/issues/{id}/actions` and `/issues/{id}/phases/{phaseId}/actions`
    - Expose allowed actions/possible transitions
    - Include reasons for disallowed actions
[x] Add per-user work view endpoint (`GET /me/work`)
    - Implement query model for assigned tasks/phases
    - Apply permission filters
[ ] Add workflow template model for default phases/roles
    - Support core phases + optional blocks
    - Allow per-issue edits with diff

---

## Priority 2 — Persistence and Observability

[ ] Add Hibernate Search indexes for issues, phases, and tasks
    - Define index mappings
    - Add search queries for list view
[x] Add activity feed storage separate from audit trail
[ ] Implement audit trail entries in `/issues/{id}/history`
    - Map Envers revisions to API `AuditEntry`
    - Add tests covering audit responses
[ ] Keep Liquibase changelogs in sync with entity changes
[ ] Harden enum parsing for phase kinds/statuses in mappers
    - Tolerate unknown values with safe defaults
[ ] Re-enable SpotBugs for tests with targeted filters
    - Reduce global excludes
    - Add test-specific exclude rules if needed

---

## Priority 3 — Security and Identity Expansion

[ ] Add SSO-compatible identity links for users
    - Add `user_identities` table
    - Map external identities to `user_id`
[ ] Add deletion lifecycle (archive → trash → delete)
    - Define state model and retention policies
    - Add endpoints and tests

---

## Priority 4 — UX Enhancements (Later)

[ ] Add comments/discussion threads
[ ] Add phase detail view and phase checklist/config endpoints
[ ] Add task-level granularity in dev phases
[ ] Add workflow template management UI (if building frontend)
[ ] Add activity stream view fed by activity feed model
[ ] Add CLI client (Rust + clap)
    - Generate OpenAPI client bindings
    - Support login and basic issue workflows
[ ] Start Web UI (Next.js)
    - Create `ui/` app with App Router + TypeScript
    - Generate OpenAPI client in shared package
    - Implement auth stub screen (token/session)
    - Issue list, issue detail, and My Work screens
    - Add polling with ETags (SSE later)
[ ] Produce UI wireframes
    - Define information architecture and core navigation
    - Draft wireframes for Issue list, Issue detail, My Work, and Admin setup
    - Validate with workflow/role perspectives
[ ] Integrate UI build into Gradle packaging
    - Run UI build via Gradle (Node plugin)
    - Copy built assets into Spring `resources/static`
    - Ensure `./gradlew build` produces a single runnable artifact
[ ] AI assistance via Spring AI (future ideation)
    - Summarize issues and phases for status updates
    - Suggest next actions based on workflow state
    - Cluster similar issues and recommend related work
    - Draft comment replies or release notes for owners

---

## Completed / Baseline

[x] Create Spring Boot 3 + Spring Modulith multi-module project using gradle kotlinscript as a build system (see ARCHITECTURE.md)
[x] Add main application class (`CausaApplication`) to causa-web
[x] Expose health via Spring Actuator (`/actuator/health`)
[x] Define Issue aggregate class
[ ] Define Issue identifier value type
[x] Define Phase entity model + status enum
[x] Replace event-sourced commands with CRUD services for issue lifecycle
[x] Add command handler service for creating an issue
[x] Add Envers audit annotations for issue/phase/task entities
[x] Add OpenAPI spec. Generate stubs for rest endpoints via openapi gradle task
[x] Create `POST /issues` endpoint calling create-issue command
[x] Add `GET /issues` with filters for owner/assignee/team member
[x] Add `GET /issues` filter for project id
[x] Add endpoints to modify issues (assign owner/assignee, add phases, add tasks to phases)
[x] Add controller tests for issue endpoints and filters
[x] Create `/stream/updates` SSE endpoint
[x] Create UiUpdatePublisher listening for domain/application events
[x] Push minimal `ISSUE_UPDATED` events to connected sessions

---

## Notes for Codex

- **Follow ARCHITECTURE.md** at all times
- Use meaningful packages and Java types
- Use constructor-based dependency injection
- Write complete code, not pseudocode
- Prefer small commits and PRs
- Ask for tests if applicable
