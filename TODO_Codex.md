# Causa — Codex Task List

This file contains small, independent tasks that Codex or developers can implement.
Each task should be worked in its own branch and submitted as a pull request.

Check a box when complete.

All code should be written in Kotlin, not Java.
Use src/main/kotlin and src/test/kotlin.

---

## Bootstrap and Scaffolding

[x] Create Spring Boot 3 + Spring Modulith multi-module project using gradle kotlinscript as a build system (see ARCHITECTURE.md)
[x] Add main application class (`CausaApplication`) to causa-web
[x] Expose health via Spring Actuator (`/actuator/health`)

---

## Event Store Foundation

[x] Create `EventStore` interface with `loadStream` + `appendToStream`
[x] Implement `PostgresEventStore` using Spring JDBC template
[x] Add `events` table SQL migration (id, aggregateId, type, payload, metadata, sequence, timestamp)
[x] Add optimistic concurrency version check
[x] Wire EventStore via `@Profile("postgres")`

---

## Domain: Issues and Phases

[x] Define Issue aggregate class
[x] Define Issue identifier value type
[x] Define Phase entity model + status enum
[x] Add `IssueCreated` and `PhaseAdded` domain events
[x] Add command handler service for creating an issue
[x] Store events via EventStore
[x] Test rebuilding Issue aggregate from event stream
[ ] Add phase kind enum (e.g., INVESTIGATION/DEVELOPMENT/ACCEPTANCE_TEST/ROLLOUT)
[ ] Add role model for responsible owner/dev/tester/rollout and tie to phases/tasks
[ ] Add derived issue status rules based on phase kinds and required phases
[ ] Add workflow template model for default phases/roles

---

## REST Endpoints (causa-web)

[x] Add OpenAPI spec. Generate stubs for rest endpoints via openapi gradle task 
[x] Create `POST /issues` endpoint calling create-issue command
[x] Create `GET /issues/{id}` using projection read model
[x] Add basic projection: issue header + phases list
[x] Switch issue reads and listing to use projection read models
[x] Add `GET /issues` with filters for owner/assignee/team member
[x] Add `GET /issues` filter for project id
[x] Add endpoints to modify issues (assign owner/assignee, add phases, add tasks to phases)
[x] Add controller tests for issue endpoints and filters
[x] Add actuator endpoint for projection management (rebuild)
[ ] Add endpoints to update phase status and task status
[ ] Add `GET /issues/{id}/history` endpoint (projection-backed)
[ ] Add per-user work view endpoint (`GET /me/work`)
[ ] Add endpoints for phase detail view and phase checklist/config

---

## Real-Time Updates

[x] Create `/stream/updates` SSE endpoint
[x] Create UiUpdatePublisher listening for domain/application events
[x] Push minimal `ISSUE_UPDATED` events to connected sessions
[ ] Emit SSE events for `PHASE_STATUS_CHANGED` and `TASK_STATUS_CHANGED`
[ ] Emit SSE updates for tester pass/fail and rollout milestones

---

## Projections

[x] Create issue list projection table
[x] Create projection updater reacting to events
[x] Add repository for reading list projections
[x] Add projection rebuild job for existing event streams
[x] Ensure projection updates have retry policies
[ ] Add fallback strategy for projection rebuild failures (outbox/async queue)
[ ] Add issue history projection (human-readable changelog)
[ ] Add per-user work projections (tasks/phases by assignee role)
[ ] Add phase detail projection with checklist/config data

---

## Nice-to-Haves Later

[ ] Add `PhaseStatusChanged` event + endpoint
[ ] Add `TaskStatusChanged` event + endpoint
[ ] Add `PhaseRemoved`/`PhaseCanceled` events
[ ] Add `IssueClosed` event with validation rules
[ ] Add `GET /issues/{id}/history`
[ ] Add user module for real auth
[ ] Add comments
[ ] Add task-level granularity in dev phases
[ ] Model projects and link issues to a project
[ ] Add workflow template management UI (if building frontend)
[ ] Add activity stream view fed by history projection

---

## Future Backend Options (Profiles)

[ ] Add empty Axon adapter (no logic yet)
[ ] Add empty EventStoreDB adapter (no logic yet)

---

## Notes for Codex

- **Follow ARCHITECTURE.md** at all times
- Use meaningful packages and Java types
- Use constructor-based dependency injection
- Write complete code, not pseudocode
- Prefer small commits and PRs
- Ask for tests if applicable
