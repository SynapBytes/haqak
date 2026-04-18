# Database Security Inventory & Grants Matrix (Migration-derived)

- Generated from: `supabase/migrations/*.sql`
- Scope: migration-declared tables, RLS enablement, FORCE RLS, policies, and explicit GRANT/REVOKE statements.

## Before/After hardening summary

- Before this change: `FORCE ROW LEVEL SECURITY` was not set on migration-declared sensitive tables.
- After this change: added `supabase/migrations/20260413000000_force_rls_sensitive_tables.sql` to enforce FORCE RLS on selected sensitive tables.

## Table Security Inventory

| Table | Created in | RLS enabled | FORCE RLS | Policy count | Sensitivity |
|---|---|---|---|---:|---|
| `ai_alerts` | 20260328060200_ai_early_warning.sql | yes | no | 1 | standard |
| `ai_anomalies` | 20260328060200_ai_early_warning.sql | yes | no | 1 | standard |
| `ai_bot_conversations` | 20260328060300_ai_legal_bot.sql | yes | no | 1 | standard |
| `ai_bot_messages` | 20260328060300_ai_legal_bot.sql | yes | no | 2 | standard |
| `announcements` | 20260410000000_sprint3_5_mp_engagement.sql | yes | no | 5 | standard |
| `audit_logs` | 20260325130000_create_audit_logs.sql, 20260328060100_advanced_features.sql | yes | yes | 7 | high |
| `blockchain_audit_trail` | 20260328060400_enterprise_features.sql, 20260328060500_gis_blockchain.sql | yes | no | 4 | high |
| `captcha_verifications` | 20260330010000_captcha_tokens.sql | yes | yes | 1 | high |
| `centers` | 20260407000000_sprint1_centers_onboarding.sql | yes | no | 2 | standard |
| `chat_conversations` | 20260319040409_d05653c8-672d-4e08-9188-bc72bbde1389.sql | yes | no | 6 | standard |
| `chat_messages` | 20260319040409_d05653c8-672d-4e08-9188-bc72bbde1389.sql | yes | no | 4 | standard |
| `collective_cases` | 20260328060400_enterprise_features.sql | yes | yes | 2 | medium |
| `community_projects` | 20260412000000_sprint8_community_projects_donations_refunds.sql | yes | no | 3 | standard |
| `contributions` | 20260405000000_add_contributions_and_feedbacks.sql | yes | no | 2 | standard |
| `csrf_tokens` | 20260330010100_csrf_tokens.sql | yes | yes | 1 | high |
| `digital_signatures` | 20260328060400_enterprise_features.sql | yes | yes | 3 | high |
| `email_verification_codes` | 20260409000000_sprint2_identity_and_unified_notifications.sql | yes | yes | 1 | high |
| `fcm_tokens` | 20260319070120_1581a3f1-8586-43eb-a5af-bc780cb0dda1.sql | yes | no | 5 | standard |
| `feedbacks` | 20260405000000_add_contributions_and_feedbacks.sql | yes | no | 3 | standard |
| `file_validation_log` | 20260330010200_file_validation.sql | yes | yes | 2 | standard |
| `identity_verifications` | 20260409000000_sprint2_identity_and_unified_notifications.sql | yes | no | 3 | high |
| `issue_actions` | 20260319025918_ccc4e7fe-b145-453a-bcfe-baba0742934f.sql | yes | no | 8 | medium |
| `issue_assignments` | 20260401121500_core_issue_workflow.sql | yes | no | 4 | standard |
| `issue_attachments` | 20260319025918_ccc4e7fe-b145-453a-bcfe-baba0742934f.sql | yes | no | 5 | medium |
| `issue_comments` | 20260401121500_core_issue_workflow.sql | yes | no | 4 | medium |
| `issue_status_history` | 20260401121500_core_issue_workflow.sql | yes | no | 3 | standard |
| `issues` | 20260319024649_8e71a53f-0626-4244-b434-e826edfefc68.sql | yes | no | 13 | medium |
| `legal_knowledge_base` | 20260328060300_ai_legal_bot.sql | yes | yes | 2 | medium |
| `moderation_evidence` | 20260402100000_storage_media_buckets.sql | yes | no | 3 | standard |
| `mp_admin_requests` | 20260410000000_sprint3_5_mp_engagement.sql | yes | no | 4 | standard |
| `mp_approvals` | 20260328060700_mp_approval_system.sql | yes | no | 3 | standard |
| `mp_bank_accounts` | 20260411000000_sprint6_7_mp_public_and_bank.sql | yes | no | 5 | high |
| `mp_kpis` | 20260328060400_enterprise_features.sql | yes | yes | 3 | medium |
| `mp_public_posts` | 20260411000000_sprint6_7_mp_public_and_bank.sql | yes | no | 4 | standard |
| `mp_responses` | 20260328060800_official_docs_responses.sql | yes | no | 2 | standard |
| `notification_deliveries` | 20260409000000_sprint2_identity_and_unified_notifications.sql | yes | no | 3 | high |
| `notification_preferences` | 20260409000000_sprint2_identity_and_unified_notifications.sql | yes | no | 4 | high |
| `notifications` | 20260319025918_ccc4e7fe-b145-453a-bcfe-baba0742934f.sql | yes | no | 12 | high |
| `official_documents` | 20260328060800_official_docs_responses.sql | yes | no | 2 | standard |
| `outbound_email_tasks` | 20260410000000_sprint3_5_mp_engagement.sql | yes | no | 3 | standard |
| `poll_votes` | 20260410000000_sprint3_5_mp_engagement.sql | yes | no | 2 | standard |
| `polls` | 20260410000000_sprint3_5_mp_engagement.sql | yes | no | 4 | standard |
| `profiles` | 20260319024649_8e71a53f-0626-4244-b434-e826edfefc68.sql | yes | no | 17 | high |
| `project_contributions` | 20260328060900_project_proposals_crowdfunding.sql | yes | no | 2 | standard |
| `project_donations` | 20260412000000_sprint8_community_projects_donations_refunds.sql | yes | no | 3 | high |
| `project_founders` | 20260412000000_sprint8_community_projects_donations_refunds.sql | yes | no | 3 | standard |
| `project_milestones` | 20260328060900_project_proposals_crowdfunding.sql | yes | no | 2 | standard |
| `project_mp_nomination_approvals` | 20260412000000_sprint8_community_projects_donations_refunds.sql | yes | no | 2 | standard |
| `project_mp_nominations` | 20260412000000_sprint8_community_projects_donations_refunds.sql | yes | no | 6 | standard |
| `project_proposals` | 20260328060900_project_proposals_crowdfunding.sql | yes | no | 3 | standard |
| `project_refund_batches` | 20260412000000_sprint8_community_projects_donations_refunds.sql | yes | no | 1 | standard |
| `project_refund_requests` | 20260412000000_sprint8_community_projects_donations_refunds.sql | yes | no | 2 | standard |
| `project_system_settings` | 20260412000000_sprint8_community_projects_donations_refunds.sql | yes | no | 1 | standard |
| `project_votes` | 20260328060900_project_proposals_crowdfunding.sql | yes | no | 2 | standard |
| `push_subscriptions` | 20260320012205_173dfcc3-0376-4248-a4a6-fbddf59d6f48.sql | yes | no | 5 | standard |
| `rate_limit_logs` | 20260325120100_create_rate_limit_logs_table.sql, 20260330010300_rate_limits.sql, 20260402005200_a9d3391f-25e0-4e30-bd52-e94cb604994e.sql | yes | yes | 5 | high |
| `submission_attempts` | 20260325130200_add_submission_tracking.sql | yes | yes | 5 | high |
| `urgent_issue_alerts` | 20260328060100_advanced_features.sql | yes | no | 3 | standard |
| `user_roles` | 20260319024649_8e71a53f-0626-4244-b434-e826edfefc68.sql | yes | no | 7 | high |
| `user_violations` | 20260327000002_setup_user_violations_and_penalties.sql | yes | no | 1 | standard |

## Roles & Grants Matrix (explicit GRANT/REVOKE in migrations)

| Migration | Statement |
|---|---|
| `20260325120000_security_hardening.sql` | `REVOKE ALL ON SCHEMA public FROM public;` |
| `20260325120000_security_hardening.sql` | `REVOKE ALL ON TABLE sensitive_data FROM public;` |
| `20260325120000_security_hardening.sql` | `GRANT SELECT ON TABLE sensitive_data TO admin_role;` |
| `20260401025926_39f55ef6-5ff9-4e55-83b9-0667c839de19.sql` | `GRANT SELECT ON public.mp_public_profiles TO anon, authenticated;` |
| `20260401025938_b2ad8056-bc83-40a9-bcb5-2e1c6bb29a21.sql` | `GRANT SELECT ON public.mp_public_profiles TO anon, authenticated;` |
| `20260406010100_supabase_security_followup.sql` | `REVOKE ALL ON FUNCTION public.update_citizen_reputation() FROM PUBLIC, anon, authenticated;` |
| `20260406010100_supabase_security_followup.sql` | `REVOKE ALL ON FUNCTION public.detect_issue_anomalies() FROM PUBLIC, anon, authenticated;` |
| `20260406010100_supabase_security_followup.sql` | `REVOKE ALL ON FUNCTION public.verify_geotagged_photo() FROM PUBLIC, anon, authenticated;` |
| `20260406010100_supabase_security_followup.sql` | `REVOKE ALL ON FUNCTION public.update_project_raised_amount() FROM PUBLIC, anon, authenticated;` |
| `20260406010100_supabase_security_followup.sql` | `REVOKE ALL ON FUNCTION public.notify_district_of_new_project() FROM PUBLIC, anon, authenticated;` |
| `20260406010100_supabase_security_followup.sql` | `GRANT EXECUTE ON FUNCTION public.update_citizen_reputation() TO postgres, service_role;` |
| `20260406010100_supabase_security_followup.sql` | `GRANT EXECUTE ON FUNCTION public.detect_issue_anomalies() TO postgres, service_role;` |
| `20260406010100_supabase_security_followup.sql` | `GRANT EXECUTE ON FUNCTION public.verify_geotagged_photo() TO postgres, service_role;` |
| `20260406010100_supabase_security_followup.sql` | `GRANT EXECUTE ON FUNCTION public.update_project_raised_amount() TO postgres, service_role;` |
| `20260406010100_supabase_security_followup.sql` | `GRANT EXECUTE ON FUNCTION public.notify_district_of_new_project() TO postgres, service_role;` |
| `20260407000000_sprint1_centers_onboarding.sql` | `GRANT SELECT ON public.mp_public_profiles TO anon, authenticated;` |
| `20260408000000_sprint1_centers_security_and_onboarding.sql` | `REVOKE ALL ON FUNCTION public.upsert_centers_from_json(jsonb) FROM PUBLIC;` |
| `20260408000000_sprint1_centers_security_and_onboarding.sql` | `GRANT EXECUTE ON FUNCTION public.upsert_centers_from_json(jsonb) TO service_role;` |
| `20260408000000_sprint1_centers_security_and_onboarding.sql` | `REVOKE ALL ON FUNCTION public.get_mp_center_citizens_count() FROM PUBLIC;` |
| `20260408000000_sprint1_centers_security_and_onboarding.sql` | `GRANT EXECUTE ON FUNCTION public.get_mp_center_citizens_count() TO authenticated;` |
| `20260410000000_sprint3_5_mp_engagement.sql` | `REVOKE ALL ON FUNCTION public.get_poll_vote_counts(uuid) FROM PUBLIC;` |
| `20260410000000_sprint3_5_mp_engagement.sql` | `GRANT EXECUTE ON FUNCTION public.get_poll_vote_counts(uuid) TO authenticated;` |
| `20260410000000_sprint3_5_mp_engagement.sql` | `GRANT SELECT ON public.poll_results TO authenticated;` |
| `20260411000000_sprint6_7_mp_public_and_bank.sql` | `GRANT SELECT ON public.mp_public_profiles TO anon, authenticated;` |
| `20260412000000_sprint8_community_projects_donations_refunds.sql` | `REVOKE ALL ON FUNCTION public.get_project_refund_fee_percent() FROM PUBLIC;` |
| `20260412000000_sprint8_community_projects_donations_refunds.sql` | `GRANT EXECUTE ON FUNCTION public.get_project_refund_fee_percent() TO authenticated;` |
| `20260412000000_sprint8_community_projects_donations_refunds.sql` | `REVOKE ALL ON FUNCTION public.create_project_donation_pledge(uuid, numeric) FROM PUBLIC;` |
| `20260412000000_sprint8_community_projects_donations_refunds.sql` | `GRANT EXECUTE ON FUNCTION public.create_project_donation_pledge(uuid, numeric) TO authenticated;` |
| `20260412000000_sprint8_community_projects_donations_refunds.sql` | `GRANT SELECT ON public.community_project_public_stats TO authenticated;` |
| `20260412000000_sprint8_community_projects_donations_refunds.sql` | `GRANT EXECUTE ON FUNCTION public.get_project_public_aggregate(uuid) TO authenticated;` |

## Confirmed security gaps and actions

1. **No FORCE RLS on sensitive tables** → fixed by `20260413000000_force_rls_sensitive_tables.sql`.
2. **RLS activation lag for `collective_cases`, `digital_signatures`, `mp_kpis`, `legal_knowledge_base`** (created in 20260328, enabled in 20260406) → bounded going forward via FORCE RLS on those tables.
3. **Open-read policies (`USING (true)`) exist on selected datasets** (e.g., collective/legal knowledge) → intentionally left unchanged in this migration to avoid product behavior break; requires product decision before tightening.
4. **Operational tables created without explicit policies in their original migration** (e.g., csrf/captcha) are later governed by follow-up hardening migrations; current migration set contains service-role policies where required.

## Effective role model (from current migration set)

- **anon**: receives explicit read grants on selected public profiles view (`mp_public_profiles`), no broad table grants.
- **authenticated**: access is primarily policy-driven (RLS on tables), plus explicit execute/select grants for selected safe functions/views.
- **service_role**: privileged operational role for verification/rate-limit/captcha/audit flows via dedicated policies and function grants.
- **postgres**: function execution grants remain for internal privileged paths.

## Rationale for minimal-change migration

- FORCE RLS hardening is schema-level and preserves existing policy logic.
- This closes a high-impact bypass path while minimizing regression risk.
- Policy semantics were not broadened; no new data access paths were introduced.
