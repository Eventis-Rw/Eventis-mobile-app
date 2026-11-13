import { api } from "@/utils/apiClient";

export type BackendNotificationCategory = "EVENTS" | "ACTIVITY" | "ORGANIZERS" | "FINDLOVE" | "SYSTEM";

export interface ApiNotification {
  id: string;
  category: BackendNotificationCategory;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  items: ApiNotification[];
  page: number;
  limit: number;
  total: number;
}

export async function fetchNotifications(params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  category?: BackendNotificationCategory;
}): Promise<NotificationsResponse> {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.unreadOnly) search.set("unreadOnly", "true");
  if (params?.category) search.set("category", params.category);
  const qs = search.toString();
  return api.get<NotificationsResponse>(`/api/v1/me/notifications${qs ? `?${qs}` : ""}`);
}

export async function markNotificationRead(id: string): Promise<ApiNotification> {
  return api.patch<ApiNotification>(`/api/v1/me/notifications/${encodeURIComponent(id)}/read`);
}

export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  return api.post<{ updated: number }>("/api/v1/me/notifications/read-all");
}

export async function registerPushToken(token: string, platform: "IOS" | "ANDROID") {
  return api.post("/api/v1/me/push-tokens", { token, platform });
}

export async function removePushToken(token: string) {
  return api.delete("/api/v1/me/push-tokens", { token });
}
