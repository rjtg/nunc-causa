# Causa — Permissions & Tenancy Decisions (Single Org, Org Units, Projects)

This document captures the current architecture decisions around tenancy, org structure, memberships, visibility, authorization, and deletion semantics for Causa.

---

## 1) Tenancy Model

### Decision
Causa will **not** be built as full SaaS multi-tenant (per-tenant isolation) for v1.

Instead, the system supports:
- **Single Org** (primary operational context)
- **Multiple Org Units / Teams** (including optional sub-units)
- **Multiple Projects** (owned by org units)

### Rationale
Full multi-tenancy adds complexity (isolation, provisioning, billing, tenant-level configs) without clear product benefit for the current scope.

### Implication
Even though v1 is “single org in practice”, the data model should still be compatible with **multiple orgs per user** (see section 8).

---

## 2) Boundary Model (Org → Org Unit → Project → Issue)

### Decision
Introduce **Org Unit** as an explicit boundary between Org and Project.

Hierarchy:
- **Org**
  - **Org Unit** (team / org unit; can optionally have parent/child nesting)
    - **Project**
      - **Issue**

### Membership rule (org units)
- Users belong to **one or more org units**.
- Org units can have **sub-units**.
- A rule should exist so that **users of a sub-unit must also be present in the parent unit’s project context** when the project is defined at the parent level.

> Note: exact semantics (“must be present” via inherited membership vs explicit membership) should be implemented consistently:
> - either via **membership inheritance** (preferred), or
> - via **validation** preventing inconsistent assignments.

### Primary boundary
- **Project is the primary day-to-day access boundary** (visibility, work queues, collaboration).
- Org units mainly structure projects, membership inheritance, and administrative organization.

---

## 3) Visibility Model

### 3a) Issue visibility (within a project)

### Decision
Default visibility: **Public within Project**.

Meaning:
- Any member of the project can view project issues by default.

### Future-compatible extension (optional later)
May introduce issue-level restrictions (e.g., restricted/private issues) later, but not required now.

### 3b) Membership vs Participation

### Decision
Keep membership and participation distinct concepts:

- **Project membership**: who belongs to the project generally.
- **Issue participation**: who is actively involved in a specific issue (owner, assignees, watchers, mentioned users).

This supports:
- “Public in project” browsing
- “My Work” queries
- Potential future restricted visibility if needed

---

## 4) Roles & Permissions Approach (Workflow vs Security)

### Decision
Use a hybrid approach:
- **RBAC** for administrative capabilities (project/unit/org administration)
- **Workflow roles** (owner/dev/tester/rollout) as *assignment & UI lens*, not as the security authority
- Allow ABAC-style checks where appropriate (e.g., “can act if assigned to active phase”)

Rationale:
- Personas are UX/workflow, not always permission boundaries.
- Security rules should be stable even when workflow templates change.

---

## 5) Permission Layers (View vs Act vs Admin)

### Decision
Permissions will be modeled as separate layers:

- **View**: can see issue/phase/task
- **Act**: can change state / complete tasks / fail QA / mark rollout done
- **Admin**: can change templates, memberships, configuration, or broader governance

This separation avoids ambiguity and prevents accidental privilege escalation.

---

## 6) Automation, Overrides, and Ownership

### Current decision
- Automation is **opt-in per issue**.
- Phases are **added/configured by the issue owner** (via template selection and/or manual edits).
- The **owner has full control** over the issue workflow within allowed system constraints.
- Any owner actions that affect workflow (including overrides) must be **logged**.

Implications:
- “Override” is primarily an **owner feature**, not a global admin mechanism in v1.
- Logging is mandatory for workflow control actions (automation enabled/disabled, phase added/removed, phase skipped, reopened, etc.).

---

## 7) History / Audit Trail

### Decision
A full compliance-grade audit trail is **not required right now**.

However:
- History should exist and be **separated by purpose**:
  - **Activity Feed / Domain Timeline**: human-meaningful entries (e.g., “Acceptance failed”, “Phase reopened”, “Owner changed assignee”)
  - **Audit Trail / Entity Diffs**: if added later (Envers or custom), kept separate from activity feed

Rationale:
- Timeline is useful for workflow understanding.
- A strict audit log may be overkill now, but the design should not block it later.

---

## 8) Identity & Memberships (Multi-org capable)

### Decision
Users can belong to **multiple orgs**.

Implementation shape:
- Global `user_id`
- Separate membership tables:
  - `org_memberships`
  - `org_unit_memberships`
  - `project_memberships`

Rationale:
- Supports future SaaS/self-host hybrids
- Supports consultants, shared service accounts, or multiple business entities

---

## 9) “My Work” Queues Must Enforce Permissions

### Decision
All queue surfaces (e.g., “My Work”, dev/test/rollout queues) must apply permission filters consistently.

At minimum, queue queries must respect:
- Project membership (including org-unit inheritance rules)
- Issue visibility (public-in-project now; extensible later)
- Role assignment / phase assignment constraints

This prevents data leaks and inconsistent UX.

---

## 10) Authorization Implementation

### Decision
Use Spring Security method-level authorization, primarily via `@PreAuthorize`.

Guidelines:
- Centralize authorization logic in well-defined policy/services, and call them from `@PreAuthorize` expressions.
- Avoid scattering ad-hoc checks throughout controllers.
- Keep repository queries scoped by project/org boundaries to reduce risk of accidental overfetch.

---

## 11) Deletion Semantics

### Decision
Use a **multi-step deletion workflow**:

1. **Archive** (soft hide from active workflows; still recoverable)
2. **Trash** (marked for deletion; limited recovery window/UX)
3. **Empty Trash** (permanent delete)

Rationale:
- Protects against accidental loss
- Supports predictable retention and recovery behavior
- Keeps UI consistent with common mental models

---

## 12) SSO Compatibility

### Decision
SSO should be possible via **Spring Security OAuth2 integration**.

Implications:
- Identity model should support external identities linked to `user_id` (e.g., `user_identities` table with provider + subject).
- Membership assignment (org/unit/project) remains internal and controlled by Causa governance.

---

## Summary

Causa will operate as a **single-org system with org units and projects**, using **project membership as the primary access boundary**. Workflow roles drive UX and assignments, while permissions are enforced via **view/act/admin layers** and Spring Security `@PreAuthorize`. Deletion is a **three-step lifecycle** (archive → trash → delete). The design remains compatible with multi-org user membership and future SSO needs.
