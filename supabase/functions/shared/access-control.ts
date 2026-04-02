export function buildParticipantSet(...ids: Array<string | null | undefined>) {
  return new Set(ids.filter((id): id is string => typeof id === "string" && id.length > 0));
}
