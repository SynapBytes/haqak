import { describe, expect, it } from "vitest";
import {
  buildAvatarPath,
  buildIdentityVerificationPath,
  buildIssueAttachmentPath,
  buildModerationEvidencePath,
} from "./storagePaths";

describe("storage path builders", () => {
  it("builds an issue attachment path with user and issue folders", () => {
    const path = buildIssueAttachmentPath("user-1", "issue-2", "proof.png");
    expect(path.startsWith("user-1/issue-2/")).toBe(true);
    expect(path.endsWith(".png")).toBe(true);
  });

  it("rejects path traversal in issue attachment path", () => {
    expect(() => buildIssueAttachmentPath("user", "issue", "../evil.png")).toThrow();
  });

  it("builds an avatar path that overwrites safely", () => {
    const path = buildAvatarPath("user-1", "avatar!!.jpg");
    expect(path).toBe("user-1/avatar.jpg");
  });

  it("builds moderation evidence path with issue and uploader folders", () => {
    const path = buildModerationEvidencePath("issue-9", "admin-7", "screenshot.pdf");
    expect(path.startsWith("issue-9/admin-7/")).toBe(true);
    expect(path.endsWith(".pdf")).toBe(true);
  });

  it("rejects traversal in moderation evidence path", () => {
    expect(() => buildModerationEvidencePath("issue", "admin", "../../secret.txt")).toThrow();
  });

  it("builds identity verification paths with side prefix", () => {
    const path = buildIdentityVerificationPath("user-1", "verification-2", "front", "id-card.png");
    expect(path.startsWith("user-1/verification-2/front-")).toBe(true);
    expect(path.endsWith(".png")).toBe(true);
  });
});
