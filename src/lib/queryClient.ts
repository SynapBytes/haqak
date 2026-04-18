import { QueryClient } from "@tanstack/react-query";

const ISSUE_QUERY_ROOTS = new Set(["citizen-issues", "mp-issues", "admin-issues"]);
const PROFILE_QUERY_TOKEN = "profile";

const getStaleTime = (queryKey: readonly unknown[]) => {
  const root = typeof queryKey[0] === "string" ? queryKey[0].toLowerCase() : "";

  if (ISSUE_QUERY_ROOTS.has(root)) return 30_000;
  if (root.includes(PROFILE_QUERY_TOKEN)) return 5 * 60_000;
  return 60_000;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: (query) => getStaleTime(query.queryKey),
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});
