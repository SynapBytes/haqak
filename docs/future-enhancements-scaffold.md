# Future Enhancements Scaffold

## Feature flags

The following flags are now available in `src/lib/config.ts`:

- `VITE_ENABLE_CITIZEN_TIMELINE` (default: `false`)
- `VITE_ENABLE_NOTIFICATIONS_V2` (default: `false`)
- `VITE_ENABLE_FAQ_SMART_SEARCH` (default: `true`)

## Citizen timeline scaffold

- UI scaffold: `src/components/CitizenComplaintTimeline.tsx`
- Integration point: `src/pages/CitizenDashboard.tsx` (guarded by flag)
- API contract (required):
  - `GET /complaints/:id/timeline`
  - Response:
    ```json
    [
      {
        "status": "submitted|under_review|assigned|in_progress|resolved|closed",
        "timestamp": "ISO-8601",
        "actor": "string",
        "note": "string|null"
      }
    ]
    ```

## Notification service scaffold

- Abstraction: `src/lib/notificationService.ts`
- Providers:
  - Web push via existing edge-function flow
  - SMS stub interface ready for provider adapter
- SMS provider contract required:
  - `POST /notifications/sms`
  - body: `{ recipientId, title, body, issueId?, status? }`
  - auth/secret handled server-side only
