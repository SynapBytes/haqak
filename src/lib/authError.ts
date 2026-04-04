export function isNetworkFailureMessage(message: string): boolean {
  const lowered = message.toLowerCase();
  return (
    lowered.includes("load failed") ||
    lowered.includes("failed to fetch") ||
    lowered.includes("networkerror") ||
    lowered.includes("network request failed") ||
    lowered.includes("internet connection appears to be offline") ||
    lowered.includes("aborterror")
  );
}
