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

## Domain: Issues and Phases

[x] Define Issue aggregate class
[x] Define Issue identifier value type
[x] Define Phase entity model + status enum
[x] Replace event-sourced commands with CRUD services for issue lifecycle
[x] Add command handler service for creating an issue
[ ] Add Envers audit annotations for issue/phase/task entities
[ ] Add phase kind enum (e.g., INVESTIGATION/DEVELOPMENT/ACCEPTANCE_TEST/ROLLOUT)
[ ] Add role capability model (permissions + queue types) and tie to phases/tasks
[ ] Add derived issue status rules based on phase kinds and required phases
[ ] Add workflow template model for default phases/roles

---

## REST Endpoints (causa-web)

[x] Add OpenAPI spec. Generate stubs for rest endpoints via openapi gradle task 
[x] Create `POST /issues` endpoint calling create-issue command
[x] Replace projection-backed reads with JPA read models
[x] Add `GET /issues` with filters for owner/assignee/team member
[x] Add `GET /issues` filter for project id
[x] Add endpoints to modify issues (assign owner/assignee, add phases, add tasks to phases)
[x] Add controller tests for issue endpoints and filters
[x] Remove/replace projection management endpoints for CRUD persistence
[ ] Add endpoints to update phase status and task status
[ ] Add `GET /issues/{id}/history` endpoint (activity feed + audit trail)
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

## Nice-to-Haves Later

[ ] Add phase status change endpoint with validation rules
[ ] Add task status change endpoint with validation rules
[ ] Add phase remove/cancel actions with validation rules
[ ] Add issue close action with validation rules
[ ] Add `GET /issues/{id}/history`
[ ] Add user module for real auth
[ ] Add comments/discussion threads
[ ] Add task-level granularity in dev phases
[ ] Model projects and link issues to a project
[ ] Add workflow template management UI (if building frontend)
[ ] Add activity stream view fed by activity feed model

---

## Persistence

[ ] Rework current CQRS/event sourcing into Hibernate Envers CRUD model
[ ] Add Hibernate Search indexes for issues, phases, and tasks
[ ] Replace event-store reads/writes with JPA repositories
[x] Remove event store module and related migrations
[x] Remove event-sourced commands/events in issues module
[x] Remove projection rebuild endpoints and SSE events tied to event sourcing
[ ] Keep Liquibase changelogs in sync with entity changes
[ ] Add activity feed storage separate from audit trail
[ ] Add deletion lifecycle (archive → trash → delete)
[ ] Add org/team/project membership tables and enforcement
[ ] Add permission layers (View/Act/Admin) with policy service
[ ] Add SSO-compatible identity links for users

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
