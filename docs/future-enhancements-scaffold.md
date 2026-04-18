# Future Enhancements Scaffold

## Feature flags

The following flags are now available in `src/lib/config.ts`:

- `VITE_ENABLE_CITIZEN_TIMELINE` (default: `false`)
- `VITE_ENABLE_NOTIFICATIONS_V2` (default: `false`)
- `VITE_ENABLE_FAQ_SMART_SEARCH` (default: `true`)

## Citizen timeline implementation status

- UI: `src/components/CitizenComplaintTimeline.tsx` now reads real data.
- Integration point remains `src/pages/CitizenDashboard.tsx` behind `VITE_ENABLE_CITIZEN_TIMELINE`.
- Backend endpoint:
  - `GET /functions/v1/complaint-timeline?issueId=<uuid>`
  - `POST /functions/v1/complaint-timeline` with `{ issueId }`
- Contract details + sample payload: `docs/complaint-timeline-api.md`.

## Notification service scaffold

- Abstraction: `src/lib/notificationService.ts`
- Providers:
  - Web push via existing edge-function flow
  - In-app/email channels through `dispatch-notification`
