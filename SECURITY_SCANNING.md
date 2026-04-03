# Security Scanning Pipeline

This repository uses GitHub Actions-only security workflows for PRs and pushes to `main`.

## What runs on pull requests vs main

### Runs on pull requests and on push to `main`

- **Gitleaks** (`.github/workflows/security-gitleaks.yml`)
  - Secret scanning.
  - Fails CI if any secret is detected.
  - Uses `--redact` to avoid printing secret values in logs.
  - Supports false-positive control via:
    - `.gitleaks.toml` allowlist
    - optional `.gitleaks.baseline.json` baseline file (if present)

- **Semgrep** (`.github/workflows/security-semgrep.yml`)
  - Scans JavaScript/TypeScript/React code.
  - Produces `semgrep.sarif`.
  - Fails CI on configurable severity threshold (`SEMGREP_FAIL_SEVERITY`, default `ERROR`).

- **Trivy** (`.github/workflows/security-trivy.yml`)
  - Filesystem scan (`trivy fs`) for vulnerabilities and misconfigurations.
  - Produces `trivy.sarif`.
  - Fails CI on configurable severity threshold (`TRIVY_FAIL_SEVERITY`, default `HIGH,CRITICAL`).

- **CodeQL** (`.github/workflows/codeql.yml`)
  - JavaScript/TypeScript analysis.
  - If GitHub Advanced Security / code scanning is not enabled for this private repo plan, CodeQL SARIF upload will not be available in Security tab.
  - The workflow remains present; enable code scanning repository settings/plan to activate full Security tab visibility.

### DAST target selection

- **ZAP DAST** (`.github/workflows/security-zap-dast.yml`)
  - On `pull_request`: scans the Vercel preview URL pattern.
  - On `push` to `main`: scans `ZAP_PRODUCTION_URL` (default `https://haqak.vercel.app`).
  - Baseline scan only (no auth in MVP).
  - Fails on configurable risks using `ZAP_FAIL_RISKS` (default `High` on `push`; PRs still scan and upload artifacts without failing this gate).
  - Always uploads report artifacts.

## Where to see results

- **Preferred**: GitHub **Security** tab → **Code scanning alerts** (for SARIF uploads).
- **Fallback**: GitHub Actions run artifacts:
  - `semgrep-sarif`
  - `trivy-sarif`
  - `zap-baseline-report`

If SARIF upload is blocked by plan/permissions, artifact upload still preserves machine-readable results.

## Local run commands

From repository root:

- Gitleaks:
  - `gitleaks detect --source . --redact --config .gitleaks.toml`
  - Optional baseline: `gitleaks detect --source . --redact --config .gitleaks.toml --baseline-path .gitleaks.baseline.json`

- Semgrep:
  - `semgrep scan --config p/javascript --config p/typescript --config p/react --exclude node_modules --exclude dist --sarif --output semgrep.sarif .`
  - Fail gate example: `semgrep scan --config p/javascript --config p/typescript --config p/react --exclude node_modules --exclude dist --error --severity ERROR .`

- Trivy:
  - `trivy fs --scanners vuln,misconfig --severity UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL --format sarif --output trivy.sarif .`
  - Fail gate example: `trivy fs --scanners vuln,misconfig --severity HIGH,CRITICAL --exit-code 1 .`

- ZAP baseline:
  - `docker run --rm -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t https://example.com -j -m 5`

## False-positive handling policy

- **Gitleaks**
  - Prefer fixing/removing offending material first.
  - Only if confirmed false-positive:
    - Add narrow allowlist entries in `.gitleaks.toml`, or
    - maintain a reviewed `.gitleaks.baseline.json` for known existing findings.
  - Do not broad-ignore directories/files unless strictly necessary.

- **Semgrep/Trivy**
  - Prioritize code/dependency/config fixes first.
  - If a finding is non-actionable in context, track justification in PR notes and keep ignores as narrowly scoped as possible.

## Required repository settings / toggles

- Ensure Actions are enabled for this repository.
- To surface SARIF findings in Security tab for private repos, enable the repository/org plan feature for **Code Scanning / GitHub Advanced Security** as applicable.
- If using a custom Vercel team slug, set `VERCEL_TEAM_SLUG` in workflow env.
