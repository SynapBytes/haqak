## Supabase Storage plan

Buckets are intentionally minimal and scoped to the platform’s media needs. Only the public avatar bucket is world-readable; all other buckets rely on signed URLs and RLS.

| Bucket | Purpose | Visibility | Path pattern | Notes |
| --- | --- | --- | --- | --- |
| `issue-attachments` | Citizen evidence attached to issues | Private (RLS) | `{userId}/{issueId}/{timestamp}-{safeName}.{ext}` | Owner upload/delete; owner, assigned MP, admins/moderators can read. |
| `avatars` | Public profile images | Public read | `{userId}/avatar.{ext}` | Owner can upload/update/delete. |
| `moderation-evidence` | Internal moderation evidence | Private (RLS) | `{issueId}/{uploaderId}/{timestamp}-{safeName}.{ext}` | Admins/moderators only for read/write/delete. |

### Client helpers

- `buildIssueAttachmentPath`, `uploadIssueAttachment`
- `buildAvatarPath`, `uploadAvatar`
- `buildModerationEvidencePath`, `saveModerationEvidence`
- `getSignedDownloadUrl(bucket, path, ttlSeconds)`

Use signed URLs for downloads:

```ts
const signedUrl = await getSignedDownloadUrl("issue-attachments", path, 120);
window.open(signedUrl, "_blank");
```

### Database metadata

- `issue_attachments.bucket` (default `issue-attachments`) tracks the bucket for each attachment.
- New table `moderation_evidence` stores moderation uploads with `issue_id`, `uploaded_by`, `bucket`, `file_path`, `file_type`, `file_name`.

### Access rules (RLS)

- **Issue attachments:** insert limited to owner folder; read allowed for owner, assigned MP, admins, moderators; delete allowed for owner/admin/mod.
- **Avatars:** public read; owner-only write/delete.
- **Moderation evidence:** admins/moderators only for insert/read/delete; paths must contain uploader id.

No service-role keys are exposed to the browser; all flows use the client anon key plus RLS and signed URLs.
