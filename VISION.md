# Causa — Vision and Domain Overview (for Codex)

This document explains what Causa is supposed to be and how it should behave.
Use this as a guide when creating tasks, designing data structures, and
implementing features.

You (Codex) are allowed to propose **new tasks** (for TODO_Codex.md) that clearly
follow from this vision, and then implement them in small, reviewable steps.

---

## 1. What Causa is

Causa is an **issue resolution system**, similar to an issue tracker, but modeled
closely on structured problem-solving methods such as **8D** (Eight Disciplines).

Key ideas:

- An "issue" is not just a ticket with one assignee. It is a **process**.
- Multiple disciplines / roles collaborate on an issue across several **phases**.
- Each phase has its own lifecycle and assignee.
- One person is always the **responsible owner** for the whole issue.
- The system uses **CRUD with audit history** for full traceability.
- The UI should be able to **update live** when changes happen.

You should favor designs that reflect **process, roles, and phases**, instead of
the classic "single assignee + single status" model.

---

## 2. Opinionated differences from a normal issue tracker

Causa intentionally **does not** behave like a typical simple issue tracker.

### 2.1 No single global worker

In a normal tracker:

- An issue usually has a single "assignee" and a single "status".

In Causa:

- One person is **responsible** for the issue (the "owner" or "team lead").
- Multiple people work on different **phases** and **tasks**:
  - Developers implement fixes.
  - Testers perform acceptance tests.
  - Rollout managers handle deployment / rollout.
  - Analysts may do investigation or root cause analysis.

The system should be designed so that:

- Developers mainly interact with **their tasks**.
- Testers mainly interact with **their test phase**.
- Rollout managers mainly interact with **their rollout phase**.
- The responsible person sees the **whole picture**.

### 2.2 Multi-phase workflow, inspired by 8D

8D has steps like:

- Team formation
- Problem description
- Containment actions
- Root cause analysis
- Corrective actions
- Validation
- Prevention of recurrence
- Closure

Causa does not need to implement textbook 8D literally, but it should
**capture the spirit**:

- An issue is broken into **phases**.
- Phases may depend on each other, or partially overlap in time.
- Some typical phase kinds:

  - `INVESTIGATION`
  - `PROPOSE_SOLUTION`
  - `DEVELOPMENT`
  - `ACCEPTANCE_TEST`
  - `ROLLOUT`
  - Later: `RISK_ASSESSMENT`, `PREVENT_RECURRENCE`, etc.

- Each phase has:
  - a **kind** (semantic type),
  - a **status** (e.g., NOT_STARTED, IN_PROGRESS, DONE),
  - an **assignee role and user**,
  - optional **configuration**.

The system should support **flexible, template-based workflows**:

- A manager can decide per issue which phases are needed
  (e.g., no rollout for a trivial bug).
- Templates define default phases, order, roles, etc.
- Per issue, phases can be enabled/disabled and configured.

### 2.3 Overall issue status is derived, not set directly

Causa should **derive** an issue’s high-level status from the states of its phases,
not from a direct “status” field set arbitrarily.

Example derived states:

- `CREATED`
- `IN_ANALYSIS`
- `IN_DEVELOPMENT`
- `IN_TEST`
- `IN_ROLLOUT`
- `DONE`
- `FAILED`
- possibly flags like `HAS_BLOCKERS`.

Rules for derivation should be based on:

- Which phases exist,
- Which phases are required,
- The status of those phases.

Developers, testers, and rollout managers **do not directly set** “issue = DONE”.
They only update their part. The system + responsible owner governs closure.

---

## 3. Audit-driven domain

All important state changes should be persisted via **CRUD** with
**audit history** captured by Envers.

Example audited changes (non-exhaustive):

- Issue created/updated
- Responsible assigned
- Phase added/removed/canceled
- Phase assignee changed
- Phase status changed
- Dev task added to phase
- Dev task status changed
- Issue closed

Audit entries should include:

- Entity ID (issue/phase/task)
- Change type
- Actor user ID (when available)
- Timestamp
- Optional metadata (correlation ID, request ID, etc.)

Postgres remains the backing datastore, managed via Liquibase.

---

## 4. Read models and search

Because the system serves multiple user lenses, **read models** and search indexes
are needed to serve the UI and APIs efficiently.

Examples of read models:

- **Issue list projection**:
  - issue ID, title, responsible, overall status, key phase summary.

- **Issue detail projection**:
  - full issue state as seen by the UI:
    - metadata
    - phases with assignees and statuses
    - dev tasks per phase

- **Activity feed**:
  - domain-meaningful timeline (e.g., QA failed, phase reopened)
- **Audit trail**:
  - technical history from Envers (field diffs and who changed what)

- **Per-user work views**:
  - dev tasks assigned to a developer,
  - tests assigned to a tester,
  - rollouts owned by a rollout manager,
  - issues owned by a responsible person.

You (Codex) can define the necessary projection tables and updater components
that react to domain events to keep these read models up to date.

---

## 5. API and UI behavior

### 5.1 REST API (OpenAPI documented)

The external interface is a REST API. Typical endpoints:

- `POST /issues`
- `GET /issues`
- `GET /issues/{id}`
- `GET /issues/{id}/history`
- `POST /issues/{id}/phases`
- `PATCH /issues/{id}/phases/{phaseId}`
- `POST /issues/{id}/phases/{phaseId}/tasks`
- `PATCH /issues/{id}/phases/{phaseId}/tasks/{taskId}`
- `GET /me/work`

REST responses should be based on **read models**, not raw audit logs.

### 5.2 Live update via SSE (optional)

Default to polling (ETags or short polling) and add SSE only where it clearly
matters (queues, active issue page). If SSE is enabled, show a **Last updated**
timestamp and re-fetch on reconnect to ensure eventual UI correctness.

An SSE endpoint like `/stream/updates` can push updates to clients.

Typical SSE messages include:

- `ISSUE_UPDATED`
- `PHASE_STATUS_CHANGED`
- `TASK_STATUS_CHANGED`
- (later) `NEW_COMMENT`

These messages are triggered by domain/application events. The UI is responsible
for updating its local state accordingly, but the structure of the messages
should be stable and documented.

---

## 6. Roles and permissions (simplified for now)

At minimum, these roles exist:

- **Responsible owner** (issue-level)
- **Developer** (dev tasks)
- **Tester** (acceptance phase)
- **Rollout manager** (rollout phase)

Basic rules:

- Only the responsible owner can configure the workflow for an issue
  (add/remove phases, assign assignees, etc.).
- Only the assignee of a phase (or dev task) can change its status,
  except for administrative actions.
- Closing an issue (`IssueClosed`) usually requires the responsible owner,
  and all required phases being done.

You can introduce supporting structures in the `users` module
to represent users and roles, with room to extend later.

---

## 7. How you (Codex) should use this document

When generating or extending code:

1. **Align with this vision**  
   - Prefer designs that emphasize phases, roles, and audit history.
   - Avoid falling back to a single assignee + single status model.

2. **Propose new tasks**  
   - If you see missing parts that follow logically from this document,
     you may add items to `TODO_Codex.md` under appropriate sections
     (Bootstrap, Persistence, Domain, REST, Read Models, etc.).
   - New tasks should be small, concrete, and implementable in one PR.

3. **Keep changes incremental**  
   - Implement one small piece at a time.
   - After each logical step, prepare changes for a PR (the user will
     click “Create PR”).

4. **Preserve consistency**  
   - Respect architectural files (`ARCHITECTURE.md`, `VISION.md`, `TODO_Codex.md`).
   - If any design decision conflicts with this document, prefer this document,
     or propose an explicit change to the vision.

By following these principles, you will help build Causa into an
8D-inspired, phase-based, audit-tracked issue resolution system,
not just another simple bug tracker.
