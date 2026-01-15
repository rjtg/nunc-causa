# UI Wireframes (Low Fidelity)

These wireframes outline the core web UI screens and navigation. They are intentionally
skeletal so layout and data needs can be validated before visual design.

## Interaction Notes (Applied to All Screens)
- Compact inputs with inline icon controls and popovers for extra fields.
- Status badges + small progress bars instead of verbose text.
- Messenger-like comments: sticky composer, jump to unread/latest, read receipts.
- Buttons carry decorative icons for fast scanning.

## Global Layout
- Top bar: app name, project switcher, user menu.
- Left nav: My Work, Issues, Projects, Admin.
- Main content: page-specific layouts.

```
┌────────────────────────────────────────────────────────────┐
│ Causa ▾  | Project: Alpha ▾        [Search…]   User ▾      │
├──────────┬─────────────────────────────────────────────────┤
│ My Work  │                                                 │
│ Issues   │  Page content                                   │
│ Projects │                                                 │
│ Admin    │                                                 │
└──────────┴─────────────────────────────────────────────────┘
```

## Issue List
Goals: search, filters, create issue, quick status scan.

```
Filters: [Owner] [Assignee] [Phase Kind] [Status] [Project]
┌────────────────────────────────────────────────────────────┐
│ + New Issue   | Issues (n)                                 │
├────────────────────────────────────────────────────────────┤
│ #123  Title…           Owner   Status   Phase count  ▸     │
│ #124  Title…           Owner   Status   Phase count  ▸     │
└────────────────────────────────────────────────────────────┘
```

## Issue Detail
Goals: show status, phases, tasks, allowed actions, history/comments.

```
Header: Title | Status | Project | Owner | [Edit] [Close]
Phases (accordion):
  Phase A (assignee, status)  [Allowed Actions]
    Tasks: [ ] Task 1  [ ] Task 2
  Phase B ...
Right rail:
  - Allowed actions (issue/phase)
  - Last updated timestamp
Tabs:
  - Activity (feed)
  - Audit (Envers diffs)
  - Comments
```

## My Work
Goals: personal queue for owned issues, assigned phases, assigned tasks.

```
My Work
  Owned Issues (list)
  Assigned Phases (list)
  Assigned Tasks (list)
```

## Admin Setup
Goals: seed org/team/project/membership for dev/testing.

```
Admin
  Orgs   | Teams   | Projects   | Memberships
  CRUD tables + simple create forms
```

## Create Issue
Goals: minimal form with optional phases.

```
Title, Project, Owner
Phases:
  [Add phase] name, assignee, kind
Submit
```
