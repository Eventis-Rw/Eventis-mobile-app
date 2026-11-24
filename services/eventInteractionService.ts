import { api } from "@/utils/apiClient";

export interface EventComment {
  id: string; eventId: string; userId: string; body: string; createdAt: string;
  user: { id: string; username: string | null; displayName: string | null; avatarUrl: string | null };
}
export interface EventInteractionSummary { eventId: string; likeCount: number; commentCount: number; liked: boolean }
export interface EventCommentPage { items: EventComment[]; page: number; limit: number; total: number }

export const getEventInteractions = (id: string) => api.get<EventInteractionSummary>(`/api/v1/events/${encodeURIComponent(id)}/interactions`);
export const setEventLike = (id: string, shouldLike: boolean) => shouldLike
  ? api.post<{ eventId: string; liked: boolean; likeCount: number }>(`/api/v1/events/${encodeURIComponent(id)}/like`)
  : api.delete<{ eventId: string; liked: boolean; likeCount: number }>(`/api/v1/events/${encodeURIComponent(id)}/like`);
export const listEventComments = (id: string, page = 1) => api.get<EventCommentPage>(`/api/v1/events/${encodeURIComponent(id)}/comments?page=${page}&limit=100`);
export const createEventComment = (id: string, body: string) => api.post<EventComment>(`/api/v1/events/${encodeURIComponent(id)}/comments`, { body });
export const updateEventComment = (id: string, body: string) => api.patch<EventComment>(`/api/v1/comments/${encodeURIComponent(id)}`, { body });
export const deleteEventComment = (id: string) => api.delete<{ id: string; deleted: boolean }>(`/api/v1/comments/${encodeURIComponent(id)}`);
