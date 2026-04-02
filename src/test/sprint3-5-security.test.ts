import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("Sprint 3-5 security and constraints", () => {
  const migrationPath = "supabase/migrations/20260410000000_sprint3_5_mp_engagement.sql";

  it("enforces vote uniqueness and verified-only voter policy in migration", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    expect(sql).toContain("CONSTRAINT poll_votes_unique_vote UNIQUE (poll_id, voter_user_id)");
    expect(sql).toContain("CREATE POLICY \"Verified citizens can vote once in open center polls\"");
    expect(sql).toContain("me.verification_status = 'verified'");
    expect(sql).toContain("p.status = 'open'");
  });

  it("prevents MP access to poll_votes rows and uses aggregate read model", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    expect(sql).toContain("CREATE POLICY \"Citizens can read own poll votes\"");
    expect(sql).not.toContain("ON public.poll_votes FOR SELECT TO authenticated\nUSING (\n  public.has_role(auth.uid(), 'mp'");
    expect(sql).toContain("CREATE OR REPLACE VIEW public.poll_results");
  });

  it("restricts mp center broadcasts to verified-only citizens in edge function", () => {
    const fnSource = fs.readFileSync("supabase/functions/dispatch-notification/index.ts", "utf8");
    expect(fnSource).toContain("verified_only");
    expect(fnSource).toContain("allowVerifiedMpCenterBroadcast");
    expect(fnSource).toContain("verification_status");
  });
});
