import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, out);
    } else {
      out.push(fullPath);
    }
  }
  return out;
}

describe("PR-2 revised regressions", () => {
  it("auth UI does not require phone/OTP primitives", () => {
    const authSource = fs.readFileSync("src/pages/Auth.tsx", "utf8");
    expect(authSource).not.toMatch(/signInWithOtp|verifyOtp/i);
    expect(authSource).not.toMatch(/\/\^01\[0-9\]\{9\}\$\//);

    const profileSource = fs.readFileSync("src/pages/CitizenProfile.tsx", "utf8");
    expect(profileSource).not.toContain("/^01[0-9]{9}$/");
  });

  it("runtime edge functions have no Twilio dependency", () => {
    const files = walkFiles("supabase/functions").filter((file) => file.endsWith(".ts"));

    for (const file of files) {
      const source = fs.readFileSync(file, "utf8");
      expect(source, `Twilio reference found in ${file}`).not.toMatch(/twilio|TWILIO_/i);
    }
  });

  it("notification path does not route to sms", () => {
    const dispatchSource = fs.readFileSync("supabase/functions/dispatch-notification/index.ts", "utf8");
    const notificationClientSource = fs.readFileSync("src/lib/notifications.ts", "utf8");
    const notificationServiceSource = fs.readFileSync("src/lib/notificationService.ts", "utf8");

    expect(dispatchSource).not.toMatch(/DeliveryChannel\s*=\s*.*sms/i);
    expect(dispatchSource).not.toMatch(/channels?\s*:\s*\[[^\]]*["']sms["']/i);
    expect(dispatchSource).toMatch(/ALLOWED_LEGACY_CHANNELS\s*=\s*new Set<LegacyChannel>\(\["email",\s*"push"\]\)/);
    expect(notificationClientSource).not.toMatch(/channels?\s*:\s*\([^)]*["']sms["']/i);
    expect(notificationServiceSource).not.toMatch(/NotificationChannel\s*=\s*.*sms/i);
  });
});
