import { api, getSessionGeneration, refreshSession } from "@/utils/apiClient";

export interface ServerRoleUser {
  id: string;
  roles?: string[];
}

export async function fetchAccountWithCurrentRoles<T extends ServerRoleUser>(
  previousRoles?: string[],
  expectedUserId?: string,
): Promise<T> {
  const generation = getSessionGeneration();
  const account = await api.get<T>("/api/v1/auth/me");
  if (generation !== getSessionGeneration()) {
    throw new Error("The account session changed.");
  }
  if (expectedUserId && account.id !== expectedUserId) {
    throw new Error("The account session changed. Sign in again.");
  }
  if (!Array.isArray(account.roles)) {
    throw new Error("The account response did not include roles.");
  }
  const changed = previousRoles
    ? [...previousRoles].sort().join("\0") !== [...account.roles].sort().join("\0")
    : account.roles.includes("organizer_owner");
  if (changed) await refreshSession();
  return account;
}
