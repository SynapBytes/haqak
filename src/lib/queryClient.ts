import { QueryClient } from "@tanstack/react-query";

const getStaleTime = (queryKey: readonly unknown[]) => {
  const joined = queryKey
    .map((part) => (typeof part === "string" ? part.toLowerCase() : ""))
    .join(".");

  if (joined.includes("issue")) return 30_000;
  if (joined.includes("profile")) return 5 * 60_000;
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
