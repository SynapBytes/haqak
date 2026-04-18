# Complaint Timeline API (PR-1)

## Endpoint

- Edge function: `complaint-timeline`
- HTTP:
  - `GET /functions/v1/complaint-timeline?issueId=<uuid>`
  - `POST /functions/v1/complaint-timeline` with `{ "issueId": "<uuid>" }`

## Auth

- Requires authenticated user token (`Authorization: Bearer <jwt>`).
- Access is protected by existing issue RLS policies (citizen owner, assigned MP, admins/moderators as already defined).

## Response contract

```json
{
  "issueId": "e4facf2c-7e66-4f34-8c30-5576dc4ce6f2",
  "events": [
    {
      "status": "submitted",
      "timestamp": "2026-04-18T09:00:00.000Z",
      "actor": "citizen",
      "note": null
    },
    {
      "status": "under_review",
      "timestamp": "2026-04-18T09:05:00.000Z",
      "actor": "system",
      "note": null
    },
    {
      "status": "assigned",
      "timestamp": "2026-04-18T09:15:00.000Z",
      "actor": "mp",
      "note": "Assigned to center MP queue"
    },
    {
      "status": "in_progress",
      "timestamp": "2026-04-18T10:00:00.000Z",
      "actor": "mp",
      "note": null
    },
    {
      "status": "resolved",
      "timestamp": "2026-04-18T12:00:00.000Z",
      "actor": "mp",
      "note": "Work completed"
    }
  ]
}
```

## Canonical statuses

- `submitted`
- `under_review`
- `assigned`
- `in_progress`
- `resolved`
- `closed`

## Notes

- The endpoint normalizes legacy status/action values to canonical statuses.
- Timeline can be partial when historical rows are unavailable; frontend renders partial-state hint without breaking complaint flows.
