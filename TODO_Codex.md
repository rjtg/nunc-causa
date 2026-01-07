# Causa — Codex Task List

This file contains small, independent tasks that Codex or developers can implement.
Each task should be worked in its own branch and submitted as a pull request.

Check a box when complete.

All code should be written in Kotlin, not Java.
Use src/main/kotlin and src/test/kotlin.

---

## Bootstrap and Scaffolding

[ ] Create Spring Boot 3 + Spring Modulith multi-module project using gradle kotlinscript as a build system (see ARCHITECTURE.md)
[ ] Add main application class (`CausaApplication`) to causa-web
[ ] Add `/health` endpoint returning `{ "status": "ok" }`

---

## Event Store Foundation

[ ] Create `EventStore` interface with `loadStream` + `appendToStream`
[ ] Implement `PostgresEventStore` using Spring JDBC template
[ ] Add `events` table SQL migration (id, aggregateId, type, payload, metadata, sequence, timestamp)
[ ] Add optimistic concurrency version check
[ ] Wire EventStore via `@Profile("dev")`

---

## Domain: Issues and Phases

[ ] Define Issue aggregate class
[ ] Define Issue identifier value type
[ ] Define Phase entity model + status enum
[ ] Add `IssueCreated` and `PhaseAdded` domain events
[ ] Add command handler service for creating an issue
[ ] Store events via EventStore
[ ] Test rebuilding Issue aggregate from event stream

---

## REST Endpoints (causa-web)

[ ] Create `POST /issues` endpoint calling create-issue command
[ ] Create `GET /issues/{id}` using projection read model
[ ] Add basic projection: issue header + phases list
[ ] Add OpenAPI / Swagger doc generation

---

## Real-Time Updates

[ ] Create `/stream/updates` SSE endpoint
[ ] Create UiUpdatePublisher listening for domain/application events
[ ] Push minimal `ISSUE_UPDATED` events to connected sessions

---

## Projections

[ ] Create issue list projection table
[ ] Create projection updater reacting to events
[ ] Add repository for reading list projections

---

## Nice-to-Haves Later

[ ] Add `PhaseStatusChanged` event + endpoint
[ ] Add `GET /issues/{id}/history`
[ ] Add user module for real auth
[ ] Add comments
[ ] Add task-level granularity in dev phases

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

