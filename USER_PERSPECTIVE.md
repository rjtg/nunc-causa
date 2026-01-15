# Causa — User Perspective & Usage Philosophy

This document describes how different users experience Causa, what they care about, and how they interact with issues, phases, and tasks.

It focuses on real-world workflow rather than domain model.

---

## 1. User Personas (Mental Models)

Causa revolves around a **capability-based role model**.  
The UI can still present the four default lanes, but the system should allow
other role types and queue views.

### UI Strategy
- Web is the primary surface (Next.js).
- Mobile follows via Expo (React Native), reusing shared TS types and API clients.
- A CLI is available for power users (scripting, quick updates).

---

### 1.1 Primary Owner (the “Issue Owner”)

**Mental model:**  
“I’m accountable for making sure this issue gets solved, even if others do most of the work.”

**Primary needs:**
- Create issues
- Define phases (based on templates)
- Assign people to phases
- Monitor progress across all roles
- Unblock problems / chase stakeholders
- Close the issue when everything is done
 - Hand over ownership with a reason when needed

**Key UI touchpoints:**
- Issue dashboard: all owned issues with health indicators
- Issue detail: timeline, phases, assignees, blockers
- Phase configuration editor

**Pain avoided:**
- No manual update chasing
- No scattered information
- Visibility and control without micromanaging

**Notification strategy (minimal to start):**
- Inbox notifications only for: assignments, phase ready, fail/reopen, mention
- Optional daily digest
- Escalation rules come later

**Template guidance:**
- Start from a composable template (core phases + optional blocks)
- Allow per-issue edits with a clear diff from the base template
 - Default phases should be enable/disable first; full editor can come later

---

### 1.2 Developer

**Mental model:**  
“I need to know which fix I have to implement today.”

**Primary needs:**
- See just the relevant development phase
- Clear task list with status
- Understand requirements/acceptance criteria from upstream phase
- Mark tasks in progress/done
- Report blockers/questions via discussion thread

**Key UI touchpoints:**
- My Work → Developer Tasks
- Phase task list
- Lightweight task detail

**Pain avoided:**
- No forced visibility into the whole process
- No ambiguous tasks
- Automatic progress acknowledgment

---

### 1.3 Tester (Acceptance / QA)

**Mental model:**  
“I verify the fix actually solves the problem.”

**Primary needs:**
- Know when testing is ready to start
- See instructions or acceptance criteria
- Report failure quickly (regression loop)
- Approve a phase when satisfied

**Key touchpoints:**
- My Work → Testing Queue
- Acceptance phase page
- One-click: “Pass”, “Fail/Return to dev”

**Pain avoided:**
- No stale testing tasks
- No context hunting
- System tells them when to start

---

### 1.4 Rollout Manager

**Mental model:**  
“I handle the deployment into the real world.”

**Primary needs:**
- Preview approved/ready work
- Confirm rollout readiness
- Execute staged rollout (if scope included)
- Mark rollout done

**Touchpoints:**
- My Work → Rollout Tasks
- Rollout phase detail
- Optional checklist (configurable)

**Pain avoided:**
- No ambiguity about testing completion
- No risk deploying the wrong version

---

## 2. Core UX Principles

### 2.1 Users See Their Lens of the Issue
- Developers see tasks  
- Testers see validation  
- Rollout sees deployment  
- Owners see the full map

Avoid overwhelming any user with unnecessary detail.

**De-risking blind spots:**  
Keep the lane-focused “My Work”, but always include a one-click **Context** panel that shows:
- upstream/downstream dependencies
- current phase, blockers, assignees
- last 5 activity events

### 2.2 Process Can Be Automatic, Driven by Phase Status
Examples:
- Dev finish → Causa transitions to Acceptance Testing automatically
- Tester approval → Rollout becomes actionable

Automation is opt-in per issue; users still nudge **their** part forward.

### 2.3 Real-Time Is Optional, Not Default
Default to polling for most screens and use SSE only where it clearly matters
(queues, active issue page). When SSE is enabled, show a **Last updated** timestamp
and re-fetch on reconnect to ensure eventual UI correctness.

### 2.4 History is Transparent but Unobtrusive
Users browse the timeline:
- Who changed what, and when?
- Why is this phase blocked?
- What reverted last week?

**De-risking signal vs noise:**  
Keep two layers of history:
- **Activity feed (domain meaningful):** e.g., “QA failed”, “Phase reopened”, “Owner changed rollout plan”
- **Audit trail (technical):** field diffs and who changed what

Keep them separate in UI and storage.

### 2.5 Ownership is Clear
- One primary owner, with optional delegate/on-call group
- Explicit handover action with a reason
- Distributed responsibility across roles
- No invisible responsibility zones

### 2.6 UI Interaction Patterns (Compact + Contextual)
- Prefer **compact, inline controls**: icon buttons embedded in inputs, with popovers for details.
- Use **status badges + progress bars** to summarize phase/task state without extra text.
- Progress bars should be **hierarchical** (each phase weighs equally, then subdivided by task status).
- Progress segments should be **interactive**: hover shows phase badges (assignee/task count/deadline), click jumps to the phase.
- Keep **primary actions and key context always visible** near the user’s current focus (e.g., tab row, header controls), not buried in side panels.
- Comments behave like a messenger:
  - Sticky one-line composer that expands with typing
  - Ctrl+Enter sends
  - Jump to latest/unread controls
  - Read receipts for relevant participants (owner + assignees)
- Buttons should include **decorative icons** for scanability.
- Use **styled tooltips/popovers** (not browser defaults) to show rich context
  like status, deadlines, and counts.

---

## 3. Key UI Surfaces

### 3.1 Home: “My Work”
Personalized, role-aware.  
Tiles or tabs:
- Development Tasks
- Testing Queue
- Rollout Queue
- My Owned Issues
- Recently Updated

Where most users start their day.
Access is scoped by project membership (and team inheritance) to avoid leaks.

### 3.2 Issue List
For owners and coordinators:
- Filter by status (Analysis, Dev, Test, Rollout, Done)
- Red flags if blockers/regressions
- Live attributes (phase/task progress via hierarchical bar, owner display name)

Useful for triage.

### 3.3 Issue Detail View
The nervous system.

Sections:
- Overview (status + next action)
- Phases lane (timeline or columns)
- Tasks under phases
- Comments/log (team discussion channel)
- Event history
- Configuration (owners)
- Allowed actions (capability keys based on permissions + workflow state)

Visual cues show:
- What’s done
- What’s active
- What’s waiting
- What’s blocked
- Progress bar segments are clickable to jump to the phase section.

### 3.4 Phase View
Single-phase deep dive:
- Assignee + role
- Status
- Tasks
- Checklist / inputs
- “Start → Progress → Done”

This is the dev/tester workspace.

### 3.5 Activity Stream (Optional Later)
Light feed:
- Task completions
- Phase failures
- Rollout start
Aligned with domain activity events.

---

## 4. Example User Journeys

### 4.1 Create & Run an Issue (Owner)
1. Create new issue
2. Title + description
3. Select workflow template
4. Assign roles to phases
5. Dev tasks appear
6. Testing/rollout trigger automatically
7. Owner closes after last phase

Owner configures — others execute.

### 4.2 Developer Daily Flow
- Open My Work
- “2 in progress, 3 to do”
- Work → mark done
- Acceptance triggers
- Move to next task

Developer never touches rollout/testing unless they choose to look.

### 4.3 Tester Flow
- My Work → Acceptance Queue
- Blockers fall away automatically
- Pass → Moves to rollout  
- Fail → Returns to dev + logs event

Tester never asks “Is it ready?”

### 4.4 Rollout Flow
- Rollout phase turns ready
- View checklist
- Mark done
- Issue nearly wrapped

### 4.5 What Happens on Failure
- Tester fails → Dev reopens
- Owner notified
- Status rolls back
- UI shows “Returned to development”

Users see only what is relevant.

---

## 5. What Users Should Never Have to Do
- Manually set issue status
- Guess who to notify
- Change unrelated phases
- Recreate work already captured
- Stitch together Slack/Excel/Word

Causa provides structure so humans solve problems.

---

## 6. Long-Term UX Spine (Future)
Not required up front, but aligned:

- Saved templates per team
- Workload balancing (e.g., QA overloaded)
- SLA timers
- Attachments
- Risk/severity metadata
- Incident timelines
- ML suggestions
- Structured retrospectives (e.g., 8D)

Optional growth directions.

---

## 7. Summary in One Line

> **Causa is an opinionated process tool where each user sees only the work that is theirs —  
> but the owner sees the whole story.**
