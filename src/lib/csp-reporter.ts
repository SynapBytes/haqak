/**
 * csp-reporter.ts
 *
 * CSP violation reporting utility.
 *
 * The browser POSTs a JSON report to the `report-uri` endpoint whenever a
 * Content Security Policy violation is detected.  This module:
 *  1. Defines the shape of the incoming violation report.
 *  2. Provides a `parseCspReport` helper to safely extract fields.
 *  3. Provides a `shouldIgnoreViolation` filter for known false positives.
 *  4. Exports a `logCspViolation` function for structured logging / forwarding.
 *
 * Usage in an Edge Function (Supabase serverless):
 *
 *   import { parseCspReport, shouldIgnoreViolation, logCspViolation } from "@/lib/csp-reporter";
 *
 *   export default async function handler(req: Request) {
 *     if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
 *     const body = await req.json().catch(() => null);
 *     const report = parseCspReport(body);
 *     if (report && !shouldIgnoreViolation(report)) {
 *       logCspViolation(report);
 *     }
 *     return new Response(null, { status: 204 });
 *   }
 */

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Shape of a CSP violation report sent by the browser to the `report-uri`
 * endpoint.  The browser wraps the report in a `csp-report` key.
 *
 * Spec: https://www.w3.org/TR/CSP2/#violation-reports
 */
export interface CspViolationReport {
  /** The URI of the protected document where the violation occurred. */
  documentUri: string;

  /** The referrer of the protected document, if any. */
  referrer: string;

  /**
   * The URI of the resource that violated the policy, or "inline" for
   * inline scripts / styles.
   */
  blockedUri: string;

  /** The CSP directive that was violated (e.g. "script-src"). */
  violatedDirective: string;

  /** The effective CSP directive (may differ from violatedDirective). */
  effectiveDirective: string;

  /** The original policy string. */
  originalPolicy: string;

  /** The HTTP status code of the protected document. */
  statusCode: number;

  /** The inline source if `blockedUri` is "inline". */
  sourceFile?: string;

  /** Line number in the source file where the violation occurred. */
  lineNumber?: number;

  /** Column number in the source file where the violation occurred. */
  columnNumber?: number;
}

/**
 * Raw browser report body (before extraction).
 */
export interface RawCspReportBody {
  "csp-report"?: Partial<Record<string, unknown>>;
}

// ── Parser ────────────────────────────────────────────────────────────────────

/**
 * Safely parse a raw CSP report JSON body into a typed `CspViolationReport`.
 * Returns `null` if the body is missing required fields or has an unexpected
 * shape.
 */
export function parseCspReport(body: unknown): CspViolationReport | null {
  if (!body || typeof body !== "object") return null;

  const raw = body as RawCspReportBody;
  const report = raw["csp-report"];
  if (!report || typeof report !== "object") return null;

  const str = (key: string): string =>
    typeof report[key] === "string" ? (report[key] as string) : "";
  const num = (key: string): number =>
    typeof report[key] === "number" ? (report[key] as number) : 0;

  const documentUri = str("document-uri");
  const violatedDirective = str("violated-directive");
  const effectiveDirective = str("effective-directive");
  const originalPolicy = str("original-policy");

  // document-uri and violated-directive are required fields
  if (!documentUri || !violatedDirective) return null;

  return {
    documentUri,
    referrer: str("referrer"),
    blockedUri: str("blocked-uri"),
    violatedDirective,
    effectiveDirective: effectiveDirective || violatedDirective,
    originalPolicy,
    statusCode: num("status-code"),
    sourceFile: str("source-file") || undefined,
    lineNumber: num("line-number") || undefined,
    columnNumber: num("column-number") || undefined,
  };
}

// ── False-positive filter ─────────────────────────────────────────────────────

/**
 * Patterns that commonly produce spurious CSP violation reports from browser
 * extensions, safe browsing agents, or synthetic monitoring tools.
 * Violations matching any of these patterns are silently ignored.
 */
const IGNORED_BLOCKED_URIS: ReadonlyArray<RegExp> = [
  // Browser extension injected resources
  /^chrome-extension:\/\//,
  /^moz-extension:\/\//,
  /^safari-extension:\/\//,
  // Antivirus / security toolbar injections
  /kaspersky/i,
  /avast/i,
  // Synthetic monitoring agents (pingdom, speedcurve, etc.)
  /speedcurve\.com/,
  /pingdom\.net/,
  // About: and data: false positives
  /^about:/,
];

/**
 * Returns `true` if the violation should be silently ignored (known false
 * positive), `false` if it should be logged and investigated.
 */
export function shouldIgnoreViolation(report: CspViolationReport): boolean {
  return IGNORED_BLOCKED_URIS.some((pattern) =>
    pattern.test(report.blockedUri),
  );
}

// ── Logger ────────────────────────────────────────────────────────────────────

/**
 * Log a structured CSP violation event.
 *
 * In production this can be replaced with a call to a real observability
 * service (Sentry, Datadog, PostHog, etc.).  The default implementation
 * writes a JSON line to `console.warn` so that it is captured by Supabase function logs.
 */
export function logCspViolation(
  report: CspViolationReport,
  logger: (message: string, data: unknown) => void = defaultLogger,
): void {
  logger("CSP violation detected", {
    event: "csp_violation",
    documentUri: report.documentUri,
    blockedUri: report.blockedUri,
    violatedDirective: report.violatedDirective,
    effectiveDirective: report.effectiveDirective,
    sourceFile: report.sourceFile,
    lineNumber: report.lineNumber,
    columnNumber: report.columnNumber,
    statusCode: report.statusCode,
  });
}

function defaultLogger(message: string, data: unknown): void {
  console.warn(message, JSON.stringify(data));
}
