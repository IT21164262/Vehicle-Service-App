import { authenticatedRequest } from './authApi';
export type Notification = { id: string; type: string; title: string; message: string; appointmentId: string; read: boolean; createdAt: string };
export type NotificationPage = { notifications: Notification[]; unreadCount: number; page: number; limit: number; total: number };
export function getNotificationPage(page = 1, limit = 20) { return authenticatedRequest<NotificationPage>(`/auth/notifications?page=${page}&limit=${limit}`); }
export function listNotifications() { return getNotificationPage().then(result => result.notifications); }
export function markNotificationRead(id: string) { return authenticatedRequest(`/auth/notifications/${encodeURIComponent(id)}/read`, 'PATCH'); }
export function markAllNotificationsRead() { return authenticatedRequest('/auth/notifications/read-all', 'PATCH'); }
