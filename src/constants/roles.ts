export type AppRole = "citizen" | "mp" | "admin" | "moderator";

export const ROLE_PRIORITY: AppRole[] = ["admin", "moderator", "mp", "citizen"];

export const resolvePrimaryRole = (roles: (AppRole | null | undefined)[]): AppRole => {
  const normalized = roles.filter(Boolean) as AppRole[];
  return ROLE_PRIORITY.find((role) => normalized.includes(role)) ?? "citizen";
};
