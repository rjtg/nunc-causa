# Causa Architecture

Causa is a modular issue resolution system inspired by 8D and similar structured
problem-solving processes. The system tracks issues through multiple flexible phases, provides
role-specific responsibilities, and maintains a complete audit trail.

---

## High-Level Concepts

### Domain Idea
- Issues represent engineering or problem-solving efforts.
- Each issue consists of one or more **phases** (e.g., Investigation, Proposed Solution,
  Development, Testing, Rollout).
- Each phase has:
  - A specific role or assignee
  - Its own state ("NOT_STARTED", "IN_PROGRESS", "DONE", etc.)
- Issues progress to completion only when all required phases are done.
- One person is always the **responsible owner** of the issue.

### Core Principles
- State transitions follow a **workflow state machine** with defined transitions and requirements.
- **Automation is optional**: per-issue opt-in controls whether transitions are automatic or manual.
- **Modular monolith** using Spring Modulith.
- **REST** is used for external interaction (OpenAPI documented).
- **SSE (Server-Sent Events)** is optional; default to polling with ETags and add SSE only where needed.
- Persistence is **pluggable** so storage can evolve.

---

## Technology Stack

Implementation language: Kotlin
- Use Kotlin data classes for entities and read models
- Use Kotlin classes for aggregates and services
- Use constructor-based injection

### Kotlin / Spring
- Kotlin (JVM 21)
- Spring Boot 3.x
- Spring Modulith (for module enforcement + event publication)
- Spring Web (REST + SSE)
- Spring Security (enabled for actuator management endpoints)
- Spring Data JDBC (initial persistence)

### Persistence and Data
- Hibernate ORM with Envers for auditing and Hibernate Search for full-text indexing
- Postgres remains the primary datastore
- CQRS/event sourcing are being phased out in favor of CRUD + audit history

### Frontend Integration
- REST API for all read/write operations
- SSE endpoint for realtime updates
- UI determines how to patch state locally

---

## Modules
* causa-issues → Issue aggregate, phase model, commands, domain events
* causa-workflows → Phase templates, optional configuration logic
* causa-reporting → Projections and read models (issue lists, history views)
* causa-users → User and role models (simple for now)
* causa-eventstore → EventStore interface + Postgres implementation
* causa-web → REST controllers, SSE endpoint, main app bootstrap


Each module should:
- expose public API via services or events
- encapsulate internal logic
- react to Spring AppliationEvents from other modules

---

## Workflow Templates
- Templates are composable: core phases (Analysis / Dev / Test / Rollout) plus optional blocks
- Per-issue edits are allowed; store a clear diff from the template
- Default phases should be enable/disable first; full editor is a later feature
- Validate transitions (no unreachable phases, no cycles unless intentional)
- Require assignees for actionable phases
- Provide a preview of what each role will see

---

## Roles and Capabilities
- Roles are modeled as capabilities (permissions + queue types), not fixed personas
- Default UI lanes map to common capabilities but are configurable per organization

---

## Ownership Model
- One primary owner per issue
- Optional delegate/secondary owner
- On-call assignment group
- Explicit handover action with reason logged

---

## Notifications (Minimal)
- Inbox notifications only for: assignments, phase ready, fail/reopen, mention
- Optional daily digest
- Escalation rules come later

---

## Audit and Search

### Audit History
- Envers captures entity revisions for issue/phase/task history
- History views are derived from audit tables

### Activity Feed
- Domain-meaningful activity feed derived from application events (separate from audit trail)

### Search Indexing
- Hibernate Search provides full-text search across issues, phases, and tasks

---

## API Strategy

### Primary Interface: REST (OpenAPI)
- Create issue, list issues, update phases/tasks, get issue history
- Prefer resource-driven endpoints

### Live Updates: SSE
- `/stream/updates`
- Streams events relevant to authenticated user
- Message types:
  - ISSUE_UPDATED
  - PHASE_STATUS_CHANGED
  - TASK_STATUS_CHANGED
  - NEW_COMMENT

---

## Testing
- Use JUnit for unit and integration tests
- Use MockK for mocking in Kotlin-focused tests
- Add end-to-end tests as the API stabilizes

---

## Future Roadmap (Non-binding)
- Add comments and attachments
- User groups / permissions
- Use Kafka/NATS for external event consumers
- GraphQL read layer (optional)
- Optional migration to EventStoreDB or Axon

---

## Key Design Goals
- Strong internal boundaries via Modulith
- Simple operational model (one deployable)
- Evolutionary path toward more distributed event processing
- Human-friendly API surface
- Full traceability of issue development
