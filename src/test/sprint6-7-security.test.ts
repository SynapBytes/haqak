import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("Sprint 6-7 bank privacy and MP public scope", () => {
  const migrationPath = "supabase/migrations/20260411000000_sprint6_7_mp_public_and_bank.sql";

  it("restricts mp bank account access to self and admin only", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    expect(sql).toContain("CREATE POLICY \"Verified MPs can read own bank details\"");
    expect(sql).toContain("mp_user_id = auth.uid()");
    expect(sql).toContain("CREATE POLICY \"Admins can read all mp bank accounts\"");
    expect(sql).toContain("public.has_role(auth.uid(), 'admin'::public.app_role)");
    expect(sql).not.toContain("CREATE POLICY \"Citizens can read mp bank accounts\"");
  });

  it("enforces verified MP requirement for bank writes and public posts", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    expect(sql).toContain("me.verification_status = 'verified'");
    expect(sql).toContain("CREATE POLICY \"Verified MPs can insert own public posts\"");
    expect(sql).toContain("CREATE POLICY \"Verified MPs can insert own bank details\"");
  });

  it("keeps mp public profile view safe and excludes contact phone", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    const viewStart = sql.indexOf("CREATE VIEW public.mp_public_profiles");
    const viewEnd = sql.indexOf("GRANT SELECT ON public.mp_public_profiles");
    const viewSql = viewStart >= 0 && viewEnd > viewStart ? sql.slice(viewStart, viewEnd) : sql;
    expect(viewSql).not.toContain("contact_phone");
    expect(viewSql).toContain("full_name");
    expect(viewSql).toContain("avatar_url");
    expect(viewSql).toContain("center_id");
  });
});
