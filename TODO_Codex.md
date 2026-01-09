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

---

## Real-Time Updates

[ ] Create `/stream/updates` SSE endpoint
[ ] Create UiUpdatePublisher listening for domain/application events
[ ] Push minimal `ISSUE_UPDATED` events to connected sessions

---

## Projections

[x] Create issue list projection table
[x] Create projection updater reacting to events
[x] Add repository for reading list projections

---

## Nice-to-Haves Later

[ ] Add `PhaseStatusChanged` event + endpoint
[ ] Add `GET /issues/{id}/history`
[ ] Add user module for real auth
[ ] Add comments
[ ] Add task-level granularity in dev phases
[ ] Model projects and link issues to a project

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
