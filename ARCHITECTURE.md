# Causa Architecture

Causa is an event-sourced, modular issue resolution system inspired by 8D and similar structured
problem-solving processes. The system tracks issues through multiple flexible phases, provides
role-specific responsibilities, and maintains a complete event history and audit trail.

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
- **Event Sourcing** drives all state changes.
- **Event Stream + Projections** provide current read models.
- **Modular monolith** using Spring Modulith.
- **REST** is used for external interaction (OpenAPI documented).
- **SSE (Server-Sent Events)** delivers live UI updates.
- Persistence is **pluggable** so storage can evolve.

---

## Technology Stack

### Java / Spring
- Java 21
- Spring Boot 3.x
- Spring Modulith (for module enforcement + event publication)
- Spring Web (REST + SSE)
- Spring Security (later)
- Spring Data JDBC (initial persistence)

### Persistence and Data
- DIY Event Store on Postgres (initial implementation)
  - Append-only event table
  - Per-aggregate event streams
  - Optimistic concurrency via versioning
- Projection tables managed by the reporting module
- Alternate event stores may be plugged in via Spring profiles

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

## Event Sourcing Approach

### Event Store Semantics
- Append-only
- Aggregate streams keyed by issue ID
- Version-correct optimistic concurrency check

### Domain Events (examples)
- IssueCreated
- PhaseAdded
- PhaseStatusChanged
- TaskAdded
- IssueClosed

### Projections
- Issue list projection
- Issue detail projection
- Phase task projection
- Issue history (event log)

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
  - NEW_COMMENT (later)

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


