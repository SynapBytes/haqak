# Core database schema (Supabase/Postgres)

This overview documents the core civic workflow tables used by the app. All tables are in the `public` schema and have RLS enabled.

- **profiles** — One row per authenticated user (linked to `auth.users.id`). Stores full name, phone, optional registration number, approval flags, and ban metadata. Updated automatically on signup via trigger.
- **user_roles** — Role assignments per user (`citizen`, `mp`, `moderator`, `admin`). Helper functions (`has_role`, `has_any_role`, `is_active_mp`) rely on this table for RLS decisions.
- **issues** — Citizen submissions capturing title, description, category, location, status (`received`/`in-progress`/`resolved`), flags, assignment pointer, and timestamps. MPs/admins update status and assignment as work progresses.
- **issue_actions** — Lightweight action log (e.g., status updates or notes) tied to an issue. Visible to the issue owner, active MPs, and administrators with insert restrictions to prevent privilege escalation.
- **issue_comments** — Discussion and public-facing updates on an issue with author, body, visibility (`is_internal`), and audit timestamps. Participants (issue owner, assigned MP, active MPs, admins/moderators) can read; creation is restricted to the author within that set.
- **issue_assignments** — Historical assignment record for issues (assigned_to, assigned_by, assigned_at/unassigned_at, reason). Enforces that assignees are active MPs or admins and limits writes to admins or active MPs.
- **issue_status_history** — Automatic audit trail of status transitions (`old_status`, `new_status`, `changed_by`, `changed_at`). Triggered on any status change in `issues` and readable by the same participants who can view the issue.
- **audit_logs** — Append-only audit trail with `action`, `entity_type`, `entity_id`, `old_values`, `new_values`, and status/error context. Inserts are only allowed from the service role or trusted SECURITY DEFINER triggers; reads are limited to admins and moderators. Triggers capture role changes, profile approvals, issue status transitions, and moderation toggles on comments.

These tables are designed to support moderation, auditability, and future analytics while remaining minimal for the MVP.
