import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

// Vitest runs on Node 18 in CI, where `globalThis.crypto` may be undefined
// or present (via jsdom) but without a working `.subtle`. Provide the Node.js
// Web Crypto polyfill so tests using `crypto.subtle` behave consistently.
if (!globalThis.crypto?.subtle) {
  globalThis.crypto = webcrypto as Crypto;
}

// Framer-motion's whileInView requires IntersectionObserver which jsdom doesn't provide
globalThis.IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof IntersectionObserver;

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
