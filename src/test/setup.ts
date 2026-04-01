import "@testing-library/jest-dom";
import { webcrypto } from "node:crypto";

// Vitest runs on Node 18 in CI, where `globalThis.crypto` may be undefined.
// Provide a Web Crypto polyfill so tests using `crypto.subtle` behave
// consistently across environments.
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as Crypto;
}

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
