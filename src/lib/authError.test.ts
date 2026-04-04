import { describe, expect, it } from "vitest";
import { isNetworkFailureMessage } from "./authError";

describe("isNetworkFailureMessage", () => {
  it("detects known network/transport failures", () => {
    expect(isNetworkFailureMessage("Load failed")).toBe(true);
    expect(isNetworkFailureMessage("Failed to fetch")).toBe(true);
    expect(isNetworkFailureMessage("NetworkError when attempting to fetch resource.")).toBe(true);
    expect(isNetworkFailureMessage("Network request failed")).toBe(true);
    expect(isNetworkFailureMessage("The Internet connection appears to be offline.")).toBe(true);
    expect(isNetworkFailureMessage("AbortError: The operation was aborted")).toBe(true);
  });

  it("does not classify application/auth errors as network failures", () => {
    expect(isNetworkFailureMessage("Invalid login credentials")).toBe(false);
    expect(isNetworkFailureMessage("OTP invalid")).toBe(false);
    expect(isNetworkFailureMessage("Too many requests")).toBe(false);
    expect(isNetworkFailureMessage("User already registered")).toBe(false);
  });
});
