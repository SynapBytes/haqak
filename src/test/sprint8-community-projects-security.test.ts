import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('Sprint 8 community projects privacy and RLS', () => {
  const migrationPath = 'supabase/migrations/20260412000000_sprint8_community_projects_donations_refunds.sql';

  it('enforces verified-only restrictions for citizen and mp sensitive actions', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.is_verified_citizen');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.is_verified_mp');
    expect(sql).toContain("public.is_verified_citizen(auth.uid())");
    expect(sql).toContain("public.is_verified_mp(auth.uid())");
    expect(sql).toContain("NOT public.has_role(auth.uid(), 'mp'::public.app_role)");
    expect(sql).toContain('CREATE POLICY "Nominated verified MPs can accept or reject with legal acknowledgment"');
  });

  it('prevents MPs from direct donor/founder identity reads and uses anonymous aggregates', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).not.toContain('ON public.project_donations FOR SELECT TO authenticated\nUSING (public.has_role(auth.uid(), \'mp\'::public.app_role))');
    expect(sql).not.toContain('ON public.project_founders FOR SELECT TO authenticated\nUSING (public.has_role(auth.uid(), \'mp\'::public.app_role))');
    expect(sql).toContain('CREATE OR REPLACE VIEW public.community_project_public_stats');
    expect(sql).toContain("founders_display");
  });

  it('enforces refund 51 percent distinct donor threshold with manual admin processing support', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('requested_donors * 100 >= donor_total * 51');
    expect(sql).toContain("status = 'cancelled'");
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.project_refund_batches');
    expect(sql).toContain("'pending_manual_processing'");
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.project_system_settings');
    expect(sql).toContain("key = 'refund_fee_percent'");
  });

  it('implements instapay soon pledge mode without payment instructions', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toContain("payment_status text NOT NULL DEFAULT 'payment_soon'");
    expect(sql).toContain("CHECK (payment_status IN ('payment_soon', 'verified', 'rejected', 'refunded'))");
    expect(sql).toContain('reference_code text NOT NULL');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.create_project_donation_pledge');
  });

  it('requires legal acknowledgment and admin bank snapshot approval before transfer completion', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('legal_acknowledged boolean NOT NULL DEFAULT false');
    expect(sql).toContain('legal_acknowledged_at timestamptz');
    expect(sql).toContain('bank_snapshot jsonb');
    expect(sql).toContain('transfer_receipt_path text');
    expect(sql).toContain('MP must have an admin-verified bank account before transfer approval');
    expect(sql).toContain('Transfer receipt must be uploaded before marking transfer completed');
  });
});
