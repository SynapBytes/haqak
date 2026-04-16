# Security Hardening Guide — Haqak

## Overview

This document records the TLS/OpenSSL security posture of the Haqak platform and the controls in place to prevent exposure to known vulnerabilities such as **CVE-2014-0160 (Heartbleed)**.

---

## CVE-2014-0160 — Heartbleed Assessment

### What is Heartbleed?

Heartbleed is a critical buffer over-read vulnerability in the Heartbeat Extension of OpenSSL 1.0.1 before 1.0.1g. It allows a remote, unauthenticated attacker to read up to 64 KB of server memory per request, potentially disclosing private keys, session tokens, and user credentials.

- **CVSS Score:** 7.5 (High)
- **Affected versions:** OpenSSL 1.0.1 – 1.0.1f (inclusive)
- **Fixed in:** OpenSSL 1.0.1g (April 7, 2014)

### Haqak Architecture Assessment

| Component | Runtime | OpenSSL Version | Heartbleed Risk |
|-----------|---------|----------------|-----------------|
| Frontend (Vercel) | Node.js ≥ 18.20 | OpenSSL 3.x | ✅ Not vulnerable |
| Backend (Supabase Edge Functions) | Deno (managed) | Managed by Supabase | ✅ Not vulnerable |
| Database (PostgreSQL) | Supabase managed | Managed by Supabase | ✅ Not vulnerable |
| CI/CD (GitHub Actions) | Node.js ≥ 18.20 | OpenSSL 3.x | ✅ Not vulnerable |
| Local development | Node.js ≥ 18.20 (enforced via `.nvmrc`) | OpenSSL 3.x | ✅ Not vulnerable |

**Summary:** The platform is **not directly vulnerable** to Heartbleed. Node.js ≥ 18.x ships with OpenSSL 3.x, which is not affected. Vercel and Supabase manage their own TLS termination infrastructure and apply patches independently.

---

## Node.js Version Requirements

### Minimum Required Version

```
Node.js 18.20.0 LTS (Hydrogen)
```

Node.js 18.20.0 ships with **OpenSSL 3.0.x**, which is not affected by Heartbleed or its successors.

### Enforcement

| Mechanism | File | Purpose |
|-----------|------|---------|
| `.nvmrc` | `.nvmrc` | Local dev — `nvm use` automatically selects the correct version |
| `package.json` engines | `package.json` | npm warns/errors if a non-compliant Node.js is used |
| GitHub Actions | `.github/workflows/ci.yml` | CI always uses the version in `.nvmrc` |

### Verify your local Node.js OpenSSL version

```bash
node -e "console.log(process.versions.openssl)"
# Expected: 3.x.x (e.g., 3.0.7+quic)
```

Any output starting with `1.0.1` through `1.0.1f` would indicate a vulnerable environment.

---

## TLS Best Practices

### 1. TLS Version Policy

Haqak edge functions and the frontend enforce **TLS 1.2 minimum**; TLS 1.3 is preferred. Vercel and Supabase both default to TLS 1.3.

- TLS 1.0 and 1.1 are **disabled** by default in Node.js 18+ and on Vercel/Supabase.
- Do not downgrade TLS using `--tls-min-v1.0` or `NODE_OPTIONS=--tls-min-v1.0`.

### 2. HSTS (HTTP Strict Transport Security)

`vercel.json` should include HSTS headers. Verify:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        }
      ]
    }
  ]
}
```

### 3. CORS Security

Supabase edge functions use `buildCorsHeaders()` from `supabase/functions/shared/cors.ts`, which:
- Maintains an explicit **allowlist** of permitted origins (no wildcard `*` on authenticated endpoints).
- Returns an empty `Access-Control-Allow-Origin` for unrecognized origins.

### 4. Content Security Policy (CSP)

The frontend enforces a strict CSP header to prevent XSS-based credential theft, which would negate TLS protections at the application layer.

The full CSP is set in two places that must remain in sync:

| Location | Purpose |
|----------|---------|
| `vercel.json` (`Content-Security-Policy` header) | Enforced for all production and preview deployments |
| `src/server/security-headers.ts` (`CSP_DIRECTIVES`) | Single source of truth; used by dev middleware and tests |

Key directives:

```
default-src 'self'
script-src 'self' https://challenges.cloudflare.com https://app.posthog.com ...
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
frame-ancestors 'none'
upgrade-insecure-requests
report-uri /api/csp-report
```

See [`CSP_IMPLEMENTATION_GUIDE.md`](./CSP_IMPLEMENTATION_GUIDE.md) for the
complete directive reference, whitelisted-source rationale, and maintenance
checklist.

### 5. CSP Violation Monitoring

The `report-uri /api/csp-report` directive causes browsers to POST a JSON
payload to that endpoint whenever a policy violation is detected.

Violation reports are processed by the utilities in `src/lib/csp-reporter.ts`:

- **`parseCspReport(body)`** — safely extracts and validates the browser report.
- **`shouldIgnoreViolation(report)`** — filters known false positives (browser
  extensions, antivirus injections, synthetic monitors).
- **`logCspViolation(report, logger?)`** — writes a structured JSON log entry.
  Replace the default `console.warn` logger with a call to Sentry / PostHog /
  your SIEM as needed.

Monitor violations regularly; new violations may indicate:
- A new third-party dependency that requires a whitelist addition.
- A real XSS injection attempt.
- A browser extension used by a majority of users that injects content.

---

## Dependency Supply Chain Security

### Automated Scanning

| Tool | Trigger | File |
|------|---------|------|
| `npm audit` (high+) | Every PR / push | `.github/workflows/ci.yml` |
| Trivy (SARIF) | Every PR / push | `.github/workflows/security-trivy.yml` |
| Semgrep | Every PR / push | `.github/workflows/security-semgrep.yml` |
| CodeQL | Every PR / push | `.github/workflows/codeql.yml` |
| Gitleaks (secret scan) | Every PR / push | `.github/workflows/security-gitleaks.yml` |
| OWASP ZAP (DAST) | Every PR / push | `.github/workflows/security-zap-dast.yml` |
| Dependabot | Weekly | `.github/dependabot.yml` |

### Lock File Enforcement

- `package-lock.json` is **committed** to the repository and must not be removed.
- CI runs `npm ci` (not `npm install`) to install exact locked versions.
- Never commit `node_modules/`.

### Overrides Policy

`package.json` `overrides` pins transitive dependencies that have known vulnerabilities. When a direct dependency ships a fix, the corresponding override should be removed during the next dependency update cycle.

---

## Vulnerability Disclosure

**Contact:** admin@haqak.org

Please include:
- A clear description of the vulnerability
- Steps to reproduce
- Any relevant PoC or screenshots

We aim to acknowledge reports within **72 hours** and provide a resolution timeline after confirmation. Please do not publicly disclose the vulnerability until it has been addressed.

Full policy: [`SECURITY.md`](./SECURITY.md)

---

## Regular Audit Schedule

| Frequency | Action |
|-----------|--------|
| Every PR | `npm audit --audit-level=high` blocks merge |
| Weekly (automated) | Dependabot opens PRs for outdated packages |
| Weekly (automated) | Full `npm audit` report (low/medium, non-blocking) |
| Quarterly (manual) | Review and update `package.json` overrides |
| Quarterly (manual) | Verify Vercel/Supabase TLS configuration |
| Annually | Full security audit and penetration test |

---

## Deployment Security Checklist

Before each production deployment, verify:

- [ ] Node.js version ≥ 18.20.0 in CI (`node --version`)
- [ ] `npm audit --audit-level=high` exits 0 for production deps
- [ ] No secrets committed (`gitleaks detect`)
- [ ] HSTS header is present in `vercel.json`
- [ ] CSP header in `vercel.json` matches `CSP_DIRECTIVES` in `src/server/security-headers.ts`
- [ ] CSP `report-uri` endpoint is reachable and logging violations
- [ ] CORS allowlist in `ALLOWED_ORIGINS` secret is up to date
- [ ] Supabase project is on a supported runtime (check Supabase dashboard)
- [ ] All required Edge Function secrets are set (see `DEPLOYMENT.md`)
